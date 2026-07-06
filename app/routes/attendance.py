from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.attendance import Attendance
from app.models.class_ import Class
from app.models.user import UserRole
from app.schemas.attendance import AttendanceCreate, AttendanceOut, BulkAttendanceCreate
from app.utils.rbac import is_principal_or_above, is_teacher_or_above
from app.utils.auth import get_current_user
from app.utils.response import success_response
from app.crud.staff import get_staff_by_user_id

router = APIRouter(prefix="/attendance", tags=["Attendance"])


def _assert_class_access(db, current_user, class_id: int):
    """Raises 403 if a TEACHER is not the class teacher of the given class."""
    if current_user.role == UserRole.TEACHER:
        staff = get_staff_by_user_id(db, current_user.id)
        if not staff:
            raise HTTPException(status_code=403, detail="No staff profile found")
        cls = db.query(Class).filter(Class.id == class_id, Class.class_teacher_id == staff.id).first()
        if not cls:
            raise HTTPException(status_code=403, detail="You can only manage attendance for your own class")
        return staff
    return get_staff_by_user_id(db, current_user.id)


def _assert_teacher_can_access_student(db, current_user, student_id: int):
    if current_user.role != UserRole.TEACHER:
        return
    staff = get_staff_by_user_id(db, current_user.id)
    if not staff:
        raise HTTPException(status_code=403, detail="No staff profile found")
    from app.models.student import Student
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    cls = db.query(Class).filter(Class.id == student.current_class_id, Class.class_teacher_id == staff.id).first()
    if not cls:
        raise HTTPException(status_code=403, detail="You can only access attendance for your own class")


@router.post("/")
def mark_attendance(data: AttendanceCreate, db: Session = Depends(get_db), current_user=Depends(is_teacher_or_above)):
    staff = _assert_class_access(db, current_user, data.class_id)
    record = Attendance(
        date=data.date,
        student_id=data.student_id,
        class_id=data.class_id,
        marked_by_teacher_id=staff.id if staff else None,
        status=data.status,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return success_response(AttendanceOut.model_validate(record).model_dump(), "Attendance marked")


@router.post("/bulk")
def bulk_mark(data: BulkAttendanceCreate, db: Session = Depends(get_db), current_user=Depends(is_teacher_or_above)):
    staff = _assert_class_access(db, current_user, data.class_id)
    records = []
    for item in data.records:
        record = Attendance(
            date=data.date,
            student_id=item["student_id"],
            class_id=data.class_id,
            marked_by_teacher_id=staff.id if staff else None,
            status=item["status"],
        )
        db.add(record)
        records.append(record)
    db.commit()
    return success_response({"count": len(records)}, f"{len(records)} attendance records saved")


@router.get("/class/{class_id}")
def class_attendance(
    class_id: int, date: str = None,
    db: Session = Depends(get_db), current_user=Depends(is_teacher_or_above)
):
    _assert_class_access(db, current_user, class_id)
    q = db.query(Attendance).filter(Attendance.class_id == class_id)
    if date:
        q = q.filter(Attendance.date == date)
    records = q.all()
    return success_response([AttendanceOut.model_validate(r).model_dump() for r in records])


@router.get("/student/{student_id}")
def student_attendance(
    student_id: int,
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    _assert_teacher_can_access_student(db, current_user, student_id)
    if current_user.role == UserRole.STUDENT:
        from app.models.student import Student
        student = db.query(Student).filter(Student.id == student_id, Student.user_id == current_user.id).first()
        if not student:
            raise HTTPException(status_code=403, detail="You can only access your own attendance")
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

    records = db.query(Attendance).filter(Attendance.student_id == student_id).all()
    total = len(records)
    present = sum(1 for r in records if r.status.value == "PRESENT")
    absent = sum(1 for r in records if r.status.value == "ABSENT")
    late = sum(1 for r in records if r.status.value == "LATE")
    return success_response({
        "records": [AttendanceOut.model_validate(r).model_dump() for r in records],
        "summary": {"total": total, "present": present, "absent": absent, "late": late}
    })


@router.get("/summary")
def attendance_summary(
    db: Session = Depends(get_db),
    current_user=Depends(is_principal_or_above),
):
    """School-wide attendance totals for the dashboard."""
    records = db.query(Attendance).all()
    total = len(records)
    present = sum(1 for r in records if r.status.value == "PRESENT")
    absent  = sum(1 for r in records if r.status.value == "ABSENT")
    late    = sum(1 for r in records if r.status.value == "LATE")
    rate    = round((present / total) * 100, 1) if total > 0 else 0
    return success_response({
        "total": total,
        "present": present,
        "absent": absent,
        "late": late,
        "attendance_rate": rate,
    })
