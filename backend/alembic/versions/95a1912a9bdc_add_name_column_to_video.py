"""Add name column to Video

Revision ID: 95a1912a9bdc
Revises: 59a1e6e11da0
Create Date: 2025-01-05 00:24:41.746766+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '95a1912a9bdc'
down_revision: Union[str, None] = '59a1e6e11da0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
