# backend/app/services/__init__.py

from .video_processing import detect_speakers_task, process_video_task
from .face_detection import detect_and_store_speakers
from .layout_determination import determine_layout
from .scene_detection import detect_scenes

__all__ = [
    "detect_speakers_task",  # updated to reference the correct function
    "process_video_task",
    "detect_and_store_speakers",
    "determine_layout",
    "detect_scenes",
    # Add other service functions or classes as needed
]

