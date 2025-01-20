# backend/app/middleware/auth.py

from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from datetime import datetime
import os

security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    try:
        token = credentials.credentials
        # Convert secret key to bytes if it's not already
        secret_key = os.getenv("JWT_SECRET_KEY", "your-secret-key-for-development")
        if isinstance(secret_key, str):
            secret_key = secret_key.encode()
            
        payload = jwt.decode(
            token, 
            secret_key,
            algorithms=["HS256"]
        )
        
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials"
            )
            
        return payload
        
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )