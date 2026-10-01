from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime
from app.models.user import PyObjectId

class ActivityLogModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: str
    action: str
    ip: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
