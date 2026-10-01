from typing import Optional
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

class PyObjectId(str):
    @classmethod
    def __get_pydantic_core_schema__(cls, _source_type, _handler):
        from pydantic_core import core_schema
        return core_schema.str_schema()

class UserModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    login_name: str
    email: EmailStr
    password_hash: str
    role: str = "user" # 'admin' or 'user'
    status: str = "active"
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "login_name": "john_doe",
                "email": "jdoe@example.com",
                "password_hash": "hashed_password",
                "role": "user",
                "status": "active"
            }
        }
