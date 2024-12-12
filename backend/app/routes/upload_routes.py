# backend/app/routes/upload_routes.py

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import os
import uuid
from app.config import settings
from app.database import get_db
from app.models import Video, ProcessingJob, VideoStatus, JobStatus, JobType
from app.services.video_processing import detect_speakers_task
import logging

router = APIRouter()

# Initialize logger
logger = logging.getLogger(__name__)

UPLOAD_DIR = os.path.join(settings.BASE_DIR, "uploads")
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

@router.post("/upload", summary="Upload a new video")
async def upload_video(file: UploadFile = File(...), db: Session = Depends(get_db)):
    # Save the uploaded video
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)

    # Create a new Video entry in the database
    video = Video(upload_path=file_path, status=VideoStatus.uploaded)
    db.add(video)
    db.commit()
    db.refresh(video)  # Refresh to get the latest video data

    # Create a ProcessingJob entry for speaker detection
    processing_job = ProcessingJob(
        video_id=video.id,
        status=JobStatus.pending,
        progress=0.0,
        job_type=JobType.speaker_detection
    )
    db.add(processing_job)
    db.commit()
    db.refresh(processing_job)  # Refresh to get the latest job data

    # Asynchronously detect speakers
    try:
        logger.info(f"Triggering speaker detection task for video ID {video.id}")
        detect_speakers_task.delay(video.id, file_path, processing_job.id)
        logger.info(f"Speaker detection task triggered successfully for video ID {video.id}")
    except Exception as e:
        logger.error(f"Error in detecting speakers: {e}")
        raise HTTPException(status_code=500, detail=f"Error in detecting speakers: {str(e)}")
    
    return JSONResponse(content={"video_id": video.id, "job_id": processing_job.id}, status_code=201)

@router.get("/processing_status/{video_id}", summary="Check the processing status of a video")
async def check_processing_status(video_id: int, db: Session = Depends(get_db)):
    # Retrieve the video
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    db.refresh(video)  # Refresh to get the latest data

    # Retrieve all jobs for this video
    processing_jobs = db.query(ProcessingJob).filter(ProcessingJob.video_id == video_id).all()
    if not processing_jobs:
        raise HTTPException(status_code=404, detail="Processing jobs not found")

    # Prepare job status data
    jobs_status = []
    for job in processing_jobs:
        db.refresh(job)  # Refresh to get the latest data
        job_info = {
            "job_id": job.id,
            "job_type": job.job_type.value,
            "status": job.status.value,
            "progress": job.progress
        }
        jobs_status.append(job_info)

    logger.info(f"Video status check for ID {video_id}: {video.status.value}, Jobs status: {jobs_status}")

    # Return video status and jobs status in response
    response = JSONResponse(content={
        "video_status": video.status.value,
        "jobs_status": jobs_status
    }, status_code=200)
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    
    return response
