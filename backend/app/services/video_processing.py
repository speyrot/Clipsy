# backend/app/services/video_processing.py

import warnings
import cv2
from moviepy.editor import VideoFileClip
from app.celery_app import celery
from app.models import ProcessingJob, JobStatus, Speaker, VideoStatus, Video, JobType
from app.database import SessionLocal
from app.services.face_detection import detect_and_store_speakers, load_face_detector
from app.services.scene_detection import detect_scenes
from app.utils.video_utils import extract_frames, apply_layout_to_frame, compile_video_with_audio, determine_layout, ffprobe_info
import logging
import json
import numpy as np
from sqlalchemy.orm import Session
from collections import defaultdict
import pickle
import os
import subprocess
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
import uuid
import whisper
import datetime
import re  

# NEW IMPORTS for S3 handling
from app.utils.s3_utils import (
    download_s3_to_local,
    upload_file_to_s3,
    delete_local_file
)

ASS_TEMPLATE_PATH = os.path.join(os.path.dirname(__file__), "my_subtitles.ass")

import tempfile

logger = logging.getLogger(__name__)

@celery.task(name="app.services.video_processing.detect_speakers_task")
def detect_speakers_task(video_id: int, file_path: str, processing_job_id: int):
    logger.info(f"Starting detect_speakers_task for video_id={video_id}, job_id={processing_job_id}, file={file_path}")
    with SessionLocal() as db:
        try:
            processing_job = db.query(ProcessingJob).filter(ProcessingJob.id == processing_job_id).first()
            if not processing_job:
                raise Exception(f"ProcessingJob with ID {processing_job_id} not found")

            processing_job.status = JobStatus.in_progress
            db.commit()

            detect_and_store_speakers(video_id=video_id, file_path=file_path, db=db, frame_skip=25)

            logger.info(f"Speaker (person) detection completed for video_id={video_id}")

            processing_job = db.query(ProcessingJob).filter(ProcessingJob.id == processing_job_id).first()
            processing_job.status = JobStatus.completed
            db.commit()

            logger.info(f"ProcessingJob ID {processing_job.id} status updated to completed")

        except Exception as e:
            logger.error(f"Error in detect_speakers_task for video ID {video_id}: {e}", exc_info=True)
            db.rollback()
            processing_job = db.query(ProcessingJob).filter(ProcessingJob.id == processing_job_id).first()
            if processing_job:
                processing_job.status = JobStatus.failed
                db.commit()
            raise e
        finally:
            db.close()

