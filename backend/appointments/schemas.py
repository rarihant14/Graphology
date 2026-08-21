from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class AppointmentCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    preferred_datetime: datetime
    message: Optional[str] = None

class AppointmentRead(BaseModel):
    id: int
    name: str
    email: str
    phone: str
    preferred_datetime: datetime
    message: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True