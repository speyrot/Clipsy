# backend/app/routes/upload_routes.py

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import os
import uuid
import subprocess
from app.config import settings
from app.database import get_db
from app.models import Video, ProcessingJob, VideoStatus, JobStatus, JobType
from app.services.video_processing import process_video_task
import logging

router = APIRouter()

logger = logging.getLogger(__name__)

UPLOAD_DIR = os.path.join(settings.BASE_DIR, "uploads")
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

def run_ffprobe(video_path: str, label: str = ""):
    try:
        cmd = [
            "ffprobe", "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=width,height,duration,nb_frames,r_frame_rate",
            "-of", "default=noprint_wrappers=1", video_path
        ]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        logger.info(f"ffprobe {label} for {video_path}:\n{result.stdout.strip()}")
    except Exception as e:
        logger.error(f"Error running ffprobe {label} on {video_path}: {e}", exc_info=True)

def convert_to_cfr(input_path: str) -> str:
    """
    Convert the uploaded video to a constant frame rate (CFR) version.
    We'll choose a standard frame rate like 30 fps, or read from ffprobe if needed.
    For simplicity, let's pick 30 fps.
    """
    base, ext = os.path.splitext(input_path)
    cfr_path = base + "_cfr.mp4"

    # Choose a CFR frame rate. 30 is a common standard. You could also use 29.97.
    desired_fps = "30"

    cmd = [
        "ffmpeg", "-y", "-i", input_path,
        "-r", desired_fps,
        "-pix_fmt", "yuv420p",
        cfr_path
    ]
    logger.info(f"Running ffmpeg to convert {input_path} to CFR at {desired_fps} fps.")
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.returncode != 0:
        logger.error(f"ffmpeg CFR conversion failed: {result.stderr}")
        raise RuntimeError("Failed to convert video to CFR.")
    
    logger.info(f"CFR conversion successful: {cfr_path}")
    return cfr_path

@router.post("/upload", summary="Upload a new video")
async def upload_video(file: UploadFile = File(...), db: Session = Depends(get_db)):
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    logger.info(f"Starting upload for {file.filename}, will save as {unique_filename}")

    content = await file.read()
    size = len(content)
    logger.info(f"Read {size} bytes from uploaded file {file.filename}")

    with open(file_path, "wb") as buffer:
        buffer.write(content)
    
    disk_size = os.path.getsize(file_path)
    logger.info(f"Wrote {disk_size} bytes to {file_path}")
    if disk_size != size:
        logger.warning(f"Disk size ({disk_size}) does not match read size ({size})")

    # Check original file details
    run_ffprobe(file_path, label="after upload")

    # Convert to CFR
    try:
        cfr_path = convert_to_cfr(file_path)
    except Exception as e:
        logger.error(f"Error converting video to CFR: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to convert video to constant frame rate.")

    # Run ffprobe on CFR file
    run_ffprobe(cfr_path, label="after CFR conversion")

    # Create video entry
    video = Video(
        upload_path=cfr_path,
        status=VideoStatus.uploaded
    )
    db.add(video)
    db.commit()
    db.refresh(video)

    # Create processing job directly for video processing
    processing_job = ProcessingJob(
        video_id=video.id,
        status=JobStatus.pending,
        progress=0.0,
        job_type=JobType.video_processing
    )
    db.add(processing_job)
    db.commit()
    db.refresh(processing_job)

    # Trigger video processing directly
    process_video_task.delay(video.id, processing_job.id)
    logger.info(f"Video processing task triggered for video ID {video.id}")

    return JSONResponse(
        content={"video_id": video.id, "job_id": processing_job.id},
        status_code=201
    )

@router.get("/processing_status/{video_id}", summary="Check the processing status of a video")
async def check_processing_status(video_id: int, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    db.refresh(video)

    processing_jobs = db.query(ProcessingJob).filter(ProcessingJob.video_id == video_id).all()
    if not processing_jobs:
        raise HTTPException(status_code=404, detail="Processing jobs not found")

    jobs_status = []
    for job in processing_jobs:
        db.refresh(job)
        job_info = {
            "job_id": job.id,
            "job_type": job.job_type.value,
            "status": job.status.value,
            "progress": job.progress
        }
        jobs_status.append(job_info)

    logger.info(f"Video status check for ID {video_id}: {video.status.value}, Jobs status: {jobs_status}")
    response = JSONResponse(content={
        "video_status": video.status.value,
        "jobs_status": jobs_status
    }, status_code=200)
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    return response
