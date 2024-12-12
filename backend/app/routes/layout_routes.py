# backend/app/routes/layout_routes.py
 
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.layout_determination import get_scene_layouts
from app.models.video import Video  

router = APIRouter()

@router.post("/determine_layouts/{video_id}")
async def determine_layouts_endpoint(video_id: int, selected_speakers: list, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Assuming we have scene data and speakers per scene
    scenes = ["scene_1", "scene_2", "scene_3"]  # Placeholder example scenes
    speakers_per_scene = {
        "scene_1": [1, 2],
        "scene_2": [1, 2, 3],
        "scene_3": [3]
    }

    # Determine layouts for each scene based on selected speakers
    layouts = get_scene_layouts(scenes, speakers_per_scene, selected_speakers)
    
    return {"layouts": layouts}
