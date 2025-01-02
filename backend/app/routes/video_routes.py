# backend/app/routes/video_routes.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.video import Video
from app.models.user import User
from app.dependencies import get_current_user
from app.models.video import VideoStatus

router = APIRouter(prefix="/videos", tags=["videos"])

@router.get("/", summary="List user's videos")
def list_user_videos(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Return all videos belonging to the current user."""
    user_videos = db.query(Video).filter(Video.user_id == current_user.id).all()
    # Optionally transform to a dict or Pydantic model
    # for front-end convenience.
    return [
       {
         "id": v.id,
         "upload_path": v.upload_path,
         "processed_path": v.processed_path,
         "status": v.status.value if v.status else None,
         "filename": "",  # if you stored original filename somewhere
       }
       for v in user_videos
    ]
