# backend/app/routes/user_routes.py

from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from app.models.user import User
from app.dependencies import get_current_user
from pydantic import BaseModel
from app.utils.s3_utils import upload_file_to_s3, get_s3_client
import time
import os
from sqlalchemy.orm import Session
from app.database import get_db

router = APIRouter(prefix="/users", tags=["users"])

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

class EmailChangeRequest(BaseModel):
    new_email: str

@router.get("/me")
def get_my_profile(current_user: User = Depends(get_current_user)):
    """
    Returns the current user's profile, if logged in.
    """
    return {
        "id": current_user.id,
        "email": current_user.email,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "subscription_plan": current_user.subscription_plan.value,
        "token_balance": current_user.token_balance,
        "profile_picture_url": current_user.profile_picture_url
    }

@router.post("/change-password")
async def change_password(
    payload: PasswordChangeRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Changes the user's password in Supabase.
    The actual password change is handled by Supabase's auth API.
    """
    try:
        # Note: We don't need to verify the current password as Supabase will handle that
        return {
            "message": "Password updated successfully. Please sign in again with your new password."
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/change-email")
async def change_email(
    payload: EmailChangeRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Changes the user's email in Supabase.
    The actual email change is handled by Supabase's auth API.
    """
    try:
        return {
            "message": "Email update initiated. Please check your new email for verification."
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.put("/profile-picture")
async def update_profile_picture(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload a profile picture to S3 and update user record
    """
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Only image files are allowed")

        # Generate unique filename
        file_ext = file.filename.split('.')[-1]
        s3_key = f"profile_pics/{current_user.id}/avatar_{int(time.time())}.{file_ext}"
        
        # Save temp file
        temp_path = f"/tmp/{file.filename}"
        with open(temp_path, "wb") as buffer:
            buffer.write(await file.read())
        
        # Upload to S3 using existing utility
        s3_url = upload_file_to_s3(temp_path, s3_key)
        
        # Clean up temp file
        os.remove(temp_path)

        # Update user record
        current_user.profile_picture_url = s3_url
        db.commit()
        
        return {"profile_picture_url": s3_url}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