@celery.task(name="app.services.video_processing.process_video_task")
def process_video_task(video_id: int, job_id: int, auto_captions: bool = False):
    logger.info(f"Starting process_video_task for video_id={video_id}, job_id={job_id}, auto_captions={auto_captions}")

    with SessionLocal() as db:
        try:
            job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
            if not job:
                raise ValueError(f"No ProcessingJob found with ID: {job_id}")

            # Mark job as in_progress
            job.status = JobStatus.in_progress
            job.video.status = VideoStatus.processing
            db.commit()

            # This is the S3 URL we stored in upload_path
            s3_url_cfr = job.video.upload_path
            logger.info(f"Will download S3 URL for video: {s3_url_cfr}")

            # 1. Download from S3 to local temp directory
            local_temp_dir = tempfile.mkdtemp()
            local_cfr_path = os.path.join(local_temp_dir, "input_cfr.mp4")
            download_s3_to_local(s3_url_cfr, local_cfr_path)
            logger.info(f"Downloaded CFR video to {local_cfr_path}, proceeding with processing...")

            # 2. Gather fps info
            def get_video_info(path: str):
                cmd = [
                    "ffprobe", "-v", "error", "-select_streams", "v:0", 
                    "-show_entries", "stream=duration,nb_frames",
                    "-of", "default=noprint_wrappers=1", path
                ]
                result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                duration = None
                nb_frames = None
                for line in result.stdout.splitlines():
                    if line.startswith("duration="):
                        duration = float(line.split('=')[1].strip())
                    elif line.startswith("nb_frames="):
                        nb_frames = float(line.split('=')[1].strip())
                return duration, nb_frames

            duration, nb_frames = get_video_info(local_cfr_path)
            if duration is None or nb_frames is None:
                logger.warning("Could not retrieve duration or nb_frames from ffprobe. Falling back to MoviePy fps.")
                clip = VideoFileClip(local_cfr_path)
                fps = clip.fps
                clip.close()
                logger.info(f"Using fps from MoviePy: {fps} FPS")
            else:
                fps = nb_frames / duration
                logger.info(f"Calculated FPS from ffprobe: {fps:.4f}")

            # Initialize face detector
            face_detector = load_face_detector()
            logger.info("Face detector initialized.")

            # Detect scenes
            scene_timestamps = detect_scenes(job.video_id, local_cfr_path, db)
            if not scene_timestamps:
                logger.info("No scenes detected. Entire video is one scene.")
                if duration is None:
                    clip = VideoFileClip(local_cfr_path)
                    duration = clip.duration
                    clip.close()
                scene_timestamps = [(0, duration)]

            # Extract frames (frame_skip=1)
            frames = extract_frames(local_cfr_path, frame_skip=1)
            total_frames = len(frames)
            if total_frames == 0:
                raise ValueError("No frames extracted from the CFR video.")

            logger.info(f"Extracted {total_frames} frames from {local_cfr_path}.")

            # Quick face detector test
            test_detections = face_detector.get(frames[0])
            logger.info(f"Face detector test found {len(test_detections) if test_detections else 0} faces in the first frame.")

            def identify_speakers_in_frame_runtime(frame: np.ndarray, speaker_data: list, face_detector, video_id: int, db: Session) -> list:
                logger.info("Starting face detection...")
                detections = face_detector.get(frame)
                logger.info(f"Found {len(detections) if detections is not None else 0} faces in frame")
                identified_speakers = []

                if not detections:
                    logger.warning("No faces detected in frame")
                    return identified_speakers

                try:
                    # Calculate face sizes and determine threshold
                    face_sizes = [(i, (face.bbox[2]-face.bbox[0]) * (face.bbox[3]-face.bbox[1])) 
                                for i, face in enumerate(detections)]
                    face_sizes.sort(key=lambda x: x[1], reverse=True)
                    
                    largest_face_size = face_sizes[0][1]
                    size_threshold = largest_face_size * 0.2
                    
                    logger.info(f"Largest face size: {largest_face_size}, threshold: {size_threshold}")

                    for i, face in enumerate(detections):
                        try:
                            bbox = face.bbox.tolist()
                            x1, y1, x2, y2 = map(int, bbox)
                            face_size = (x2 - x1) * (y2 - y1)
                            
                            if face_size < size_threshold:
                                logger.warning(f"Skipping small face {i+1}: {x2-x1}x{y2-y1} (area: {face_size} < threshold: {size_threshold})")
                                continue

                            # Just use the face index as the ID
                            identified_speakers.append((i + 1, (x1, y1, x2, y2)))
                            logger.info(f"Added face {i+1} to identified speakers")

                        except Exception as e:
                            logger.error(f"Error processing face {i+1}: {str(e)}")
                            continue

                except Exception as e:
                    logger.error(f"Error in face processing: {str(e)}", exc_info=True)
                    return identified_speakers

                return identified_speakers

            processed_frames = []

            for (start_time, end_time) in scene_timestamps:
                start_f = int(start_time * fps)
                end_f = min(int(end_time * fps), total_frames - 1)
                rep_frame_idx = max(0, min(start_f, total_frames - 1))
                rep_frame = frames[rep_frame_idx]
                logger.info(f"Processing scene from {start_time:.2f}s to {end_time:.2f}s")

                identified = identify_speakers_in_frame_runtime(
                    frame=rep_frame,
                    speaker_data=[],
                    face_detector=face_detector,
                    video_id=job.video_id,
                    db=db
                )
                layout_config = determine_layout(len(identified))

                for f_idx in range(start_f, end_f + 1):
                    if 0 <= f_idx < total_frames:
                        out_frame = apply_layout_to_frame(frames[f_idx], identified, layout_config)
                        if out_frame is not None:
                            processed_frames.append(out_frame)

                progress = ((end_f + 1) / total_frames) * 100 if total_frames > 0 else 100
                job.progress = progress
                db.commit()

            if not processed_frames:
                logger.error("No processed frames, cannot compile final video.")
                raise ValueError("No processed frames to compile.")

            logger.info(f"Compiling final video with {len(processed_frames)} frames, fps={fps:.2f}")

            local_processed_path = compile_video_with_audio(local_cfr_path, processed_frames, fps=fps)
            if not local_processed_path:
                raise ValueError("Failed to compile the processed video.")

            # 3. Add auto captions if requested
            if auto_captions:
                srt_path = generate_srt_with_whisper(local_processed_path)

                local_ass_path = srt_path.rsplit('.', 1)[0] + '.ass'
                srt_to_ass(srt_path, ASS_TEMPLATE_PATH, local_ass_path)
                
                local_captioned_path = local_processed_path.rsplit('.', 1)[0] + '_with_captions.mp4'
                burn_in_ass_captions(
                    local_processed_path,
                    local_ass_path,
                    local_captioned_path
                )
                delete_local_file(local_processed_path)
                local_processed_path = local_captioned_path

            # 4. After finishing, upload the final processed video
            processed_filename = f"{uuid.uuid4()}_cfr_processed.mp4"
            s3_key_processed = f"videos/{processed_filename}"
            s3_url_processed = upload_file_to_s3(local_processed_path, s3_key_processed)
            logger.info(f"Uploaded final processed video to S3: {s3_url_processed}")

            # 5. Store it in processed_path
            job.video.processed_path = s3_url_processed  # store final S3 URL
            job.video.status = VideoStatus.completed
            job.status = JobStatus.completed
            db.commit()

            logger.info(f"Video ID {video_id} marked completed. processed_video_path = {s3_url_processed}")

            # Clean up
            delete_local_file(local_cfr_path)
            delete_local_file(local_processed_path)

        except Exception as e:
            logger.error(f"Error in process_video_task for job ID {job_id}: {e}", exc_info=True)
            db.rollback()
            job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
            if job:
                job.status = JobStatus.failed
                job.video.status = VideoStatus.failed
                db.commit()
            raise e
        finally:
            db.close()

