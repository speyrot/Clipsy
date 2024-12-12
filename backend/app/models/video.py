# app/models/video.py

from sqlalchemy import Column, Integer, String, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum
from .base import Base

class VideoStatus(enum.Enum):
    uploaded = "uploaded"
    processing = "processing"
    completed = "completed"
    failed = "failed"

class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    upload_path = Column(String, nullable=False)
    processed_path = Column(String, nullable=True)
    status = Column(Enum(VideoStatus), default=VideoStatus.uploaded)

    owner = relationship("User", back_populates="videos")
    speakers = relationship("Speaker", back_populates="video")
    processing_jobs = relationship("ProcessingJob", back_populates="video")
