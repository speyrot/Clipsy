# backend/workers/video_worker.py

from app.celery_app import celery

if __name__ == "__main__":
    celery.start()
