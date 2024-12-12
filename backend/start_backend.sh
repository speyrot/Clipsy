#!/bin/bash

# Start Redis in the background
#redis-server &

# Start FastAPI Backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &

# Start Celery Worker
celery -A app.celery_app.celery worker --loglevel=info --pool=threads --concurrency=8 &

# Wait for all background processes to finish
wait