# backend/app/routes/process_routes.py

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List
from sqlalchemy.orm import Session
from app.models import Video, ProcessingJob, JobStatus, JobType
from app.services.video_processing import process_video_task
from app.database import get_db
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

class ProcessRequest(BaseModel):
    video_id: int
    selected_speakers: List[int]  # List of Speaker IDs

@router.post("/process_video", summary="Initiate Video Processing")
async def process_video_endpoint(request: ProcessRequest, db: Session = Depends(get_db)):
    """
    Endpoint to initiate the processing of a video.

    - **video_id**: ID of the video to process.
    - **selected_speakers**: List of Speaker IDs to focus on during processing.
    """
    # Retrieve the video from the database
    video = db.query(Video).filter(Video.id == request.video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Create a new ProcessingJob entry for video processing
    processing_job = ProcessingJob(
        video_id=video.id,
        status=JobStatus.pending,
        progress=0.0,
        job_type=JobType.video_processing
    )
    db.add(processing_job)
    db.commit()
    db.refresh(processing_job)  # Refresh to get the auto-generated ID
    
    # Initiate the Celery task
    try:
        logger.info(f"Triggering video processing task for video ID {video.id}")
        process_video_task.delay(
            job_id=processing_job.id,
            selected_speakers=request.selected_speakers
        )
        logger.info(f"Video processing task triggered successfully for video ID {video.id}")
    except Exception as e:
        logger.error(f"Error initiating video processing: {e}")
        raise HTTPException(status_code=500, detail=f"Error initiating video processing: {str(e)}")
    
    return {"job_id": processing_job.id}


class SimpleProcessRequest(BaseModel):
    video_id: int

@router.post("/process_video_simple")
async def process_video_simple(req: SimpleProcessRequest, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == req.video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    processing_job = ProcessingJob(
        video_id=video.id,
        status=JobStatus.pending,
        progress=0.0,
        job_type=JobType.video_processing
    )
    db.add(processing_job)
    db.commit()
    db.refresh(processing_job)

    process_video_task.delay(video.id, processing_job.id)
    return {"job_id": processing_job.id}
