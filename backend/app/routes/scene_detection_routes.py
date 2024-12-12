# backend/app/routes/scene_detection_routes.py

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database import get_db  # Updated import
from app.models import Video
from app.services.scene_detection import detect_scenes

router = APIRouter()

@router.post("/detect_scenes/{video_id}", summary="Detect Scenes in a Video")
async def detect_scenes_endpoint(video_id: int, db: Session = Depends(get_db)):
    """
    Endpoint to detect scenes in a video.

    - **video_id**: ID of the video to analyze.
    """
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    scene_timestamps = detect_scenes(video_id, video.upload_path, db)
    
    return {"scenes": scene_timestamps}

