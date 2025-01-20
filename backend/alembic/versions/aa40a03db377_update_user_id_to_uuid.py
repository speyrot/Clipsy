"""update user id to uuid

Revision ID: aa40a03db377
Revises: d6c3e36173ca
Create Date: 2024-01-11 12:34:56.789012

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'aa40a03db377'
down_revision = 'd6c3e36173ca'
branch_labels = None
depends_on = None

def upgrade():
    # Create uuid-ossp extension if it doesn't exist
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    
    # Drop all dependent tables first
    op.execute("DROP TABLE IF EXISTS videos CASCADE")
    op.execute("DROP TABLE IF EXISTS tasks CASCADE")
    op.execute("DROP TABLE IF EXISTS tags CASCADE")
    op.execute("DROP TABLE IF EXISTS users CASCADE")
    
    # Create users table with UUID
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('first_name', sa.String(), nullable=True),
        sa.Column('last_name', sa.String(), nullable=True),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('profile_picture_url', sa.String(), nullable=True),
        sa.Column('password_hash', sa.String(), nullable=True),
        sa.Column('oauth_provider', sa.String(), nullable=True),
        sa.Column('oauth_provider_id', sa.String(), nullable=True),
        sa.Column('subscription_plan', sa.String(), nullable=False, server_default='FREE'),
        sa.Column('token_balance', sa.Integer(), nullable=False, server_default='300')
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    
    # Create videos table
    op.create_table(
        'videos',
        sa.Column('id', sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], )
    )
    
    # Create tasks table
    op.create_table(
        'tasks',
        sa.Column('id', sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], )
    )
    
    # Create tags table
    op.create_table(
        'tags',
        sa.Column('id', sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], )
    )

def downgrade():
    op.drop_table('tags')
    op.drop_table('tasks')
    op.drop_table('videos')
    op.drop_table('users')