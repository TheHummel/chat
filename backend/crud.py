from sqlalchemy.orm import Session
from typing import List, Optional
from models import Thread, Message
from schemas import ThreadCreate, MessageCreate
import uuid


def create_thread(db: Session, thread: ThreadCreate) -> Thread:
    """Create a new thread"""
    thread_id = str(uuid.uuid4())
    db_thread = Thread(id=thread_id, title=thread.title)
    db.add(db_thread)
    db.commit()
    db.refresh(db_thread)
    return db_thread


def get_thread(db: Session, thread_id: str) -> Optional[Thread]:
    """Get a thread by ID"""
    return db.query(Thread).filter(Thread.id == thread_id).first()


def get_threads(db: Session, skip: int = 0, limit: int = 100) -> List[Thread]:
    """Get all threads"""
    return (
        db.query(Thread)
        .order_by(Thread.updated_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def update_thread_title(db: Session, thread_id: str, title: str) -> Optional[Thread]:
    """Update thread title"""
    db_thread = db.query(Thread).filter(Thread.id == thread_id).first()
    if db_thread:
        db_thread.title = title
        db.commit()
        db.refresh(db_thread)
    return db_thread


def delete_thread(db: Session, thread_id: str) -> bool:
    """Delete a thread and all its messages"""
    db_thread = db.query(Thread).filter(Thread.id == thread_id).first()
    if db_thread:
        db.delete(db_thread)
        db.commit()
        return True
    return False


def create_message(db: Session, message: MessageCreate, thread_id: str) -> Message:
    """Create a new message in a thread"""
    message_id = str(uuid.uuid4())
    db_message = Message(
        id=message_id,
        thread_id=thread_id,
        role=message.role,
        content=[item.dict() for item in message.content],
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message


def get_messages(db: Session, thread_id: str) -> List[Message]:
    """Get all messages for a thread"""
    return (
        db.query(Message)
        .filter(Message.thread_id == thread_id)
        .order_by(Message.created_at.asc())
        .all()
    )


def update_message(
    db: Session, message_id: str, content: List[dict]
) -> Optional[Message]:
    """Update message content"""
    db_message = db.query(Message).filter(Message.id == message_id).first()
    if db_message:
        db_message.content = content
        db.commit()
        db.refresh(db_message)
    return db_message
