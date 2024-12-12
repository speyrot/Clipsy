"""Add job_type to ProcessingJob

Revision ID: 5326b206dd2a
Revises: 9f1d8e2298b5
Create Date: 2024-10-13 23:57:05.048538+00:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


# revision identifiers, used by Alembic.
revision: str = '5326b206dd2a'
down_revision: Union[str, None] = '9f1d8e2298b5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def column_exists(table_name: str, column_name: str) -> bool:
    """Utility function to check if a column exists in a table."""
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade() -> None:
    # Check if 'job_type' exists before adding it
    if not column_exists('processing_jobs', 'job_type'):
        op.add_column('processing_jobs', sa.Column('job_type', sa.Enum('speaker_detection', 'video_processing', name='jobtype'), nullable=False))

    # Check if 'processed_video_path' exists before adding it
    if not column_exists('processing_jobs', 'processed_video_path'):
        op.add_column('processing_jobs', sa.Column('processed_video_path', sa.String(), nullable=True))


def downgrade() -> None:
    # Check if 'processed_video_path' exists before trying to drop it
    if column_exists('processing_jobs', 'processed_video_path'):
        op.drop_column('processing_jobs', 'processed_video_path')

    # Check if 'job_type' exists before trying to drop it
    if column_exists('processing_jobs', 'job_type'):
        op.drop_column('processing_jobs', 'job_type')
