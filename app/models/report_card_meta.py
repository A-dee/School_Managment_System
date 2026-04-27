from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, UniqueConstraint
from app.database import Base


class ReportCardMeta(Base):
    __tablename__ = "report_card_meta"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    term_id = Column(Integer, ForeignKey("terms.id"), nullable=False)
    session_id = Column(Integer, ForeignKey("academic_sessions.id"), nullable=False)

    times_school_opened = Column(Integer, nullable=True)
    times_present = Column(Integer, nullable=True)
    times_late = Column(Integer, nullable=True)

    interest_curiosity = Column(String(1), nullable=True)
    level_of_attention = Column(String(1), nullable=True)
    interrelation_peers = Column(String(1), nullable=True)
    personal_cleanliness = Column(String(1), nullable=True)
    self_confidence = Column(String(1), nullable=True)
    expression_ability = Column(String(1), nullable=True)
    indoor_outdoor_play = Column(String(1), nullable=True)
    environment_awareness = Column(String(1), nullable=True)

    class_teacher_comment = Column(Text, nullable=True)
    head_teacher_comment = Column(Text, nullable=True)
    next_term_begins = Column(String(50), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("student_id", "term_id", "session_id", name="uq_report_card_meta"),
    )
