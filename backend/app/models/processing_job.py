# app/models/processing_job.py

from sqlalchemy import Column, Integer, String, ForeignKey, Float, Enum
from sqlalchemy.orm import relationship
import enum
from .base import Base

class JobStatus(enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    failed = "failed"
    scenes_detected = "scenes_detected"

class JobType(enum.Enum):
    speaker_detection = "speaker_detection"
    video_processing = "video_processing"

class ProcessingJob(Base):
    __tablename__ = "processing_jobs"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id"), nullable=False)
    status = Column(Enum(JobStatus), default=JobStatus.pending)
    progress = Column(Float, default=0.0)
    job_type = Column(Enum(JobType), nullable=False)
    processed_video_path = Column(String, nullable=True)  # If not already present

    video = relationship("Video", back_populates="processing_jobs")
