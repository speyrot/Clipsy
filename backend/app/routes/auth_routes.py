# backend/app/routes/auth_routes.py

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, SubscriptionPlan
from app.utils.supabase import supabase
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from jose import JWTError, jwt
import os
from dotenv import load_dotenv

load_dotenv()

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-for-development")  # Change in production
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

router = APIRouter(prefix="/auth", tags=["auth"])

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    # Convert secret key to bytes if it's not already
    secret_key = os.getenv("JWT_SECRET_KEY", "your-secret-key-for-development")
    if isinstance(secret_key, str):
        secret_key = secret_key.encode()
    
    encoded_jwt = jwt.encode(to_encode, secret_key, algorithm=ALGORITHM)
    return encoded_jwt

# Request schemas
class SignUpRequest(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str

@router.post("/signup")
async def sign_up(payload: SignUpRequest, db: Session = Depends(get_db)):
    try:
        # First, create the user in Supabase
        supabase_response = supabase.auth.sign_up({
            "email": payload.email,
            "password": payload.password
        })
        
        # Log the response for debugging
        print("Supabase Response:", supabase_response)
        
        if not supabase_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create Supabase user"
            )
        
        # Check if user already exists in local DB
        existing_user = db.query(User).filter(User.email == payload.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
        
        # Create new user in local DB
        new_user = User(
            id=supabase_response.user.id,  # Use Supabase UUID
            email=payload.email,
            first_name=payload.first_name,
            last_name=payload.last_name,
            subscription_plan=SubscriptionPlan.free,
            token_balance=300
        )
        
        db.add(new_user)
        try:
            db.commit()
        except Exception as e:
            db.rollback()
            print("Database Error:", str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create user in database: {str(e)}"
            )
        
        return {
            "message": "User created successfully",
            "user": {
                "id": str(new_user.id),
                "email": new_user.email,
                "first_name": new_user.first_name,
                "last_name": new_user.last_name
            }
        }
        
    except Exception as e:
        print("Signup Error:", str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/signin")
async def sign_in(request: Request, db: Session = Depends(get_db)):
    try:
        # Get the raw request body
        body = await request.json()
        print("Received request body:", body)  # Debug log
        
        if 'access_token' not in body:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="access_token is required"
            )
            
        access_token = body['access_token']
        print("Access token received:", access_token)  # Debug log

        try:
            # Get user info from Supabase using the token
            print("Getting user from Supabase")  # Debug log
            user_response = supabase.auth.get_user(access_token)
            user_data = user_response.user
            print("Supabase user data:", user_data)  # Debug log
            
            if not user_data:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid Supabase token"
                )
            
            # Get or create user in your database
            user = db.query(User).filter(User.id == user_data.id).first()
            print("Existing user in DB:", user)  # Debug log
            
            if not user:
                print("Creating new user in DB")  # Debug log
                user = User(
                    id=user_data.id,
                    email=user_data.email,
                    first_name=user_data.user_metadata.get('first_name', ''),
                    last_name=user_data.user_metadata.get('last_name', ''),
                    subscription_plan=SubscriptionPlan.free,
                    token_balance=300
                )
                db.add(user)
                db.commit()
                db.refresh(user)

            # Generate a session token for your backend
            access_token = create_access_token(data={
                "sub": str(user.id),
                "email": user.email,
                "plan": user.subscription_plan.value
            })

            return {
                "message": "Signed in successfully",
                "token": access_token,
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "subscription_plan": user.subscription_plan.value,
                    "token_balance": user.token_balance
                }
            }
            
        except Exception as e:
            print("Supabase verification error:", str(e))  # Debug log
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Failed to verify Supabase token: {str(e)}"
            )
            
    except Exception as e:
        print("General signin error:", str(e))  # Debug log
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/signout")
async def sign_out():
    try:
        supabase.auth.sign_out()
        return {"message": "Signed out successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
