# backend/app/services/video_processing.py

#import warnings
#import cv2
#from moviepy.editor import VideoFileClip
#from app.celery_app import celery
#from app.models import ProcessingJob, JobStatus, Speaker, VideoStatus, Video, JobType
#from app.database import SessionLocal
#from app.services.face_detection import detect_and_store_speakers, get_yolo_model, get_reid_embedding, scaler, pca
#from app.services.scene_detection import detect_scenes
#from app.utils.video_utils import extract_frames, apply_layout_to_frame, compile_video_with_audio, determine_layout, ffprobe_info
#import logging
#import json
#import numpy as np
#from sqlalchemy.orm import Session
#from collections import defaultdict
#import pickle
#import os
#import subprocess
#
#logger = logging.getLogger(__name__)
#
#@celery.task(name="app.services.video_processing.detect_speakers_task")
#def detect_speakers_task(video_id: int, file_path: str, processing_job_id: int):
#    logger.info(f"Starting detect_speakers_task for video_id={video_id}, job_id={processing_job_id}, file={file_path}")
#    with SessionLocal() as db:
#        try:
#            processing_job = db.query(ProcessingJob).filter(ProcessingJob.id == processing_job_id).first()
#            if not processing_job:
#                raise Exception(f"ProcessingJob with ID {processing_job_id} not found")
#
#            processing_job.status = JobStatus.in_progress
#            db.commit()
#
#            detect_and_store_speakers(video_id=video_id, file_path=file_path, db=db, frame_skip=25)
#
#            logger.info(f"Speaker (person) detection completed for video_id={video_id}")
#
#            processing_job = db.query(ProcessingJob).filter(ProcessingJob.id == processing_job_id).first()
#            processing_job.status = JobStatus.completed
#            db.commit()
#
#            logger.info(f"ProcessingJob ID {processing_job.id} status updated to completed")
#
#        except Exception as e:
#            logger.error(f"Error in detect_speakers_task for video ID {video_id}: {e}")
#            db.rollback()
#            processing_job = db.query(ProcessingJob).filter(ProcessingJob.id == processing_job_id).first()
#            if processing_job:
#                processing_job.status = JobStatus.failed
#                db.commit()
#            raise e
#        finally:
#            db.close()
#
#@celery.task(name="app.services.video_processing.process_video_task")
#def process_video_task(job_id: int, selected_speakers: list):
#    logger.info(f"Starting process_video_task for job_id={job_id}, selected_speakers={selected_speakers}")
#
#    with SessionLocal() as db:
#        try:
#            job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
#            if not job:
#                raise ValueError(f"No ProcessingJob found with ID: {job_id}")
#
#            job.status = JobStatus.in_progress
#            job.video.status = VideoStatus.processing
#            db.commit()
#
#            # Use the original uploaded video file
#            original_video_path = job.video.upload_path
#            logger.info(f"Process video using original file at: {original_video_path}")
#
#            # Run ffprobe to get exact fps info
#            def get_video_info(path: str):
#                cmd = [
#                    "ffprobe", "-v", "error", "-select_streams", "v:0", 
#                    "-show_entries", "stream=duration,nb_frames",
#                    "-of", "default=noprint_wrappers=1", path
#                ]
#                result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
#                duration = None
#                nb_frames = None
#                for line in result.stdout.splitlines():
#                    if line.startswith("duration="):
#                        duration = float(line.split('=')[1].strip())
#                    elif line.startswith("nb_frames="):
#                        nb_frames = float(line.split('=')[1].strip())
#                return duration, nb_frames
#
#            duration, nb_frames = get_video_info(original_video_path)
#            if duration is None or nb_frames is None:
#                logger.warning("Could not retrieve duration or nb_frames from ffprobe. Falling back to MoviePy fps.")
#                clip = VideoFileClip(original_video_path)
#                fps = clip.fps
#                clip.close()
#
#                logger.info(f"Using original nominal FPS from MoviePy: {fps} FPS for final output")
#            else:
#                fps = nb_frames / duration
#                logger.info(f"Calculated FPS from ffprobe: {fps:.4f} (nb_frames={nb_frames}, duration={duration:.2f}s)")
#
#            # Load all speakers for this video
#            speaker_data = load_speakers_for_video(db, job.video_id)
#            if not speaker_data:
#                raise ValueError(f"No speaker data found for video_id={job.video_id}")
#
#            # Detect scenes
#            scene_timestamps = detect_scenes(job.video_id, original_video_path, db)
#            if not scene_timestamps:
#                # If no scenes detected, treat the entire video as one scene
#                logger.info("No scenes detected. Treating entire video as one scene.")
#                if duration is None:
#                    # fallback if ffprobe failed
#                    clip = VideoFileClip(original_video_path)
#                    duration = clip.duration
#                    clip.close()
#                scene_timestamps = [(0, duration)]
#
#            # Use frame_skip=1 for final processing
#            frames = extract_frames(original_video_path, frame_skip=1)
#            total_frames = len(frames)
#            if total_frames == 0:
#                raise ValueError("No frames extracted from the original video. Cannot process.")
#
#            logger.info(f"Extracted {len(frames)} frames (no skipping) from {original_video_path} for final processing.")
#
#            # Load scaler and pca
#            models_dir = os.path.join("app", "models", str(job.video_id))
#            scaler_path = os.path.join(models_dir, 'scaler.pkl')
#            pca_path = os.path.join(models_dir, 'pca.pkl')
#
#            if not (os.path.exists(scaler_path) and os.path.exists(pca_path)):
#                logger.error("Scaler/PCA models not found. Speaker identification may fail.")
#            
#            with open(scaler_path, 'rb') as f:
#                runtime_scaler = pickle.load(f)
#            with open(pca_path, 'rb') as f:
#                runtime_pca = pickle.load(f)
#
#            def identify_speakers_in_frame_runtime(frame: np.ndarray, speaker_data: list) -> list:
#                model = get_yolo_model()
#                results = model(frame)
#                detections = results[0].boxes
#                identified_speakers = []
#                
#                for det in detections:
#                    if int(det.cls) == 0:
#                        bbox = det.xyxy[0].tolist()
#                        x1, y1, x2, y2 = map(int, bbox)
#                        x1, y1 = max(0, x1), max(0, y1)
#                        x2, y2 = min(frame.shape[1], x2), min(frame.shape[0], y2)
#                        person_img = frame[y1:y2, x1:x2]
#                        if person_img.size == 0:
#                            continue
#                        
#                        raw_emb = get_reid_embedding(person_img).reshape(1, -1)
#                        raw_emb = runtime_scaler.transform(raw_emb)
#                        emb = runtime_pca.transform(raw_emb)[0]
#
#                        best_id = None
#                        best_dist = float('inf')
#                        for s_db_id, s_cluster_id, s_emb in speaker_data:
#                            dist = np.linalg.norm(emb - s_emb)
#                            if dist < best_dist:
#                                best_dist = dist
#                                best_id = s_db_id
#                        if best_id is not None:
#                            identified_speakers.append((best_id, (x1, y1, x2, y2)))
#                
#                return identified_speakers
#
#            processed_frames = []
#
#            for (start_time, end_time) in scene_timestamps:
#                start_f = int(start_time * fps)
#                end_f = min(int(end_time * fps), total_frames - 1)
#
#                rep_frame_idx = max(0, min(start_f, total_frames - 1))
#                rep_frame = frames[rep_frame_idx]
#
#                identified = identify_speakers_in_frame_runtime(rep_frame, speaker_data)
#                identified = [(uid, bbox) for uid, bbox in identified if uid in selected_speakers]
#
#                layout_config = determine_layout(len(identified))
#
#                logger.info(f"Scene {start_time:.2f}-{end_time:.2f}s ({start_f}-{end_f} frames): {len(identified)} speakers identified.")
#
#                for f_idx in range(start_f, end_f + 1):
#                    if 0 <= f_idx < total_frames:
#                        frame = frames[f_idx]
#                        out_frame = apply_layout_to_frame(frame, identified, layout_config)
#                        if out_frame is not None:
#                            processed_frames.append(out_frame)
#                        else:
#                            logger.warning(f"Frame {f_idx} returned None after layout application.")
#
#                progress = ((end_f + 1) / total_frames) * 100 if total_frames > 0 else 100
#                job.progress = progress
#                db.commit()
#                logger.debug(f"Updated job {job_id} progress to {progress:.2f}%")
#
#            if not processed_frames:
#                logger.error("No frames were processed. Cannot compile final video.")
#                raise ValueError("No processed frames.")
#
#            logger.info(f"Compiling final video with {len(processed_frames)} frames.")
#            logger.info(f"Using fps={fps:.4f} for final compilation from ffprobe info.")
#
#            compiled_video_path = compile_video_with_audio(original_video_path, processed_frames, fps=fps)
#            if not compiled_video_path:
#                raise ValueError("Failed to compile the processed video.")
#
#            job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
#            job.video.status = VideoStatus.completed
#            job.status = JobStatus.completed
#            job.processed_video_path = compiled_video_path
#            db.commit()
#
#            logger.info(f"Video status updated to completed, final video: {compiled_video_path}")
#
#        except Exception as e:
#            logger.error(f"Error in process_video_task for job ID {job_id}: {e}", exc_info=True)
#            db.rollback()
#            job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
#            if job:
#                job.status = JobStatus.failed
#                job.video.status = VideoStatus.failed
#                db.commit()
#            raise e
#        finally:
#            db.close()
#
#def load_speakers_for_video(db: Session, video_id: int) -> list:
#    speakers = db.query(Speaker).filter(Speaker.video_id == video_id).all()
#    speaker_data = []
#    for speaker in speakers:
#        embedding = np.array(json.loads(speaker.embedding))
#        speaker_data.append((speaker.id, speaker.unique_speaker_id, embedding))
#    logger.info(f"Loaded {len(speaker_data)} speakers for video {video_id}")
#    logger.info(f"Speaker data mapping: {[(s[0], s[1]) for s in speaker_data]}")
#    return speaker_data
#
#def identify_speakers_in_frame(frame: np.ndarray, speaker_data: list, video_id: int) -> list:
#    try:
#        model = get_yolo_model()
#        results = model(frame)
#        detections = results[0].boxes
#
#        logger.info(f"Found {len(detections)} people in frame")
#        logger.info(f"Stored speaker data contains {len(speaker_data)} speakers")
#        
#        identified_speakers = []
#        
#        models_dir = os.path.join("app", "models", str(video_id))
#        with open(os.path.join(models_dir, 'scaler.pkl'), 'rb') as f:
#            frame_scaler = pickle.load(f)
#        with open(os.path.join(models_dir, 'pca.pkl'), 'rb') as f:
#            frame_pca = pickle.load(f)
#
#        for speaker_id, cluster_id, stored_emb in speaker_data:
#            logger.info(f"Speaker DB ID: {speaker_id}, Cluster ID: {cluster_id}, Embedding norm: {np.linalg.norm(stored_emb)}")
#
#        for det in detections:
#            if int(det.cls) == 0:
#                bbox = det.xyxy[0].tolist()
#                x1, y1, x2, y2 = map(int, bbox)
#                person_img = frame[y1:y2, x1:x2]
#                
#                raw_emb = get_reid_embedding(person_img)
#                if raw_emb is None:
#                    continue
#                
#                raw_emb = raw_emb.reshape(1, -1)
#                logger.info(f"Raw embedding norm: {np.linalg.norm(raw_emb)}")
#                
#                scaled_emb = frame_scaler.transform(raw_emb)
#                processed_emb = frame_pca.transform(scaled_emb)
#                emb = processed_emb[0]
#                
#                distances = []
#                for speaker_id, cluster_id, stored_emb in speaker_data:
#                    dist = np.linalg.norm(emb - stored_emb)
#                    distances.append((speaker_id, cluster_id, dist))
#                    logger.info(f"Distance to speaker {speaker_id} (cluster {cluster_id}): {dist:.4f}")
#                
#                if distances:
#                    best_match = min(distances, key=lambda x: x[2])
#                    best_id, best_cluster, best_dist = best_match
#                    logger.info(f"Best match: Speaker DB ID {best_id} (cluster {best_cluster}) with distance {best_dist:.4f}")
#                    
#                    if best_dist < 1.0:
#                        identified_speakers.append((best_id, (x1, y1, x2, y2)))
#                        logger.info(f"Added speaker {best_id} to identified speakers")
#
#        logger.info(f"Final identified speakers with DB IDs: {identified_speakers}")
#        return identified_speakers
#
#    except Exception as e:
#        logger.error(f"Error in identify_speakers_in_frame: {e}", exc_info=True)
#        return []


