"""add original upload path

Revision ID: xxxx
Revises: 20a80491f51f
Create Date: 2023-12-13 10:03:48.721

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'xxxx'
down_revision = '20a80491f51f'
branch_labels = None
depends_on = None

def upgrade():
    # Add the new column
    op.add_column('videos', sa.Column('original_upload_path', sa.String(), nullable=True))
    
    # Copy existing upload_path values to original_upload_path
    op.execute("""
        UPDATE videos 
        SET original_upload_path = upload_path 
        WHERE original_upload_path IS NULL
    """)
    
    # Make the column non-nullable after populating it
    op.alter_column('videos', 'original_upload_path',
                    existing_type=sa.String(),
                    nullable=False)

def downgrade():
    op.drop_column('videos', 'original_upload_path')