from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.discipline import Discipline
from app.models.user import UserRole
from app.schemas.discipline import DisciplineCreate, DisciplineOut, DisciplineUpdate
from app.utils.rbac import is_principal_or_above, is_teacher_or_above
from app.utils.auth import get_current_user
from app.utils.response import success_response
from app.crud.staff import get_staff_by_user_id
from app.models.class_ import Class

router = APIRouter(prefix="/discipline", tags=["Discipline"])


def _assert_teacher_can_access_student(db: Session, current_user, student_id: int):
    if current_user.role != UserRole.TEACHER:
        return
    from app.models.student import Student
    from app.models.class_ import Class
    staff = get_staff_by_user_id(db, current_user.id)
    if not staff:
        raise HTTPException(status_code=403, detail="No staff profile found")
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    cls = db.query(Class).filter(Class.id == student.current_class_id, Class.class_teacher_id == staff.id).first()
    if not cls:
        raise HTTPException(status_code=403, detail="You can only access discipline records for your own class")


@router.post("/")
def create_record(data: DisciplineCreate, db: Session = Depends(get_db), current_user=Depends(is_teacher_or_above)):
    staff = get_staff_by_user_id(db, current_user.id)
    if not staff:
        raise HTTPException(status_code=403, detail="No staff profile found")
    _assert_teacher_can_access_student(db, current_user, data.student_id)
    record = Discipline(
        student_id=data.student_id,
        incident=data.incident,
        action_taken=data.action_taken,
        reported_by_teacher_id=staff.id,
        date=data.date,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return success_response(DisciplineOut.model_validate(record).model_dump(), "Discipline record created")


@router.get("/")
def list_records(
    student_id: Optional[int] = None,
    db: Session = Depends(get_db), current_user=Depends(is_teacher_or_above)
):
    q = db.query(Discipline)
    if current_user.role == UserRole.TEACHER:
        staff = get_staff_by_user_id(db, current_user.id)
        if not staff:
            raise HTTPException(status_code=403, detail="No staff profile found")
        from app.models.student import Student
        q = q.join(Student, Student.id == Discipline.student_id).filter(Student.current_class_id.is_not(None))
        q = q.join(Class, Class.id == Student.current_class_id).filter(Class.class_teacher_id == staff.id)
    if student_id:
        _assert_teacher_can_access_student(db, current_user, student_id)
        q = q.filter(Discipline.student_id == student_id)
    records = q.all()
    return success_response([DisciplineOut.model_validate(r).model_dump() for r in records])


@router.get("/student/{student_id}")
def student_discipline(
    student_id: int,
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    _assert_teacher_can_access_student(db, current_user, student_id)
    if current_user.role == UserRole.STUDENT:
        from app.models.student import Student
        student = db.query(Student).filter(Student.id == student_id, Student.user_id == current_user.id).first()
        if not student:
            raise HTTPException(status_code=403, detail="You can only access your own discipline records")
    if current_user.role == UserRole.PARENT:
        from app.models.parent import Parent, ParentStudent
        parent = db.query(Parent).filter(Parent.user_id == current_user.id).first()
        if not parent:
            raise HTTPException(status_code=403, detail="Parent profile not found")
        link = db.query(ParentStudent).filter(
            ParentStudent.parent_id == parent.id,
            ParentStudent.student_id == student_id
        ).first()
        if not link:
            raise HTTPException(status_code=403, detail="Not your child")
    records = db.query(Discipline).filter(Discipline.student_id == student_id).all()
    return success_response([DisciplineOut.model_validate(r).model_dump() for r in records])


@router.put("/{record_id}")
def update_record(
    record_id: int, data: DisciplineUpdate,
    db: Session = Depends(get_db), current_user=Depends(is_principal_or_above)
):
    record = db.query(Discipline).filter(Discipline.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(record, field, value)
    db.commit()
    return success_response(DisciplineOut.model_validate(record).model_dump(), "Record updated")
