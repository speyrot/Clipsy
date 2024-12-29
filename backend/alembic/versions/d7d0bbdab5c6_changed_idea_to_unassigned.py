"""changed idea to unassigned

Revision ID: d7d0bbdab5c6
Revises: 5de29aa97826
Create Date: 2024-12-29 04:25:30.832077+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import Enum


# revision identifiers, used by Alembic.
revision: str = 'd7d0bbdab5c6'
down_revision: Union[str, None] = '5de29aa97826'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Recreate the enum type with the new values
    op.execute("ALTER TYPE taskstatus RENAME TO taskstatus_old")
    op.execute("CREATE TYPE taskstatus AS ENUM ('unassigned', 'todo', 'in_progress', 'done')")
    op.execute("ALTER TABLE tasks ALTER COLUMN status TYPE taskstatus USING status::text::taskstatus")
    op.execute("DROP TYPE taskstatus_old")


def downgrade() -> None:
    # Recreate the enum type with the old values
    op.execute("ALTER TYPE taskstatus RENAME TO taskstatus_old")
    op.execute("CREATE TYPE taskstatus AS ENUM ('idea', 'todo', 'in_progress', 'done')")
    op.execute("ALTER TABLE tasks ALTER COLUMN status TYPE taskstatus USING status::text::taskstatus")
    op.execute("DROP TYPE taskstatus_old")
