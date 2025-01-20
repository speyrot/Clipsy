"""add missing video columns

Revision ID: add_missing_video_columns
Revises: aa40a03db377
Create Date: 2024-01-18 15:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_missing_video_columns'
down_revision = 'aa40a03db377'
branch_labels = None
depends_on = None

def upgrade():
    # Create VideoStatus enum
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'videostatus') THEN
                CREATE TYPE videostatus AS ENUM ('UPLOADED', 'PROCESSING', 'PROCESSED', 'FAILED');
            END IF;
        END$$;
    """)
    
    # Add missing columns to videos table
    op.add_column('videos', sa.Column('name', sa.String(), nullable=True))
    op.add_column('videos', sa.Column('upload_path', sa.String(), nullable=True))
    op.add_column('videos', sa.Column('processed_path', sa.String(), nullable=True))
    op.add_column('videos', sa.Column('thumbnail_url', sa.String(), nullable=True))
    op.add_column('videos', sa.Column('status', sa.Enum('UPLOADED', 'PROCESSING', 'PROCESSED', 'FAILED', name='videostatus'), nullable=True))

def downgrade():
    # Remove columns in reverse order
    op.drop_column('videos', 'status')
    op.drop_column('videos', 'thumbnail_url')
    op.drop_column('videos', 'processed_path')
    op.drop_column('videos', 'upload_path')
    op.drop_column('videos', 'name')
    # Drop the enum type
    op.execute('DROP TYPE IF EXISTS videostatus') 