import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Date, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class StudentStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    GRADUATED = "GRADUATED"
    WITHDRAWN = "WITHDRAWN"


class Gender(str, enum.Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    admission_number = Column(String, unique=True, nullable=False, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    gender = Column(Enum(Gender), nullable=False)
    date_of_birth = Column(Date, nullable=True)
    address = Column(String, nullable=True)
    guardian_name = Column(String, nullable=True)
    guardian_phone = Column(String, nullable=True)
    enrollment_date = Column(Date, nullable=True)
    current_class_id = Column(Integer, ForeignKey("classes.id"), nullable=True)
    status = Column(Enum(StudentStatus), default=StudentStatus.ACTIVE)
    scholarship_percentage = Column(Integer, default=0, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    current_class = relationship("Class", back_populates="students")
    parents = relationship("ParentStudent", back_populates="student")
    results = relationship("Result", back_populates="student")
    attendance_records = relationship("Attendance", back_populates="student")
    discipline_records = relationship("Discipline", back_populates="student")
    invoices = relationship("Invoice", back_populates="student")
