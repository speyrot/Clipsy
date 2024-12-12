# backend/app/services/video_processing.py

import warnings
import cv2
from moviepy.editor import VideoFileClip
from app.celery_app import celery
from app.models import ProcessingJob, JobStatus, Speaker, VideoStatus, Video, JobType
from app.database import SessionLocal
from app.services.face_detection import detect_and_store_speakers, get_yolo_model, get_reid_embedding, scaler, pca
from app.services.scene_detection import detect_scenes
from app.utils.video_utils import extract_frames, apply_layout_to_frame, compile_video_with_audio
import logging
import json
import numpy as np
from sqlalchemy.orm import Session
from collections import defaultdict
import pickle
import os

logger = logging.getLogger(__name__)

@celery.task(name="app.services.video_processing.detect_speakers_task")
def detect_speakers_task(video_id: int, file_path: str, processing_job_id: int):
    logger.info(f"Starting detect_speakers_task for video_id={video_id}, job_id={processing_job_id}")
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
            logger.error(f"Error in detect_speakers_task for video ID {video_id}: {e}")
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

            # Get video properties using MoviePy for accurate duration
            clip = VideoFileClip(job.video.upload_path)
            actual_duration = clip.duration
            actual_fps = clip.fps
            actual_total_frames = int(actual_duration * actual_fps)
            clip.close()
            
            logger.info(f"Video properties:")
            logger.info(f"- FPS: {actual_fps}")
            logger.info(f"- Total frames: {actual_total_frames}")
            logger.info(f"- Duration: {actual_duration:.2f} seconds")

            # Load speaker data and detect speakers (no changes to this part)
            speaker_data = load_speakers_for_video(db, job.video_id)
            if not speaker_data:
                raise ValueError(f"No speaker data found for video_id={job.video_id}")
            
            # Extract frames for detection (keeping frame_skip=30 for efficiency)
            frames = extract_frames(job.video.upload_path, frame_skip=30)
            logger.info(f"Extracted {len(frames)} frames for detection")

            # Process scenes (no changes to scene detection)
            scene_timestamps = detect_scenes(job.video_id, job.video.upload_path, db)
            if not scene_timestamps:
                scene_timestamps = [(0, actual_duration)]
            
            # Process each scene
            processed_frames = []
            for scene_idx, (start_time, end_time) in enumerate(scene_timestamps):
                # Convert time to frame indices using actual FPS
                start_frame = int(start_time * actual_fps)
                end_frame = min(int(end_time * actual_fps), actual_total_frames)
                
                # Use the nearest sampled frame for speaker detection
                sample_frame_idx = (start_frame // 30) * 30
                if sample_frame_idx >= len(frames):
                    continue
                
                # Identify speakers from the sampled frame
                identified = identify_speakers_in_frame(frames[sample_frame_idx // 30], speaker_data, job.video_id)
                identified = [(uid, bbox) for uid, bbox in identified if uid in selected_speakers]
                
                if identified:
                    layout_config = determine_layout(len(identified))
                    
                    # Extract and process all frames for this scene
                    scene_clip = VideoFileClip(job.video.upload_path).subclip(start_time, end_time)
                    for frame in scene_clip.iter_frames():
                        processed_frame = apply_layout_to_frame(frame, identified, layout_config)
                        processed_frames.append(processed_frame)
                    scene_clip.close()

            # Compile video with all frames
            if processed_frames:
                logger.info(f"Compiling video with {len(processed_frames)} frames")
                compiled_video_path = compile_video_with_audio(
                    original_video_path=job.video.upload_path,
                    processed_frames=processed_frames,
                    fps=actual_fps  # Make sure to use actual FPS
                )

                if compiled_video_path:
                    job.processed_video_path = compiled_video_path
                    job.status = JobStatus.completed
                    job.video.status = VideoStatus.completed
                    db.commit()
                else:
                    raise ValueError("Failed to compile video")
            else:
                raise ValueError("No frames were processed")

        except Exception as e:
            logger.error(f"Error in process_video_task: {e}", exc_info=True)
            job.status = JobStatus.failed
            job.video.status = VideoStatus.failed
            db.commit()
            raise e

def load_speakers_for_video(db: Session, video_id: int) -> list:
    speakers = db.query(Speaker).filter(Speaker.video_id == video_id).all()
    speaker_data = []
    for speaker in speakers:
        embedding = np.array(json.loads(speaker.embedding))
        # Store tuple of (database_id, cluster_id, embedding)
        speaker_data.append((speaker.id, speaker.unique_speaker_id, embedding))
    logger.info(f"Loaded {len(speaker_data)} speakers for video {video_id}")
    logger.info(f"Speaker data mapping: {[(s[0], s[1]) for s in speaker_data]}")
    return speaker_data

def identify_speakers_in_frame(frame: np.ndarray, speaker_data: list, video_id: int) -> list:
    try:
        model = get_yolo_model()
        results = model(frame)
        detections = results[0].boxes

        logger.info(f"Found {len(detections)} people in frame")
        logger.info(f"Stored speaker data contains {len(speaker_data)} speakers")
        
        identified_speakers = []
        
        # Load video-specific models
        models_dir = os.path.join("app", "models", str(video_id))
        with open(os.path.join(models_dir, 'scaler.pkl'), 'rb') as f:
            frame_scaler = pickle.load(f)
        with open(os.path.join(models_dir, 'pca.pkl'), 'rb') as f:
            frame_pca = pickle.load(f)

        for speaker_id, cluster_id, stored_emb in speaker_data:
            logger.info(f"Speaker DB ID: {speaker_id}, Cluster ID: {cluster_id}, Embedding norm: {np.linalg.norm(stored_emb)}")

        for det in detections:
            if int(det.cls) == 0:  # person class
                bbox = det.xyxy[0].tolist()
                x1, y1, x2, y2 = map(int, bbox)
                person_img = frame[y1:y2, x1:x2]
                
                raw_emb = get_reid_embedding(person_img)
                if raw_emb is None:
                    continue
                
                raw_emb = raw_emb.reshape(1, -1)
                logger.info(f"Raw embedding norm: {np.linalg.norm(raw_emb)}")
                
                scaled_emb = frame_scaler.transform(raw_emb)
                processed_emb = frame_pca.transform(scaled_emb)
                emb = processed_emb[0]
                
                distances = []
                for speaker_id, cluster_id, stored_emb in speaker_data:
                    dist = np.linalg.norm(emb - stored_emb)
                    distances.append((speaker_id, cluster_id, dist))
                    logger.info(f"Distance to speaker {speaker_id} (cluster {cluster_id}): {dist:.4f}")
                
                if distances:
                    best_match = min(distances, key=lambda x: x[2])
                    best_id, best_cluster, best_dist = best_match
                    logger.info(f"Best match: Speaker DB ID {best_id} (cluster {best_cluster}) with distance {best_dist:.4f}")
                    
                    if best_dist < 1.0:
                        identified_speakers.append((best_id, (x1, y1, x2, y2)))
                        logger.info(f"Added speaker {best_id} to identified speakers")

        logger.info(f"Final identified speakers with DB IDs: {identified_speakers}")
        return identified_speakers

    except Exception as e:
        logger.error(f"Error in identify_speakers_in_frame: {e}", exc_info=True)
        return []

def determine_layout(num_speakers: int):
    return {
        'width': 1080,
        'height': 1920,
        'num_speakers': num_speakers
    }
