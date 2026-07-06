from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class ClassCreate(BaseModel):
    name: str
    level: str
    capacity: Optional[int] = None
    class_teacher_id: Optional[int] = None
    session_id: int


class ClassUpdate(BaseModel):
    name: Optional[str] = None
    level: Optional[str] = None
    capacity: Optional[int] = None
    class_teacher_id: Optional[int] = None


class ClassOut(BaseModel):
    id: int
    name: str
    level: str
    capacity: Optional[int]
    class_teacher_id: Optional[int]
    session_id: int
    created_at: datetime

    class Config:
        from_attributes = True
