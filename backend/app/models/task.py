# app/models/task.py

import enum
from typing import List, Optional
from pydantic import BaseModel
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Enum as SQLEnum,
    ForeignKey,
    DateTime,
    func,
    Table
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import Base
import uuid

# Define an enum for TaskStatus
class TaskStatus(enum.Enum):
    unassigned = "unassigned"
    todo = "todo"
    in_progress = "in_progress"
    done = "done"

# The join table for many-to-many (Tasks <-> Tags)
task_tags = Table(
    "task_tags",
    Base.metadata,
    Column("task_id", Integer, ForeignKey("tasks.id"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id"), primary_key=True),
)

# SQLAlchemy Task model
class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)  # UUID type
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)  # Now not nullable
    status = Column(SQLEnum(TaskStatus), default=TaskStatus.todo, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="tasks")
    tags = relationship("Tag", secondary=task_tags, back_populates="tasks")

# SQLAlchemy Tag model
class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)  # UUID type
    name = Column(String, nullable=False)

    user = relationship("User", back_populates="tags")
    tasks = relationship("Task", secondary=task_tags, back_populates="tags")

# Pydantic Schemas
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: TaskStatus
    tags: List[str] = []

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    tags: Optional[List[str]] = None

class TaskRead(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    status: TaskStatus
    tags: List[str]

    class Config:
        from_attributes = True  # Updated for Pydantic v2
