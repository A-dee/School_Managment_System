from typing import List, Dict, Any
from pydantic import BaseModel

class MilestoneTemplateItem(BaseModel):
    name: str
    percentage: int
    due_date: str

class TermInstallmentTemplateCreate(BaseModel):
    milestones: List[MilestoneTemplateItem]

class TermInstallmentTemplateOut(BaseModel):
    id: int
    term_id: int
    milestones: List[Dict[str, Any]]

    class Config:
        from_attributes = True
