# app/routes/tag_routes.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.task import Tag

router = APIRouter(prefix="/tags", tags=["tags"])

@router.get("/", response_model=List[str])
def get_tags(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Return all tags for the current user (just the tag names).
    """
    user_tags = db.query(Tag).filter(Tag.user_id == current_user.id).all()
    return [tag.name for tag in user_tags]

@router.delete("/{tag_name}")
def delete_tag(
    tag_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a tag and remove it from all tasks that were using it.
    """
    # Find the tag
    tag = db.query(Tag).filter(
        Tag.name == tag_name,
        Tag.user_id == current_user.id
    ).first()
    
    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag not found"
        )
    
    # Delete the tag
    db.delete(tag)
    db.commit()
    
    return {"message": "Tag deleted successfully"}
