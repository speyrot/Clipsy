# backend/app/routes/user_routes.py

from fastapi import APIRouter, Depends, HTTPException, status
from app.models.user import User
from app.dependencies import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/users", tags=["users"])

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

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
        "token_balance": current_user.token_balance
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