def load_speakers_for_video(db: Session, video_id: int) -> list:
    speakers = db.query(Speaker).filter(Speaker.video_id == video_id).all()
    speaker_data = []
    for speaker in speakers:
        embedding = np.array(json.loads(speaker.embedding))
        speaker_data.append((speaker.id, speaker.unique_speaker_id, embedding))
    logger.info(f"Loaded {len(speaker_data)} speakers for video {video_id}")
    logger.info(f"Speaker data mapping: {[(s[0], s[1]) for s in speaker_data]}")
    return speaker_data

def generate_srt_with_whisper(video_path: str) -> str:
    """
    Run Whisper on `video_path`, produce an .srt file, and return its path.
    """
    model = whisper.load_model("base")
    logger.info("Running Whisper transcription... might take a bit.")
    result = model.transcribe(video_path)
    
    srt_path = video_path.rsplit('.', 1)[0] + '.srt'
    with open(srt_path, 'w', encoding='utf-8') as f:
        for i, seg in enumerate(result['segments'], start=1):
            start = seg['start']
            end = seg['end']
            text = seg['text'].strip()
            
            start_srt = to_srt_timestamp(start)
            end_srt = to_srt_timestamp(end)
            
            f.write(f"{i}\n{start_srt} --> {end_srt}\n{text}\n\n")
    
    logger.info(f"SRT file saved at {srt_path}")
    return srt_path

def to_srt_timestamp(seconds: float) -> str:
    """Helper to convert 12.345 to HH:MM:SS,mmm for SRT."""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds - int(seconds)) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

def burn_in_captions(input_video: str, srt_file: str, output_video: str):
    """
    Use ffmpeg to burn SRT into the video frames.
    """
    logger.info(f"Burning captions from {srt_file} into {input_video} => {output_video}")
    
    cmd = [
        "ffmpeg", "-y",
        "-i", input_video,
        "-vf", f"subtitles='{srt_file}'",
        "-c:a", "copy",
        output_video
    ]
    
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.returncode != 0:
        logger.error(f"Error burning in captions: {result.stderr}")
        raise RuntimeError("Failed to burn captions via ffmpeg.")
    
    logger.info("Captions burned successfully.")


