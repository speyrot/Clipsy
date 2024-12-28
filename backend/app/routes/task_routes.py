# app/routes/task_routes.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.task import Task, Tag, TaskStatus, TaskCreate, TaskRead, TaskUpdate
from app.dependencies import get_current_user

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.post("/", response_model=TaskRead)
def create_task(
    task_data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new task for the current user with optional tags.
    """
    # Create Task
    new_task = Task(
        user_id=current_user.id,
        title=task_data.title,
        description=task_data.description,
        status=task_data.status.value,  # or just task_data.status if it maps directly
    )

    # Handle tags by name
    for tag_name in task_data.tags:
        tag_name = tag_name.strip()
        if not tag_name:
            continue

        # Check if tag already exists for this user
        existing_tag = db.query(Tag).filter(
            Tag.user_id == current_user.id,
            Tag.name.ilike(tag_name)
        ).first()

        if existing_tag:
            new_task.tags.append(existing_tag)
        else:
            # create new tag
            new_tag = Tag(user_id=current_user.id, name=tag_name)
            db.add(new_tag)
            new_task.tags.append(new_tag)

    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    # Convert to TaskRead (the Pydantic model)
    return TaskRead(
        id=new_task.id,
        title=new_task.title,
        description=new_task.description,
        status=new_task.status,
        tags=[tag.name for tag in new_task.tags]
    )


@router.get("/", response_model=List[TaskRead])
def get_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all tasks belonging to the current user.
    """
    user_tasks = db.query(Task).filter(Task.user_id == current_user.id).all()
    results = []
    for t in user_tasks:
        results.append(TaskRead(
            id=t.id,
            title=t.title,
            description=t.description,
            status=t.status,
            tags=[tag.name for tag in t.tags]
        ))
    return results


@router.get("/{task_id}", response_model=TaskRead)
def get_task_by_id(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get one task by ID.
    """
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    return TaskRead(
        id=task.id,
        title=task.title,
        description=task.description,
        status=task.status,
        tags=[tag.name for tag in task.tags]
    )


@router.put("/{task_id}", response_model=TaskRead)
def update_task(
    task_id: int,
    updates: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update an existing task's fields (title, description, status, tags).
    """
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Update fields
    if updates.title is not None:
        task.title = updates.title
    if updates.description is not None:
        task.description = updates.description
    if updates.status is not None:
        task.status = updates.status.value

    # If tags array is provided (not None), we update the tags
    if updates.tags is not None:
        # Clear existing tags
        task.tags.clear()
        # Re-add tags
        for tag_name in updates.tags:
            tag_name = tag_name.strip()
            if not tag_name:
                continue

            existing_tag = db.query(Tag).filter(
                Tag.user_id == current_user.id,
                Tag.name.ilike(tag_name)
            ).first()
            if existing_tag:
                task.tags.append(existing_tag)
            else:
                new_tag = Tag(user_id=current_user.id, name=tag_name)
                db.add(new_tag)
                task.tags.append(new_tag)

    db.commit()
    db.refresh(task)

    return TaskRead(
        id=task.id,
        title=task.title,
        description=task.description,
        status=task.status,
        tags=[tag.name for tag in task.tags]
    )


@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a task by ID.
    """
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()
    return {"message": "Task deleted"}
