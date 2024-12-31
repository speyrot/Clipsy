# backend/app/routes/processed_video_routes.py

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import logging
import os

from app.database import get_db
from app.models import ProcessingJob, JobType

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/processed_video/{video_id}")
def get_processed_video(video_id: int, db: Session = Depends(get_db)):
    """
    Return the S3 URL for the processed video (or 404 if not found).
    """
    processing_job = db.query(ProcessingJob).filter(
        ProcessingJob.video_id == video_id,
        ProcessingJob.job_type == JobType.video_processing
    ).first()

    if not processing_job or not processing_job.processed_video_path:
        logger.error(f"No processed video found for video_id={video_id}")
        raise HTTPException(status_code=404, detail="Processed video not found")

    logger.info(f"Returning processed video S3 URL for video_id={video_id}: {processing_job.processed_video_path}")
    return JSONResponse({"processed_video_url": processing_job.processed_video_path})
