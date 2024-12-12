# app/routes/detect_routes.py

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Video, Speaker
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/detect_speakers/{video_id}", summary="Get detected speakers for a video")
async def get_detected_speakers(video_id: int, db: Session = Depends(get_db)):
    """
    Endpoint to retrieve detected speakers for a given video.
    """
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        logger.error(f"Video with ID {video_id} not found.")
        raise HTTPException(status_code=404, detail="Video not found")
    
    speakers = db.query(Speaker).filter(Speaker.video_id == video_id).all()
    if not speakers:
        logger.warning(f"No speakers found for video ID {video_id}.")
        return {"speakers": []}

    # Prepare speaker data
    speaker_data = []
    for speaker in speakers:
        speaker_info = {
            "id": speaker.id,
            "thumbnail_path": speaker.thumbnail_path
        }
        speaker_data.append(speaker_info)

    logger.info(f"Retrieved {len(speaker_data)} speakers for video ID {video_id}.")
    return {"speakers": speaker_data}