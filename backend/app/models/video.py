# backend/app/models/video.py

from sqlalchemy import Column, Integer, String, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
from enum import Enum

class VideoStatus(str, Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    PROCESSED = "processed"
    FAILED = "failed"

class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)
    upload_path = Column(String, nullable=False)
    processed_path = Column(String, nullable=True)
    thumbnail_url = Column(String, nullable=True)
    status = Column(
        SQLEnum(VideoStatus, name="videostatus", values_callable=lambda x: [status.value for status in VideoStatus]),
        default=VideoStatus.UPLOADED,
        nullable=False
    )
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    owner = relationship("User", back_populates="videos")
    speakers = relationship("Speaker", back_populates="video")
    
    processing_jobs = relationship(
        "ProcessingJob",
        back_populates="video",
        cascade="all, delete-orphan",
    )