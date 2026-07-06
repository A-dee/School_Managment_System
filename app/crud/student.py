from typing import Optional
from sqlalchemy.orm import Session
from app.models.student import Student, StudentStatus
from app.schemas.student import StudentCreate, StudentUpdate


def create_student(db: Session, data: StudentCreate) -> Student:
    student = Student(**data.model_dump(exclude={"parent_link_mode", "existing_parent_id", "create_student_login"}))
    db.add(student)
    db.flush()
    return student


def get_student_by_id(db: Session, student_id: int) -> Optional[Student]:
    return db.query(Student).filter(Student.id == student_id).first()


def get_student_by_admission(db: Session, admission_number: str) -> Optional[Student]:
    return db.query(Student).filter(Student.admission_number == admission_number).first()


def get_all_students(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    class_id: Optional[int] = None,
    status: Optional[StudentStatus] = None,
    search: Optional[str] = None,
):
    q = db.query(Student)
    if class_id:
        q = q.filter(Student.current_class_id == class_id)
    if status:
        q = q.filter(Student.status == status)
    if search:
        q = q.filter(
            (Student.first_name.ilike(f"%{search}%")) |
            (Student.last_name.ilike(f"%{search}%")) |
            (Student.admission_number.ilike(f"%{search}%"))
        )
    total = q.count()
    return q.offset(skip).limit(limit).all(), total


def update_student(db: Session, student: Student, data: StudentUpdate) -> Student:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(student, field, value)
    db.flush()
    return student


def graduate_student(db: Session, student: Student) -> Student:
    student.status = StudentStatus.GRADUATED
    db.flush()
    return student


def withdraw_student(db: Session, student: Student) -> Student:
    student.status = StudentStatus.WITHDRAWN
    db.flush()
    return student


def transfer_student(db: Session, student: Student, new_class_id: int) -> Student:
    student.current_class_id = new_class_id
    db.flush()
    return student


def bulk_promote(db: Session, student_ids: list[int], to_class_id: int) -> int:
    count = db.query(Student).filter(Student.id.in_(student_ids)).update(
        {"current_class_id": to_class_id}, synchronize_session=False
    )
    db.flush()
    return count
