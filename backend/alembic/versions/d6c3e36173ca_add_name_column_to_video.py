"""Add name column to Video

Revision ID: d6c3e36173ca
Revises: 95a1912a9bdc
Create Date: 2025-01-05 01:00:25.657291+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd6c3e36173ca'
down_revision: Union[str, None] = '95a1912a9bdc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add the name column to videos table
    op.add_column('videos', sa.Column('name', sa.String(), nullable=True))


def downgrade() -> None:
    # Remove the name column if we need to rollback
    op.drop_column('videos', 'name')
