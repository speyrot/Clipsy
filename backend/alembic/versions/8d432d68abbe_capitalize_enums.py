"""capitalize enums

Revision ID: 8d432d68abbe
Revises: dde965956305
Create Date: 2025-01-20 01:41:08.207088+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8d432d68abbe'
down_revision: Union[str, None] = 'dde965956305'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
