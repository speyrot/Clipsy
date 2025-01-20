# app/config.py

import os
from pydantic_settings import BaseSettings  

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    CELERY_BROKER_URL: str
    CELERY_RESULT_BACKEND: str
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    AWS_ACCESS_KEY_ID: str
    AWS_SECRET_ACCESS_KEY: str
    AWS_S3_BUCKET_NAME: str
    AWS_S3_REGION: str = "us-east-1"
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_SERVICE_KEY: str 
    JWT_SECRET: str

    class Config:
        env_file = ".env"  

settings = Settings()