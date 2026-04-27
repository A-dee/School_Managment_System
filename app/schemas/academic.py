from typing import Optional
from datetime import date, datetime
from pydantic import BaseModel


class SessionCreate(BaseModel):
    name: str
    start_date: date
    end_date: date
    is_current: bool = False


class SessionOut(BaseModel):
    id: int
    name: str
    start_date: date
    end_date: date
    is_current: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TermCreate(BaseModel):
    name: str
    session_id: int
    start_date: date
    end_date: date
    is_current: bool = False


class TermUpdate(BaseModel):
    name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class TermOut(BaseModel):
    id: int
    name: str
    session_id: int
    start_date: date
    end_date: date
    is_current: bool

    class Config:
        from_attributes = True
