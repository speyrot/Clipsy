# backend/app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import Base, engine
from app.models import Video, Speaker
from app.routes import upload_routes, detect_routes, process_routes, status_routes, layout_routes, processed_video_routes, auth_routes, user_routes, task_routes
import os

# Create tables
Base.metadata.create_all(bind=engine)

# Create thumbnails directory if it doesn't exist
os.makedirs("app/thumbnails", exist_ok=True)

app = FastAPI(title="Clipsy Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload_routes.router)
app.include_router(detect_routes.router)
app.include_router(process_routes.router)
app.include_router(status_routes.router)
app.include_router(layout_routes.router)
app.include_router(processed_video_routes.router)
app.include_router(auth_routes.router)
app.include_router(user_routes.router)
app.include_router(task_routes.router)

# Serve the thumbnails directory
app.mount("/thumbnails", StaticFiles(directory="app/thumbnails"), name="thumbnails")

@app.get("/")
async def read_root():
    return {"message": "Welcome to Clipsy API"}