# backend/app/services/video_processing.py

import warnings
import cv2
from moviepy.editor import VideoFileClip
from app.celery_app import celery
from app.models import ProcessingJob, JobStatus, Speaker, VideoStatus, Video, JobType
from app.database import SessionLocal
from app.services.face_detection import detect_and_store_speakers, load_face_detector, scaler, pca
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
def process_video_task(job_id: int, selected_speakers: list):
    logger.info(f"Starting process_video_task for job_id={job_id}, selected_speakers={selected_speakers}")

    with SessionLocal() as db:
        try:
            job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
            if not job:
                raise ValueError(f"No ProcessingJob found with ID: {job_id}")

            job.status = JobStatus.in_progress
            job.video.status = VideoStatus.processing
            db.commit()

            # Use the original uploaded video file
            original_video_path = job.video.upload_path
            logger.info(f"Process video using original file at: {original_video_path}")

            # Run ffprobe to get exact fps info
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

            duration, nb_frames = get_video_info(original_video_path)
            if duration is None or nb_frames is None:
                logger.warning("Could not retrieve duration or nb_frames from ffprobe. Falling back to MoviePy fps.")
                clip = VideoFileClip(original_video_path)
                fps = clip.fps
                clip.close()

                logger.info(f"Using original nominal FPS from MoviePy: {fps} FPS for final output")
            else:
                fps = nb_frames / duration
                logger.info(f"Calculated FPS from ffprobe: {fps:.4f} (nb_frames={nb_frames}, duration={duration:.2f}s)")

            # Load all speakers for this video
            speaker_data = load_speakers_for_video(db, job.video_id)
            if not speaker_data:
                raise ValueError(f"No speaker data found for video_id={job.video_id}")

            # Detect scenes
            scene_timestamps = detect_scenes(job.video_id, original_video_path, db)
            if not scene_timestamps:
                # If no scenes detected, treat the entire video as one scene
                logger.info("No scenes detected. Treating entire video as one scene.")
                if duration is None:
                    # fallback if ffprobe failed
                    clip = VideoFileClip(original_video_path)
                    duration = clip.duration
                    clip.close()
                scene_timestamps = [(0, duration)]

            # Use frame_skip=1 for final processing
            frames = extract_frames(original_video_path, frame_skip=1)
            total_frames = len(frames)
            if total_frames == 0:
                raise ValueError("No frames extracted from the original video. Cannot process.")

            logger.info(f"Extracted {len(frames)} frames (no skipping) from {original_video_path} for final processing.")

            # Load scaler and pca
            models_dir = os.path.join("app", "models", str(job.video_id))
            scaler_path = os.path.join(models_dir, 'scaler.pkl')
            pca_path = os.path.join(models_dir, 'pca.pkl')

            if not (os.path.exists(scaler_path) and os.path.exists(pca_path)):
                logger.error("Scaler/PCA models not found. Speaker identification may fail.")
            
            with open(scaler_path, 'rb') as f:
                runtime_scaler = pickle.load(f)
            with open(pca_path, 'rb') as f:
                runtime_pca = pickle.load(f)

            def identify_speakers_in_frame_runtime(frame: np.ndarray, speaker_data: list, face_detector) -> list:
                detections = face_detector.get(frame)  # Use insightface's face detector
                identified_speakers = []

                for face in detections:

                    if hasattr(face, 'kps') and face.kps is not None:
                        logger.debug(f"Face landmarks: {face.kps}")
                    else:
                        logger.debug("No landmarks found for this face.")

                    # Extract the aligned face image
                    aligned_face = getattr(face, 'normed', None)
                    if aligned_face is None or aligned_face.size == 0:
                        continue

                    # Get the face embedding directly
                    emb = getattr(face, 'embedding', None)
                    if emb is None:
                        continue

                    # Compare embedding with speaker_data
                    best_id = None
                    best_dist = float('inf')
                    for s_db_id, s_cluster_id, s_emb in speaker_data:
                        dist = np.linalg.norm(emb - s_emb)
                        if dist < best_dist:
                            best_dist = dist
                            best_id = s_db_id
                    if best_id is not None:
                        # Extract bounding box
                        x1, y1, x2, y2 = map(int, face.bbox.tolist())
                        identified_speakers.append((best_id, (x1, y1, x2, y2)))

                return identified_speakers

            processed_frames = []

            for (start_time, end_time) in scene_timestamps:
                start_f = int(start_time * fps)
                end_f = min(int(end_time * fps), total_frames - 1)

                rep_frame_idx = max(0, min(start_f, total_frames - 1))
                rep_frame = frames[rep_frame_idx]

                identified = identify_speakers_in_frame_runtime(rep_frame, speaker_data)
                identified = [(uid, bbox) for uid, bbox in identified if uid in selected_speakers]

                layout_config = determine_layout(len(identified))

                logger.info(f"Scene {start_time:.2f}-{end_time:.2f}s ({start_f}-{end_f} frames): {len(identified)} speakers identified.")

                for f_idx in range(start_f, end_f + 1):
                    if 0 <= f_idx < total_frames:
                        frame = frames[f_idx]
                        out_frame = apply_layout_to_frame(frame, identified, layout_config)
                        if out_frame is not None:
                            processed_frames.append(out_frame)
                        else:
                            logger.warning(f"Frame {f_idx} returned None after layout application.")

                progress = ((end_f + 1) / total_frames) * 100 if total_frames > 0 else 100
                job.progress = progress
                db.commit()
                logger.debug(f"Updated job {job_id} progress to {progress:.2f}%")

            if not processed_frames:
                logger.error("No frames were processed. Cannot compile final video.")
                raise ValueError("No processed frames.")

            logger.info(f"Compiling final video with {len(processed_frames)} frames.")
            logger.info(f"Using fps={fps:.4f} for final compilation from ffprobe info.")

            compiled_video_path = compile_video_with_audio(original_video_path, processed_frames, fps=fps)
            if not compiled_video_path:
                raise ValueError("Failed to compile the processed video.")

            job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
            job.video.status = VideoStatus.completed
            job.status = JobStatus.completed
            job.processed_video_path = compiled_video_path
            db.commit()

            logger.info(f"Video status updated to completed, final video: {compiled_video_path}")

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

def identify_speakers_in_frame_runtime(frame: np.ndarray, speaker_data: list, face_detector) -> list:
    detections = face_detector.get(frame)  # Use insightface's face detector
    identified_speakers = []

    for face in detections:

        if hasattr(face, 'kps') and face.kps is not None:
            logger.debug(f"Face landmarks: {face.kps}")
        else:
            logger.debug("No landmarks found for this face.")

        # Extract the aligned face image
        aligned_face = getattr(face, 'normed', None)
        if aligned_face is None or aligned_face.size == 0:
            continue

        # Get the face embedding directly
        emb = getattr(face, 'embedding', None)
        if emb is None:
            continue

        # Compare embedding with speaker_data
        best_id = None
        best_dist = float('inf')
        for s_db_id, s_cluster_id, s_emb in speaker_data:
            dist = np.linalg.norm(emb - s_emb)
            if dist < best_dist:
                best_dist = dist
                best_id = s_db_id
        if best_id is not None:
            # Extract bounding box
            x1, y1, x2, y2 = map(int, face.bbox.tolist())
            identified_speakers.append((best_id, (x1, y1, x2, y2)))

    return identified_speakers