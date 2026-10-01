from typing import Optional, List
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field
from datetime import datetime
from app.models.user import PyObjectId

class ContactModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: str
    name: str
    phone: str
    email: Optional[str] = None
    tags: List[str] = []

class ConversationModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: str
    contact_id: str
    last_message: Optional[str] = None
    unread_count: int = 0
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class MessageModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    conversation_id: str
    sender: str
    receiver: str
    body: str
    status: str = "sent"
    timestamp: datetime = Field(default_factory=datetime.utcnow)
