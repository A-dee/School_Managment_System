import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship
from app.database import Base


class UserRole(str, enum.Enum):
    SUPREME_ADMIN = "SUPREME_ADMIN"
    SUPER_ADMIN = "SUPER_ADMIN"
    PRINCIPAL = "PRINCIPAL"
    FINANCE = "FINANCE"
    ADMIN = "ADMIN"
    TEACHER = "TEACHER"
    PARENT = "PARENT"
    STUDENT = "STUDENT"
    NON_TEACHING_STAFF = "NON_TEACHING_STAFF"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    password_reset_token = Column(String, nullable=True)
    password_reset_expires = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    staff = relationship("Staff", back_populates="user", uselist=False)
    parent = relationship("Parent", back_populates="user", uselist=False)
    audit_logs = relationship("AuditLog", back_populates="performed_by", foreign_keys="AuditLog.performed_by_user_id")
    notifications = relationship("Notification", back_populates="recipient")
