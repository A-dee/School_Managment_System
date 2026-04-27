import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Date, DateTime, Enum, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class StaffType(str, enum.Enum):
    TEACHER = "TEACHER"
    ADMIN = "ADMIN"
    NON_TEACHING = "NON_TEACHING"
    PRINCIPAL = "PRINCIPAL"


class StaffStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class Staff(Base):
    __tablename__ = "staff"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    full_name = Column(String, nullable=False)
    phone_number = Column(String, nullable=True)
    email = Column(String, nullable=False)
    address = Column(String, nullable=True)
    employment_date = Column(Date, nullable=True)
    salary_amount = Column(Numeric(12, 2), default=0)
    staff_type = Column(Enum(StaffType), nullable=False)
    status = Column(Enum(StaffStatus), default=StaffStatus.ACTIVE)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="staff")
    classes_taught = relationship("Class", back_populates="class_teacher", foreign_keys="Class.class_teacher_id")
    subject_assignments = relationship("TeacherSubjectClass", back_populates="teacher")
    payrolls = relationship("Payroll", back_populates="staff")
    discipline_records = relationship("Discipline", back_populates="reported_by_teacher")
    attendance_records = relationship("Attendance", back_populates="marked_by_teacher")
