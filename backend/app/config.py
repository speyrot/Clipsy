# app/config.py

import os
from pydantic_settings import BaseSettings  

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    CELERY_BROKER_URL: str
    CELERY_RESULT_BACKEND: str
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    class Config:
        env_file = ".env"  

settings = Settings()