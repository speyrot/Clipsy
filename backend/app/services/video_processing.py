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

# NEW IMPORTS for S3 handling
from app.utils.s3_utils import (
    download_s3_to_local,
    upload_file_to_s3,
    delete_local_file
)

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
def process_video_task(video_id: int, job_id: int):
    logger.info(f"Starting process_video_task for video_id={video_id}, job_id={job_id}")

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

            # 3. After finishing, upload the final processed video
            processed_filename = f"{uuid.uuid4()}_cfr_processed.mp4"
            s3_key_processed = f"videos/{processed_filename}"
            s3_url_processed = upload_file_to_s3(local_processed_path, s3_key_processed)
            logger.info(f"Uploaded final processed video to S3: {s3_url_processed}")

            # 4. Store it in processed_path
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
