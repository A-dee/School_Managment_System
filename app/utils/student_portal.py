from __future__ import annotations

from typing import Optional

from sqlalchemy.orm import Session

from app.models.class_ import Class
from app.models.parent import ParentStudent
from app.models.student import Student
from app.models.user import User, UserRole


PARENT_MANAGED_LEVEL_KEYWORDS = (
    "CRECHE",
    "CRÈCHE",
    "NURSERY",
    "PRESCHOOL",
    "KINDERGARTEN",
    "PRIMARY",
    "GRADE",
    "BASIC",
)


def is_parent_managed_class_level(level: Optional[str]) -> bool:
    if not level:
        return False
    upper_level = level.strip().upper()
    return any(keyword in upper_level for keyword in PARENT_MANAGED_LEVEL_KEYWORDS)


def is_parent_managed_class_id(db: Session, class_id: Optional[int]) -> bool:
    if not class_id:
        return False
    class_ = db.query(Class).filter(Class.id == class_id).first()
    return bool(class_ and is_parent_managed_class_level(class_.level))


def student_has_parent_portal_link(db: Session, student_id: int) -> bool:
    return db.query(ParentStudent).filter(ParentStudent.student_id == student_id).first() is not None


def student_requires_parent_portal(db: Session, student: Optional[Student]) -> bool:
    if not student:
        return False
    return is_parent_managed_class_id(db, student.current_class_id)


def student_requires_parent_portal_by_user_id(db: Session, user_id: int) -> bool:
    student = db.query(Student).filter(Student.user_id == user_id).first()
    return student_requires_parent_portal(db, student)


def sync_student_portal_access(db: Session, student: Student) -> None:
    if not student.user_id:
        return
    user = db.query(User).filter(User.id == student.user_id, User.role == UserRole.STUDENT).first()
    if not user:
        return
    # Lower-grade classes are parent-managed, so any linked student portal
    # account must remain disabled even if the record already exists.
    user.is_active = not student_requires_parent_portal(db, student)
