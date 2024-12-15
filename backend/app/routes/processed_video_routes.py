from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
import os
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/processed_video/{video_id}")
async def get_processed_video(video_id: str):
    # Handle both full path and just filename cases
    if os.path.isfile(video_id):
        video_path = video_id
    else:
        video_path = f"uploads/{video_id}"
        if not video_path.endswith('_cfr_processed.mp4'):
            video_path = f"{video_path}_cfr_processed.mp4"

    logger.info(f"Attempting to serve video from path: {video_path}")
    if not os.path.exists(video_path):
        logger.error(f"Video file not found at path: {video_path}")
        raise HTTPException(status_code=404, detail="Processed video not found")
    return FileResponse(video_path, media_type="video/mp4") 