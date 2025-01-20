"""synchronizing models

Revision ID: 15e4fd03147e
Revises: 8d432d68abbe
Create Date: 2025-01-20 01:56:02.619419+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '15e4fd03147e'
down_revision: Union[str, None] = '8d432d68abbe'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
