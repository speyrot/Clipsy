# backend/app/celery_app.py

from celery import Celery
from app.config import settings
import logging

# Initialize Celery
celery = Celery(
    "clipsy",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

# Celery Configuration Options
celery.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    worker_concurrency=8, 
    broker_connection_retry_on_startup=True,  
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)

# Autodiscover tasks from the 'app.services' package
celery.autodiscover_tasks(['app.services'])
