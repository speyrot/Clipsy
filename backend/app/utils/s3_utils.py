# app/utils/s3_utils.py

import boto3
from botocore.exceptions import ClientError
import os
import re
import logging
from app.config import settings
from fastapi import HTTPException

logger = logging.getLogger(__name__)

def get_s3_client():
    return boto3.client(
        "s3",
        region_name=settings.AWS_S3_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
    )

def upload_file_to_s3(local_path: str, s3_key: str) -> str:
    """
    Uploads a file to S3 and returns the S3 URL.
    """
    s3_client = boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION,
    )

    bucket = settings.AWS_S3_BUCKET_NAME

    logger.info(f"Uploading {local_path} to s3://{bucket}/{s3_key}")
    try:
        # Remove ACL from upload logic
        s3_client.upload_file(local_path, bucket, s3_key)
    except Exception as e:
        logger.error(f"Error uploading file to S3: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to upload file to S3.")

    s3_url = f"https://{bucket}.s3.amazonaws.com/{s3_key}"
    logger.info(f"Successfully uploaded to S3. S3 URL: {s3_url}")
    return s3_url

def delete_local_file(path: str):
    """Utility to safely delete a local file."""
    if os.path.exists(path):
        logger.info(f"Deleting local file: {path}")
        os.remove(path)

def download_s3_to_local(s3_url: str, local_path: str):
    """
    Download a file from S3 to a local path.
    s3_url expected like: https://my-bucket.s3.amazonaws.com/videos/xxx_cfr.mp4
    """
    s3_client = get_s3_client()

    pattern = r"https://(.*)\.s3\.amazonaws\.com/(.*)"
    match = re.match(pattern, s3_url)
    if not match:
        logger.error(f"S3 URL {s3_url} not in expected format.")
        raise ValueError(f"URL {s3_url} is not in expected S3 format")

    bucket = match.group(1)
    key = match.group(2)

    logger.info(f"Downloading from s3://{bucket}/{key} to local file {local_path}")
    try:
        s3_client.download_file(bucket, key, local_path)
        logger.info(f"Successfully downloaded {s3_url} to {local_path}")
    except ClientError as e:
        logger.error(f"Error downloading from S3: {e}", exc_info=True)
        raise