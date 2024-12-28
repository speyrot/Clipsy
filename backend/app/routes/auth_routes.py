# app/routes/auth_routes.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.utils.security import hash_password, verify_password, create_access_token
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="/auth", tags=["auth"])

# Request schemas
class SignUpRequest(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str

class SignInRequest(BaseModel):
    email: EmailStr
    password: str

@router.post("/signup")
def sign_up(payload: SignUpRequest, db: Session = Depends(get_db)):
    # Check if user with this email already exists
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists."
        )

    # Create new user
    new_user = User(
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        token_balance=300  # or some default
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "User created successfully"}

@router.post("/signin")
def sign_in(payload: SignInRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not user.password_hash:
        raise HTTPException(status_code=400, detail="Invalid credentials.")

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Invalid credentials.")

    # Generate JWT
    access_token = create_access_token({"sub": str(user.id)})

    return {
        "message": "Signed in successfully",
        "access_token": access_token,
        "token_type": "bearer"
    }
