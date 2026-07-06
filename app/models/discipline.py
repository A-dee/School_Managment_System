from datetime import datetime
from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


class Discipline(Base):
    __tablename__ = "discipline_records"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    incident = Column(Text, nullable=False)
    action_taken = Column(Text, nullable=True)
    reported_by_teacher_id = Column(Integer, ForeignKey("staff.id"), nullable=False)
    date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="discipline_records")
    reported_by_teacher = relationship("Staff", back_populates="discipline_records")
