# backend/app/database.py

from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.models.base import Base
from typing import Generator

# SQLAlchemy setup
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_size=20,
    max_overflow=0
)

# Set 'expire_on_commit' to True to ensure instances are refreshed after commit
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=True  # Ensure this is set to True
)

# Set the isolation level to READ COMMITTED
@event.listens_for(engine, "connect")
def set_isolation_level(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("SET SESSION CHARACTERISTICS AS TRANSACTION ISOLATION LEVEL READ COMMITTED")
    cursor.close()

def get_db() -> Generator:
    """
    Provides a transactional scope around a series of operations.
    This is a generator function that yields a SQLAlchemy Session.
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except:
        db.rollback()
        raise
    finally:
        db.close()
