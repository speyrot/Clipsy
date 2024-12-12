# backend/app/models/__init__.py

from .processing_job import ProcessingJob, JobStatus, JobType
from .video import Video, VideoStatus
from .speaker import Speaker
from .user import User  

__all__ = [
    "ProcessingJob",
    "JobStatus",
    "Video",
    "Speaker",
    "User",
    # Add other model names here
]