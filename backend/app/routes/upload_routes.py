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

# NEW IMPORTS for S3
from app.utils.s3_utils import upload_file_to_s3, delete_local_file
from app.dependencies import get_current_user  # <-- so we can get the logged-in user
from app.models.user import User               # <-- need this for type annotation

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
    """
    base, ext = os.path.splitext(input_path)
    cfr_path = base + "_cfr.mp4"

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
async def upload_video(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # <-- attach user
):
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    local_file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    logger.info(f"Starting upload for {file.filename}, will save as {unique_filename}")

    # 1. Save the uploaded file locally
    content = await file.read()
    with open(local_file_path, "wb") as buffer:
        buffer.write(content)
    logger.info(f"Saved uploaded file to {local_file_path}")

    # 2. (Optional) ffprobe
    run_ffprobe(local_file_path, label="after upload")

    # 3. Convert to CFR
    try:
        cfr_local_path = convert_to_cfr(local_file_path)
    except Exception as e:
        logger.error(f"Error converting video to CFR: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to convert video to constant frame rate.")
    logger.info(f"CFR conversion complete: {cfr_local_path}")

    run_ffprobe(cfr_local_path, label="after CFR conversion")

    # 4. Upload the CFR file to S3
    s3_key_cfr = f"videos/{unique_filename}_cfr.mp4"
    s3_url_cfr = upload_file_to_s3(cfr_local_path, s3_key_cfr)
    logger.info(f"Uploaded CFR file to S3 at key: {s3_key_cfr}. URL: {s3_url_cfr}")

    # (Optional) upload the original if desired
    # ...

    # 5. Create the Video entry in DB
    video = Video(
        user_id=current_user.id,           # <-- store user ID
        upload_path=s3_url_cfr,
        status=VideoStatus.uploaded
    )
    db.add(video)
    db.commit()
    db.refresh(video)
    logger.info(f"Created Video record ID={video.id} with upload_path={s3_url_cfr}, user_id={current_user.id}")

    # 6. Create a ProcessingJob
    processing_job = ProcessingJob(
        video_id=video.id,
        status=JobStatus.pending,
        progress=0.0,
        job_type=JobType.video_processing
    )
    db.add(processing_job)
    db.commit()
    db.refresh(processing_job)
    logger.info(f"Created ProcessingJob ID={processing_job.id} for video ID={video.id}")

    # 7. Trigger Celery task
    process_video_task.delay(video.id, processing_job.id)
    logger.info(f"process_video_task triggered for video ID={video.id}, job ID={processing_job.id}")

    # 8. Optionally delete local files
    delete_local_file(local_file_path)
    delete_local_file(cfr_local_path)

    return JSONResponse(
        content={"video_id": video.id, "job_id": processing_job.id},
        status_code=201
    )

@router.post("/upload_only", summary="Upload a video without processing")
async def upload_only(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # <-- attach user
):
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    local_file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    logger.info(f"(UploadOnly) Starting upload for {file.filename}, will save as {unique_filename}")

    # 1. Save file locally
    content = await file.read()
    with open(local_file_path, "wb") as buffer:
        buffer.write(content)
    logger.info(f"(UploadOnly) Saved file to {local_file_path}")

    # 2. Convert to CFR
    try:
        cfr_local_path = convert_to_cfr(local_file_path)
    except Exception as e:
        logger.error(f"(UploadOnly) Error converting to CFR: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to convert video to CFR.")

    # 3. Upload CFR file to S3
    s3_key_cfr = f"videos/{unique_filename}_cfr.mp4"
    s3_url_cfr = upload_file_to_s3(cfr_local_path, s3_key_cfr)
    logger.info(f"(UploadOnly) Uploaded CFR to S3: {s3_url_cfr}")

    # 4. Create Video record in DB with status=uploaded
    video = Video(
        user_id=current_user.id,           # <-- store user ID
        upload_path=s3_url_cfr,
        status=VideoStatus.uploaded
    )
    db.add(video)
    db.commit()
    db.refresh(video)
    logger.info(f"(UploadOnly) Created Video record ID={video.id}, user_id={current_user.id}")

    # (Optional) Clean up local files
    delete_local_file(local_file_path)
    delete_local_file(cfr_local_path)

    # 5. Return the video_id and S3 URL
    return {"video_id": video.id, "s3_url": s3_url_cfr}
