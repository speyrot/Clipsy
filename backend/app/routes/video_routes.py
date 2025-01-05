# backend/app/routes/video_routes.py

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
import logging
import re
from app.database import get_db
from app.models.video import Video
from app.models.user import User
from app.dependencies import get_current_user
from app.models.video import VideoStatus
from app.utils.s3_utils import get_s3_client
from app.config import settings
from pydantic import BaseModel


router = APIRouter(prefix="/videos", tags=["videos"])
logger = logging.getLogger(__name__)

class VideoRenameRequest(BaseModel):
    name: str

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
         "thumbnail_url": v.thumbnail_url,
         "status": v.status.value if v.status else None, 
         "name": v.name,
       }
       for v in user_videos
    ]

@router.delete("/{video_id}", summary="Delete the upload or processed video from the user's library.")
def delete_video_part(
    video_id: int,
    part: str = Query(..., enum=["upload", "processed", "both"]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete either the uploaded file, the processed file, or both.

    Query param `part` must be one of: "upload", "processed", or "both".

    Steps:
      1) Look up the Video by ID
      2) Check if current_user.id == video.user_id
      3) If part=upload => remove upload file from S3, set upload_path=None
      4) If part=processed => remove processed file from S3, set processed_path=None
      5) If both references are now None => remove the row + thumbnail
      6) Return success message or HTTP 404 if not found / not owned
    """
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video or video.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Video not found or not owned by user")

    s3_client = get_s3_client()
    bucket_name = settings.AWS_S3_BUCKET_NAME

    def delete_s3_object(url: str):
        if not url:
            return
        pattern = r"https://[^/]+/(.*)"  
        match = re.match(pattern, url)
        if match:
            key = match.group(1)
            logger.info(f"Deleting s3://{bucket_name}/{key}")
            s3_client.delete_object(Bucket=bucket_name, Key=key)
        else:
            logger.warning(f"Could not parse S3 key from URL: {url}")

    # If user wants to delete "upload" or "both":
    if part in ("upload", "both"):
        if video.upload_path:
            delete_s3_object(video.upload_path)
            video.upload_path = None

    # If user wants to delete "processed" or "both":
    if part in ("processed", "both"):
        if video.processed_path:
            delete_s3_object(video.processed_path)
            video.processed_path = None

    # If both references are None => remove entire row + thumbnail
    if (video.upload_path is None) and (video.processed_path is None):
        if video.thumbnail_url:
            delete_s3_object(video.thumbnail_url)
        db.delete(video)
        db.commit()
        return {"message": "Video entry removed completely."}
    else:
        # Just update the row. For example if the user only deleted the processed portion
        db.commit()
        return {"message": f"Successfully removed '{part}' from video ID {video.id}."}

@router.get("/{video_id}/download", summary="Download either the uploaded or processed video")
def download_video(
    video_id: int,
    part: str = Query(..., enum=["upload", "processed"]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate a pre-signed S3 URL (or direct link) to download the requested part:
    - part=upload => video.upload_path
    - part=processed => video.processed_path
    """
    # 1) Look up the Video by ID, ensure belongs to current_user
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video or video.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Video not found or not owned by user")

    # 2) Determine which S3 URL we need
    if part == "upload":
        if not video.upload_path:
            raise HTTPException(status_code=400, detail="No upload_path found for this video")
        s3_url = video.upload_path
    else:
        # part == "processed"
        if not video.processed_path:
            raise HTTPException(status_code=400, detail="No processed_path found for this video")
        s3_url = video.processed_path

    # 3) If your bucket is private, create a pre-signed URL so the user can download safely.
    #    If your bucket is already public, you might just return s3_url directly.
    s3_client = get_s3_client()
    pattern = r"https://[^/]+/(.*)"  
    match = re.match(pattern, s3_url)
    if not match:
        raise HTTPException(status_code=400, detail="S3 URL not in expected format")
    s3_key = match.group(1)

    # example: generate presigned GET URL, good for X minutes
    try:
        presigned = s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.AWS_S3_BUCKET_NAME, "Key": s3_key},
            ExpiresIn=60 * 10  # 10 minutes, for example
        )
    except Exception as e:
        logger.error(f"Error creating presigned URL for {s3_url}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate download link")

    return {"download_url": presigned}

@router.patch("/{video_id}/rename", summary="Rename a video")
def rename_video(
    video_id: int,
    payload: VideoRenameRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Renames the video to a new name provided by the user."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video or video.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Video not found or not owned by user")

    video.name = payload.name
    db.commit()
    db.refresh(video)
    
    return {
        "id": video.id,
        "name": video.name,
        "message": f"Video renamed to '{video.name}' successfully."
    }