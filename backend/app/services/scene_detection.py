# backend/app/services/scene_detection.py

import cv2
import numpy as np
import logging
from sqlalchemy.orm import Session
from app.database import SessionLocal

logger = logging.getLogger(__name__)

def detect_scenes(video_id: int, video_path: str, db: Session) -> list:
    """Detect scene changes in a video and return list of (start_time, end_time) tuples"""
    try:
        # Open the video file
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise IOError(f"Cannot open video file {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        logger.info(f"Video {video_path}: {total_frames} frames, {fps} FPS")

        # For now, return a single scene spanning the entire video
        duration = total_frames / fps
        scenes = [(0, duration)]
        
        cap.release()
        logger.info(f"Returning single scene: start=0 end={duration}")
        return scenes

    except Exception as e:
        logger.error(f"Error in detect_scenes for video ID {video_id}: {e}")
        return [(0, duration)] if 'duration' in locals() else None