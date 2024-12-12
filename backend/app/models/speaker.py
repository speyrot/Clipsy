# backend/app/models/speaker.py

from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base  
import json

class Speaker(Base):
    __tablename__ = 'speakers'

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey('videos.id'), nullable=False)
    thumbnail_path = Column(String, nullable=True)
    embedding = Column(String, nullable=True)  # JSON-encoded list of floats
    unique_speaker_id = Column(Integer, nullable=True)  # Cluster label

    video = relationship("Video", back_populates="speakers")
