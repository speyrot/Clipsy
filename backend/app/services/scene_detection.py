# app/services/scene_detection.py

from scenedetect import VideoManager, SceneManager
from scenedetect.detectors import ContentDetector
from sqlalchemy.orm import Session
from app.models import Video, ProcessingJob
import logging

logger = logging.getLogger(__name__)

def detect_scenes(video_id: int, video_path: str, db: Session):
    try:
        logger.info(f"Detecting scenes in video ID {video_id}.")

        # Create a video manager and scene manager
        video_manager = VideoManager([video_path])
        scene_manager = SceneManager()

        # Add ContentDetector (detects fast cuts)
        scene_manager.add_detector(ContentDetector(threshold=30.0))  

        # Start processing the video
        video_manager.start()

        # Detect all scenes in the video
        scene_manager.detect_scenes(frame_source=video_manager)

        # Get list of detected scene boundaries
        scene_list = scene_manager.get_scene_list()
        logger.info(f"Detected {len(scene_list)} scenes for video ID {video_id}.")
        scene_timestamps = [(scene[0].get_seconds(), scene[1].get_seconds()) for scene in scene_list]

        # Update progress or store scene info if needed, but don't use a non-enum status.
        processing_job = db.query(ProcessingJob).filter(ProcessingJob.video_id == video_id).first()
        if processing_job:
            # Just update progress to 100% after detecting scenes, no invalid status:
            processing_job.progress = 100.0
            db.commit()

        video = db.query(Video).filter(Video.id == video_id).first()
        if video:
            # If you had a status for scenes detected, use a valid one, otherwise skip.
            # For now, we won't change video status here:
            db.commit()

        logger.info(f"Scene detection completed for video ID {video_id}.")
        return scene_timestamps

    except Exception as e:
        logger.error(f"Error in detect_scenes for video ID {video_id}: {e}")
        video = db.query(Video).filter(Video.id == video_id).first()
        if video:
            video.status = "failed"  # This assumes "failed" exists in VideoStatus enum
            db.commit()
        raise e
