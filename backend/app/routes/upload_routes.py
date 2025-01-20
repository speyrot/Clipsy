# backend/app/routes/upload_routes.py

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import os
import uuid
import subprocess
import logging

from app.config import settings
from app.database import get_db
from app.models import Video, ProcessingJob, VideoStatus, JobStatus, JobType
from app.services.video_processing import process_video_task
from app.utils.video_utils import get_frame_at_time
from PIL import Image

# NEW IMPORTS for S3
from app.utils.s3_utils import upload_file_to_s3, delete_local_file
from app.dependencies import get_current_user  # <-- so we can get the logged-in user
from app.models.user import User               # <-- need this for type annotation

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

def generate_and_upload_thumbnail(video_path: str, s3_key_prefix: str) -> str:
    """
    Grabs one frame from the given video_path, generates a small thumbnail,
    uploads it to S3, and returns the S3 URL.
    """
    # let's pick 0.5 second in
    frame_time_sec = 0.5
    frame = get_frame_at_time(video_path, frame_time_sec)
    if frame is None:
        logger.warning(f"No frame found at {frame_time_sec}s for {video_path}, using fallback 0.0s")
        frame = get_frame_at_time(video_path, 0.0)
        if frame is None:
            logger.error("Cannot generate thumbnail because no frame was extracted.")
            return None

    # Convert numpy array -> PIL
    pil_image = Image.fromarray(frame)

    # Create local temp path
    thumbnail_local = video_path.rsplit('.', 1)[0] + "_thumb.jpg"
    # Let’s do 256x256 for example
    pil_image.thumbnail((256, 256))
    pil_image.save(thumbnail_local, format="JPEG")

    # Upload to S3
    s3_key_thumb = f"{s3_key_prefix}_thumb.jpg"
    s3_url_thumb = upload_file_to_s3(thumbnail_local, s3_key_thumb)
    delete_local_file(thumbnail_local)

    return s3_url_thumb

@router.post("/upload", summary="Upload a new video")
async def upload_video(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
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
    try:
        s3_url_cfr = upload_file_to_s3(cfr_local_path, s3_key_cfr)
        logger.info(f"Uploaded CFR file to S3 at key: {s3_key_cfr}. URL: {s3_url_cfr}")
    except Exception as e:
        logger.error(f"Failed to upload CFR file to S3: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to upload video to storage.")

    # 5. Generate thumbnail before creating Video entry
    thumbnail_url = generate_and_upload_thumbnail(
        cfr_local_path,
        f"thumbnails/{unique_filename}"
    )
    if not thumbnail_url:
        logger.warning("Thumbnail generation failed. Proceeding without thumbnail.")

    # 6. Create the Video entry in DB
    video = Video(
        owner_id=current_user.id,  # Corrected from user_id to owner_id
        upload_path=s3_url_cfr,
        status=VideoStatus.UPLOADED,
        thumbnail_url=thumbnail_url,
        name=file.filename  # Setting the name field
    )
    db.add(video)
    try:
        db.commit()
        db.refresh(video)
        logger.info(f"Created Video record ID={video.id} with upload_path={s3_url_cfr}, owner_id={current_user.id}")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to save video to database: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to save video to database.")

    # 7. Create a ProcessingJob
    processing_job = ProcessingJob(
        video_id=video.id,
        status=JobStatus.PENDING,
        progress=0.0,
        job_type=JobType.VIDEO_PROCESSING
    )
    db.add(processing_job)
    try:
        db.commit()
        db.refresh(processing_job)
        logger.info(f"Created ProcessingJob ID={processing_job.id} for Video ID={video.id}")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create ProcessingJob: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to create processing job.")

    # 8. Trigger Celery task
    try:
        process_video_task.delay(video.id, processing_job.id)
        logger.info(f"Triggered process_video_task for Video ID={video.id}, Job ID={processing_job.id}")
    except Exception as e:
        logger.error(f"Failed to trigger Celery task: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to initiate video processing.")

    # 9. Optionally delete local files
    try:
        delete_local_file(local_file_path)
        delete_local_file(cfr_local_path)
        logger.info(f"Deleted local files: {local_file_path}, {cfr_local_path}")
    except Exception as e:
        logger.warning(f"Failed to delete local files: {e}", exc_info=True)

    return JSONResponse(
        content={
            "video_id": video.id, 
            "job_id": processing_job.id,
            "thumbnail_url": thumbnail_url,  # Include thumbnail URL in response
            "filename": file.filename  # Include original filename
        },
        status_code=201
    )

@router.post("/upload_only", summary="Upload a video without processing")
async def upload_only(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    logger.info(f"Upload attempt by user: {current_user.id if current_user else 'No user'}")
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
    try:
        s3_url_cfr = upload_file_to_s3(cfr_local_path, s3_key_cfr)
        logger.info(f"(UploadOnly) Uploaded CFR to S3: {s3_url_cfr}")
    except Exception as e:
        logger.error(f"(UploadOnly) Failed to upload CFR to S3: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to upload video to storage.")

    # 4. Generate thumbnail
    thumbnail_url = generate_and_upload_thumbnail(
        cfr_local_path,
        f"thumbnails/{unique_filename}",  # e.g., place thumbs in a 'thumbnails' folder in S3
    )
    if not thumbnail_url:
        logger.warning("(UploadOnly) Thumbnail generation failed. Proceeding without thumbnail.")

    # 5. Create Video row
    video = Video(
        owner_id=current_user.id,  # Corrected from user_id to owner_id
        upload_path=s3_url_cfr,
        status=VideoStatus.UPLOADED.value,  # Use .value to get "uploaded"
        thumbnail_url=thumbnail_url,
        name=file.filename  
    )
    db.add(video)
    try:
        db.commit()
        db.refresh(video)
        logger.info(f"(UploadOnly) Created Video record ID={video.id}, owner_id={current_user.id}")
    except Exception as e:
        db.rollback()
        logger.error(f"(UploadOnly) Failed to save video to database: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to save video to database.")

    # (Optional) Clean up local files
    try:
        delete_local_file(local_file_path)
        delete_local_file(cfr_local_path)
        logger.info(f"(UploadOnly) Deleted local files: {local_file_path}, {cfr_local_path}")
    except Exception as e:
        logger.warning(f"(UploadOnly) Failed to delete local files: {e}", exc_info=True)

    # 6. Return the video_id, S3 URL, and thumbnail URL
    return {
        "video_id": video.id, 
        "s3_url": s3_url_cfr,
        "thumbnail_url": thumbnail_url,  
        "name": file.filename  
    }