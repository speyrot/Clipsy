# app/models/task.py

import enum
from typing import List, Optional
from pydantic import BaseModel
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Enum,
    ForeignKey,
    DateTime,
    func,
    Table
)
from sqlalchemy.orm import relationship
from .base import Base

# --------------------------------------------------------------------
# 1. Define an enum for TaskStatus
# --------------------------------------------------------------------
class TaskStatus(enum.Enum):
    unassigned = "unassigned"
    todo = "todo"
    in_progress = "in_progress"
    done = "done"

# --------------------------------------------------------------------
# 2. The join table for many-to-many (Tasks <-> Tags)
# --------------------------------------------------------------------
task_tags = Table(
    "task_tags",
    Base.metadata,
    Column("task_id", Integer, ForeignKey("tasks.id"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id"), primary_key=True),
)

# --------------------------------------------------------------------
# 3. SQLAlchemy Task model
# --------------------------------------------------------------------
class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(TaskStatus), default=TaskStatus.todo)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    user = relationship("User", back_populates="tasks")
    tags = relationship("Tag", secondary=task_tags, back_populates="tasks")

# --------------------------------------------------------------------
# 4. SQLAlchemy Tag model
# --------------------------------------------------------------------
class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)

    user = relationship("User", back_populates="tags")
    tasks = relationship("Task", secondary=task_tags, back_populates="tags")

# --------------------------------------------------------------------
# 5. Pydantic Schemas (all in the same file)
# --------------------------------------------------------------------
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
        orm_mode = True
