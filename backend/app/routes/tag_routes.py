# app/routes/tag_routes.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.task import Tag
from pydantic import BaseModel

router = APIRouter(prefix="/tags", tags=["tags"])

# Pydantic models for tag operations
class TagCreate(BaseModel):
    name: str

class TagRead(BaseModel):
    id: int
    name: str

    class Config:
        orm_mode = True

@router.post("/", response_model=TagRead)
def create_tag(
    tag_data: TagCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new tag for the current user."""
    # Check if tag already exists for this user
    existing_tag = db.query(Tag).filter(
        Tag.user_id == current_user.id,
        Tag.name.ilike(tag_data.name.strip())
    ).first()

    if existing_tag:
        return existing_tag

    # Create new tag
    new_tag = Tag(
        user_id=current_user.id,
        name=tag_data.name.strip()
    )
    db.add(new_tag)
    db.commit()
    db.refresh(new_tag)
    
    return new_tag

@router.get("/", response_model=List[TagRead])
def get_tags(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all tags belonging to the current user."""
    return db.query(Tag).filter(Tag.user_id == current_user.id).all()

@router.delete("/{tag_name}")
def delete_tag(
    tag_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a tag by name."""
    tag = db.query(Tag).filter(
        Tag.user_id == current_user.id,
        Tag.name == tag_name
    ).first()
    
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    db.delete(tag)
    db.commit()
    return {"message": f"Tag '{tag_name}' deleted"}
