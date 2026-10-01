from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime
from app.models.user import PyObjectId

class WhatsAppAccountModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: str
    phone_number: str
    phone_number_id: str
    business_account_id: str
    access_token: str
    verify_token: str
    webhook_secret: Optional[str] = None
    connection_status: str = "disconnected"
    created_at: datetime = Field(default_factory=datetime.utcnow)
