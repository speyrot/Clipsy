# app/routes/user_routes.py
from fastapi import APIRouter, Depends
from app.models.user import User
from app.dependencies import get_current_user

router = APIRouter(prefix="/users", tags=["users"])

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
