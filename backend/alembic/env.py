# backend/alembic/env.py

from logging.config import fileConfig
import os
import sys
from sqlalchemy import engine_from_config, pool
from alembic import context
from dotenv import load_dotenv

# Load the environment variables from the .env file
load_dotenv()

# Add the backend directory to sys.path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# This is the Alembic Config object
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Import your Base class and all models here
from app.models.base import Base
from app.models.task import Task, Tag
from app.models.user import User
from app.models.video import Video
from app.models.processing_job import ProcessingJob


# Set target_metadata for 'autogenerate' to work
target_metadata = Base.metadata

# Fetch the database URL from environment or alembic.ini
db_url = os.getenv("DATABASE_URL", config.get_main_option("sqlalchemy.url"))

# Ensure db_url is a string, raise an error if not
if not isinstance(db_url, str):
    raise TypeError("The database URL must be a string.")

# Set the sqlalchemy.url option for alembic
config.set_main_option("sqlalchemy.url", db_url)


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
