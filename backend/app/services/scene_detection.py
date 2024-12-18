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
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise IOError(f"Cannot open video file {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        logger.info(f"Video {video_path}: {total_frames} frames, {fps} FPS")

        # Parameters for scene detection
        min_scene_length = int(fps * 1.0)  # Minimum 1 second per scene
        threshold = 30.0  # Threshold for scene change detection
        
        prev_frame = None
        scene_changes = [0]  # Start with first frame
        frame_count = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if prev_frame is not None:
                # Convert to grayscale
                curr_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                prev_gray = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY)
                
                # Calculate frame difference
                frame_diff = cv2.absdiff(curr_gray, prev_gray)
                mean_diff = np.mean(frame_diff)
                
                # Detect scene change
                if (mean_diff > threshold and 
                    (frame_count - scene_changes[-1]) > min_scene_length):
                    scene_changes.append(frame_count)
                    logger.info(f"Scene change detected at frame {frame_count} "
                              f"(time: {frame_count/fps:.2f}s)")

            prev_frame = frame.copy()
            frame_count += 1

        # Add the final frame
        scene_changes.append(total_frames)
        
        # Convert frame numbers to timestamps
        scenes = []
        for i in range(len(scene_changes) - 1):
            start_time = scene_changes[i] / fps
            end_time = scene_changes[i + 1] / fps
            scenes.append((start_time, end_time))
            
        cap.release()
        logger.info(f"Detected {len(scenes)} scenes in video")
        return scenes

    except Exception as e:
        logger.error(f"Error in detect_scenes for video ID {video_id}: {e}")
        cap.release()
        return [(0, total_frames / fps)] if 'total_frames' in locals() else None