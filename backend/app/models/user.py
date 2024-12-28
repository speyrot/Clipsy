# app/models/user.py

import enum
from sqlalchemy import Column, Integer, String, Enum
from sqlalchemy.orm import relationship
from .base import Base

class SubscriptionPlan(enum.Enum):
    free = "FREE"
    premium = "PREMIUM"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    
    # Basic info
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
    profile_picture_url = Column(String, nullable=True)

    # Auth
    password_hash = Column(String, nullable=True)  # May be null if using OAuth only
    oauth_provider = Column(String, nullable=True) # e.g. "google", "apple"
    oauth_provider_id = Column(String, nullable=True) # ID from OAuth provider

    # Subscription & tokens
    subscription_plan = Column(Enum(SubscriptionPlan), default=SubscriptionPlan.free)
    token_balance = Column(Integer, default=300)  # e.g. 300 free tokens

    # Relationship to videos
    videos = relationship("Video", back_populates="owner")

    # Relationship to tasks & tags
    tasks = relationship("Task", back_populates="user", cascade="all, delete-orphan")
    tags = relationship("Tag", back_populates="user", cascade="all, delete-orphan")