"""updates video status in video model

Revision ID: dde965956305
Revises: add_missing_video_columns
Create Date: 2025-01-20 00:59:25.488963+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'dde965956305'
down_revision: Union[str, None] = 'add_missing_video_columns'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
