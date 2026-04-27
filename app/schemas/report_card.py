from typing import Optional
from pydantic import BaseModel


class ReportCardMetaIn(BaseModel):
    term_id: int
    session_id: int
    times_school_opened: Optional[int] = None
    times_present: Optional[int] = None
    times_late: Optional[int] = None
    interest_curiosity: Optional[str] = None
    level_of_attention: Optional[str] = None
    interrelation_peers: Optional[str] = None
    personal_cleanliness: Optional[str] = None
    self_confidence: Optional[str] = None
    expression_ability: Optional[str] = None
    indoor_outdoor_play: Optional[str] = None
    environment_awareness: Optional[str] = None
    class_teacher_comment: Optional[str] = None
    head_teacher_comment: Optional[str] = None
    next_term_begins: Optional[str] = None


class ReportCardMetaOut(BaseModel):
    id: int
    student_id: int
    term_id: int
    session_id: int
    times_school_opened: Optional[int] = None
    times_present: Optional[int] = None
    times_late: Optional[int] = None
    interest_curiosity: Optional[str] = None
    level_of_attention: Optional[str] = None
    interrelation_peers: Optional[str] = None
    personal_cleanliness: Optional[str] = None
    self_confidence: Optional[str] = None
    expression_ability: Optional[str] = None
    indoor_outdoor_play: Optional[str] = None
    environment_awareness: Optional[str] = None
    class_teacher_comment: Optional[str] = None
    head_teacher_comment: Optional[str] = None
    next_term_begins: Optional[str] = None

    class Config:
        from_attributes = True
