# backend/app/models/processing_job.py

from sqlalchemy import Column, Integer, String, ForeignKey, Float, Enum as SQLEnum
from sqlalchemy.orm import relationship
import enum
from .base import Base

class JobStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    SCENES_DETECTED = "scenes_detected"

class JobType(enum.Enum):
    SPEAKER_DETECTION = "speaker_detection"
    VIDEO_PROCESSING = "video_processing"

class ProcessingJob(Base):
    __tablename__ = "processing_jobs"

    id = Column(Integer, primary_key=True, index=True)
    
    video_id = Column(
        Integer,
        ForeignKey("videos.id", ondelete="CASCADE"), 
        nullable=False
    )
    
    status = Column(
        SQLEnum(JobStatus, name="jobstatus", values_callable=lambda x: [status.value for status in JobStatus]),
        default=JobStatus.PENDING,
        nullable=False
    )
    progress = Column(Float, default=0.0)
    job_type = Column(
        SQLEnum(JobType, name="jobtype", values_callable=lambda x: [jt.value for jt in JobType]),
        nullable=False
    )
    processed_video_path = Column(String, nullable=True)

    video = relationship("Video", back_populates="processing_jobs")
