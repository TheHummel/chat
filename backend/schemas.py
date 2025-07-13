from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime


class ContentItem(BaseModel):
    type: str
    text: str


class MessageBase(BaseModel):
    role: str
    content: List[ContentItem]


class MessageCreate(MessageBase):
    pass


class MessageResponse(MessageBase):
    id: str
    thread_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ThreadBase(BaseModel):
    title: Optional[str] = None


class ThreadCreate(ThreadBase):
    pass


class ThreadResponse(ThreadBase):
    id: str
    created_at: datetime
    updated_at: datetime
    messages: List[MessageResponse] = []

    class Config:
        from_attributes = True


class ThreadListResponse(ThreadBase):
    id: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    messages: List[MessageBase]
    thread_id: Optional[str] = None
    model_provider: Optional[str] = "openai"  # "openai", "anthropic", "gemini"
