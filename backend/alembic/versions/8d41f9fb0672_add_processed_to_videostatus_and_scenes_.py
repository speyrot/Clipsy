"""Add 'processed' to videostatus and 'scenes_detected' to jobstatus enums

Revision ID: 8d41f9fb0672
Revises: 15e4fd03147e
Create Date: 2025-01-20 02:13:21.633953+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8d41f9fb0672'
down_revision: Union[str, None] = '15e4fd03147e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # Add 'processed' to videostatus
    op.execute("ALTER TYPE videostatus ADD VALUE 'processed';")
    
    # Add 'scenes_detected' to jobstatus
    op.execute("ALTER TYPE jobstatus ADD VALUE 'scenes_detected';")

def downgrade():
    raise NotImplementedError("Downgrade not supported for enum changes.")