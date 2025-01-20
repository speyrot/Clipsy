# backend/app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.models.base import Base
from app.database import engine
from app.models import Video, Speaker
from app.routes import (
    upload_routes, 
    detect_routes, 
    process_routes, 
    status_routes, 
    layout_routes, 
    processed_video_routes, 
    auth_routes, 
    user_routes, 
    task_routes, 
    tag_routes, 
    video_routes
)
import os
import logging

# Create tables
Base.metadata.create_all(bind=engine)

# Create thumbnails directory if it doesn't exist
os.makedirs("app/thumbnails", exist_ok=True)

app = FastAPI(title="Clipsy Backend")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Update this to your frontend's actual URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers
app.include_router(upload_routes.router)
app.include_router(detect_routes.router)
app.include_router(process_routes.router)
app.include_router(status_routes.router)
app.include_router(layout_routes.router)
app.include_router(processed_video_routes.router)
app.include_router(auth_routes.router)
app.include_router(user_routes.router)
app.include_router(task_routes.router)
app.include_router(tag_routes.router)
app.include_router(video_routes.router)

# Serve the thumbnails directory
app.mount("/thumbnails", StaticFiles(directory="app/thumbnails"), name="thumbnails")

@app.get("/")
async def read_root():
    return {"message": "Welcome to Clipsy API"}

# Optional: Configure logging
logging.basicConfig(level=logging.INFO)