def srt_to_ass(srt_path: str, template_ass_path: str, output_ass_path: str):
    """
    Naively convert an .srt file's lines into .ass 'Dialogue:' lines,
    reusing the [Script Info] + [V4+ Styles] from `template_ass_path`.
    Then write the combined result to `output_ass_path`.

    1) We'll read all lines from `template_ass_path` up to the "[Events]" section,
       store them. Then we write our own "[Events]" block with the
       newly created "Dialogue: ..." lines from the SRT file.
    2) We assume the template .ass includes a "Default" style in the [V4+ Styles] section.

    NOTE: This is a minimal approach with simplistic SRT parsing.
    """
    # 1) Grab the lines from the template .ass
    with open(template_ass_path, 'r', encoding='utf-8') as f:
        template_lines = f.readlines()

    # We'll separate them into:
    #  - everything up to "[Events]" or "Events]" 
    #  - ignore or remove any existing lines in [Events] from the template
    header_lines = []
    found_events = False
    for line in template_lines:
        # Check if line starts with "[Events]"
        if line.strip().lower().startswith("[events]"):
            found_events = True
            break
        header_lines.append(line)

    # 2) Parse the SRT lines => produce a list of (start_time, end_time, text)
    #    We'll store times in ASS format "H:MM:SS.xx" or "0:00:05.07" etc.
    #    SRT times are "HH:MM:SS,mmm"
    subs = []
    with open(srt_path, 'r', encoding='utf-8') as f:
        srt_data = f.read().strip()

    # A naive SRT chunk parser:
    # each block is:
    #   number
    #   00:00:01,200 --> 00:00:03,400
    #   line of text
    #   line of text
    #   (blank line)
    blocks = srt_data.split("\n\n")
    for block in blocks:
        lines = block.splitlines()
        if len(lines) >= 2:
            # lines[0] is the numeric index
            # lines[1] is the time range
            # the rest are text lines
            time_line = lines[1]
            text_lines = lines[2:]
            full_text = " ".join(text_lines).replace("\n", " ").strip()

            # parse "00:00:01,200 --> 00:00:03,400"
            match = re.match(r"(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})", time_line)
            if match:
                start_str, end_str = match.groups()
                start_ass = _srt_time_to_ass_time(start_str)
                end_ass = _srt_time_to_ass_time(end_str)

                subs.append((start_ass, end_ass, full_text))

    # 3) Create the [Events] lines from these subs
    #    Basic format: 
    #    Dialogue: 0,<start>,<end>,Default,,0,0,0,,Hello world
    # We'll use the "Default" style from the template [V4+ Styles]
    event_lines = []
    event_lines.append("[Events]\n")
    event_lines.append("Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n")

    for (start, end, text) in subs:
        # e.g.: "Dialogue: 0,0:00:01.20,0:00:03.40,Default,,0,0,0,,Some text"
        line = f"Dialogue: 0,{start},{end},Default,,0,0,0,,{text}\n"
        event_lines.append(line)

    # 4) Combine header_lines + event_lines => output_ass_path
    with open(output_ass_path, 'w', encoding='utf-8') as f:
        for line in header_lines:
            f.write(line)
        for line in event_lines:
            f.write(line)


def _srt_time_to_ass_time(srt_time: str) -> str:
    """
    Convert 'HH:MM:SS,mmm' => 'H:MM:SS.xx' for .ass Dialogue
    e.g. '00:01:02,250' => '0:01:02.25'
    """
    # parse with datetime or do manual splits
    # Quick approach:
    h, m, s_ms = srt_time.split(":")
    s, ms = s_ms.split(",")
    hours = int(h)
    mins = int(m)
    secs = int(s)
    msecs = int(ms)

    # Convert total to seconds + fraction
    # Then reformat as e.g. 0:00:05.07
    td = datetime.timedelta(hours=hours, minutes=mins, seconds=secs, milliseconds=msecs)
    total_seconds = td.total_seconds()

    # Build "H:MM:SS.xx"
    # e.g. hours might be e.g. 0, 1, etc. 
    # We keep it minimal, e.g. if hours=0 => "0:01:02.25"
    # We'll do two decimal places for fraction
    hours_part = int(total_seconds // 3600)
    remainder = total_seconds % 3600
    mins_part = int(remainder // 60)
    secs_part = remainder % 60

    return f"{hours_part}:{mins_part:02d}:{secs_part:05.2f}"


def burn_in_ass_captions(input_video: str, ass_file: str, output_video: str):
    """
    Use ffmpeg to burn a static .ass stylesheet (and potentially the transcript lines)
    into the final video frames.
    """
    logger.info(f"Burning .ass subtitles from {ass_file} into {input_video} => {output_video}")

    # Debugging: Verify file exists and can be read
    if not os.path.exists(ass_file):
        raise FileNotFoundError(f"The ASS file '{ass_file}' does not exist.")
    logger.info(f"Using ASS file: {ass_file}")

    cmd = [
        "ffmpeg", "-y",
        "-i", input_video,
        "-vf", (
            f"subtitles={ass_file}:force_style='"
            "Alignment=10,"
            "Outline=5,"
            "OutlineColour=&H000000,"
            "Shadow=3,"
        ),
        "-c:a", "copy",
        output_video
    ]

    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.returncode != 0:
        logger.error(f"Error burning in .ass subtitles: {result.stderr}")
        raise RuntimeError("Failed to burn .ass subtitles via ffmpeg.")

    logger.info("ASS subtitles burned successfully.")