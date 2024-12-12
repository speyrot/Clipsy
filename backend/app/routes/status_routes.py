# app/routes/status_routes.py

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ProcessingJob
import logging

router = APIRouter()

# Initialize logger
logger = logging.getLogger(__name__)

@router.get("/status/{job_id}", summary="Get the status of a specific job")
async def get_job_status(job_id: int, db: Session = Depends(get_db)):
    job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    db.refresh(job)  # Ensure the job status is up-to-date
    
    logger.info(f"Job {job_id} status: {job.status}, progress: {job.progress}")
    
    response = JSONResponse({
        "job_id": job.id,
        "job_type": job.job_type.value,
        "status": job.status.value,
        "progress": job.progress,
        "processed_video_path": job.processed_video_path
    })
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    return response



