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
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA

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

            # Initialize face detector BEFORE the scene processing
            face_detector = load_face_detector()
            logger.info("Face detector initialized")

            # Get all speakers for this video
            speaker_data = [(s.id, s.unique_speaker_id) for s in db.query(Speaker).filter(
                Speaker.video_id == job.video_id,
                Speaker.id.in_(selected_speakers)
            ).all()]
            
            logger.info(f"Available speaker data: {speaker_data}")
            logger.info(f"Selected speakers: {selected_speakers}")

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

            # Test the face detector with a sample frame
            test_frame = frames[0]  # Use the first frame as a test
            test_detections = face_detector.get(test_frame)
            logger.info(f"Face detector test: found {len(test_detections) if test_detections is not None else 0} faces in test frame")

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
                    
                    # Use largest face as reference
                    largest_face_size = face_sizes[0][1]
                    # Set threshold at 20% of largest face size
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

                            emb = face.embedding
                            logger.info(f"Processing face {i+1} embedding shape: {emb.shape}")
                            
                            # Transform the current embedding using the same pipeline
                            emb_scaled = runtime_scaler.transform(emb.reshape(1, -1))
                            emb_transformed = runtime_pca.transform(emb_scaled).flatten()
                            
                            # Calculate all distances first
                            distances = []
                            for db_id, unique_id in speaker_data:
                                try:
                                    speaker = db.query(Speaker).get(db_id)
                                    if not speaker:
                                        continue
                                        
                                    s_emb_array = np.array(json.loads(speaker.embedding))
                                    
                                    similarity = np.dot(emb_transformed, s_emb_array) / (
                                        np.linalg.norm(emb_transformed) * np.linalg.norm(s_emb_array))
                                    dist = 1 - similarity
                                    distances.append((db_id, dist))
                                except Exception as e:
                                    logger.error(f"Error comparing with speaker {db_id}: {str(e)}")
                                    continue

                            # Sort distances and calculate adaptive threshold
                            distances.sort(key=lambda x: x[1])
                            logger.info(f"Sorted distances for face {i+1}: {distances}")

                            if distances:
                                best_id, best_dist = distances[0]
                                second_best_dist = distances[1][1] if len(distances) > 1 else float('inf')
                                
                                # Calculate gap and relative difference
                                dist_gap = second_best_dist - best_dist
                                relative_diff = dist_gap / best_dist if best_dist > 0 else float('inf')
                                
                                # Base threshold varies based on best distance
                                if best_dist < 0.3:  # Very good match
                                    base_threshold = 0.6
                                elif best_dist < 0.5:  # Good match
                                    base_threshold = 0.55
                                else:  # Weaker match with good separation
                                    # If there's good separation between matches, be more lenient
                                    if dist_gap > 0.4 or relative_diff > 0.4:
                                        base_threshold = 1.2
                                    else:
                                        base_threshold = 0.8
                                
                                # Adjust threshold based on gap and relative difference
                                adaptive_threshold = base_threshold
                                if dist_gap > 0.3 or relative_diff > 1.0:  # Clear separation
                                    adaptive_threshold += 0.2
                                elif dist_gap > 0.15 or relative_diff > 0.5:  # Moderate separation
                                    adaptive_threshold += 0.1
                                
                                logger.info(f"Face {i+1} - Best dist: {best_dist}, Second best: {second_best_dist}, "
                                          f"Gap: {dist_gap}, Relative diff: {relative_diff}, "
                                          f"Base threshold: {base_threshold}, Final threshold: {adaptive_threshold}")

                                if best_dist < adaptive_threshold:
                                    x1, y1, x2, y2 = map(int, bbox)
                                    identified_speakers.append((best_id, (x1, y1, x2, y2)))
                                    logger.info(f"Face {i+1} matched to speaker {best_id} with distance {best_dist}")
                                else:
                                    logger.warning(f"No match found for face {i+1} (best distance {best_dist} > threshold {adaptive_threshold})")

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

                # Debug logging for speaker identification
                logger.info(f"Processing scene from {start_time:.2f}s to {end_time:.2f}s")
                logger.info(f"Available speaker data: {[(s[0], s[1]) for s in speaker_data]}")
                logger.info(f"Selected speakers: {selected_speakers}")

                # Identify speakers in the representative frame
                identified = identify_speakers_in_frame_runtime(
                    frame=rep_frame,
                    speaker_data=speaker_data,
                    face_detector=face_detector,
                    video_id=job.video_id,
                    db=db
                )
                logger.info(f"All identified speakers in frame: {[uid for uid, _ in identified]}")
                
                # Filter for selected speakers
                identified = [(uid, bbox) for uid, bbox in identified if uid in selected_speakers]
                logger.info(f"Filtered selected speakers: {[uid for uid, _ in identified]}")

                layout_config = determine_layout(len(identified))
                logger.info(f"Using layout config for {len(identified)} speakers")

                # Process all frames in the scene
                for f_idx in range(start_f, end_f + 1):
                    if 0 <= f_idx < total_frames:
                        frame = frames[f_idx]
                        out_frame = apply_layout_to_frame(frame, identified, layout_config)
                        if out_frame is not None:
                            processed_frames.append(out_frame)
                        else:
                            logger.warning(f"Frame {f_idx} returned None after layout application")

                progress = ((end_f + 1) / total_frames) * 100 if total_frames > 0 else 100
                job.progress = progress
                db.commit()

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
