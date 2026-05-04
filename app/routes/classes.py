from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.class_ import Class
from app.schemas.class_ import ClassCreate, ClassOut, ClassUpdate
from app.utils.rbac import is_principal_or_above, is_admin_or_above, is_teacher_or_above
from app.utils.response import success_response, paginated_response

router = APIRouter(prefix="/classes", tags=["Classes"])


@router.post("/")
def create_class(data: ClassCreate, db: Session = Depends(get_db), current_user=Depends(is_admin_or_above)):
    cls = Class(**data.model_dump())
    db.add(cls)
    db.commit()
    db.refresh(cls)
    return success_response(ClassOut.model_validate(cls).model_dump(), "Class created")


@router.get("/")
def list_classes(
    skip: int = 0, limit: int = 100, session_id: Optional[int] = None,
    class_teacher_id: Optional[int] = None,
    db: Session = Depends(get_db), current_user=Depends(is_teacher_or_above)
):
    q = db.query(Class)
    if session_id:
        q = q.filter(Class.session_id == session_id)
    if class_teacher_id is not None:
        q = q.filter(Class.class_teacher_id == class_teacher_id)
    total = q.count()
    classes = q.offset(skip).limit(limit).all()
    return paginated_response([ClassOut.model_validate(c).model_dump() for c in classes], total, 1, limit)


@router.get("/{class_id}")
def get_class(class_id: int, db: Session = Depends(get_db), current_user=Depends(is_teacher_or_above)):
    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    return success_response(ClassOut.model_validate(cls).model_dump())


@router.put("/{class_id}")
def update_class(
    class_id: int, data: ClassUpdate,
    db: Session = Depends(get_db), current_user=Depends(is_admin_or_above)
):
    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(cls, field, value)
    db.commit()
    db.refresh(cls)
    return success_response(ClassOut.model_validate(cls).model_dump(), "Class updated")


@router.delete("/{class_id}")
def delete_class(class_id: int, db: Session = Depends(get_db), current_user=Depends(is_admin_or_above)):
    from app.models.student import Student
    from app.models.attendance import Attendance
    from app.models.result import Result
    from app.models.finance import FeeStructure, Invoice, Payment, PaymentDeclaration
    from app.models.subject import TeacherSubjectClass

    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    # Block delete if fee payments have already been recorded (financial records are irreplaceable)
    invoice_ids = [row.id for row in db.query(Invoice).filter(Invoice.class_id == class_id).all()]
    if invoice_ids and db.query(Payment).filter(Payment.invoice_id.in_(invoice_ids)).first():
        raise HTTPException(
            status_code=400,
            detail="Cannot delete: this class has recorded fee payments. Transfer students and archive fee data first.",
        )

    # Unassign students — they are preserved, just lose their class reference
    db.query(Student).filter(Student.current_class_id == class_id).update(
        {"current_class_id": None}, synchronize_session=False
    )

    # Remove structural / dependent records
    db.query(TeacherSubjectClass).filter(TeacherSubjectClass.class_id == class_id).delete(synchronize_session=False)
    db.query(Attendance).filter(Attendance.class_id == class_id).delete(synchronize_session=False)
    db.query(Result).filter(Result.class_id == class_id).delete(synchronize_session=False)
    if invoice_ids:
        db.query(PaymentDeclaration).filter(PaymentDeclaration.invoice_id.in_(invoice_ids)).delete(synchronize_session=False)
    db.query(Invoice).filter(Invoice.class_id == class_id).delete(synchronize_session=False)
    db.query(FeeStructure).filter(FeeStructure.class_id == class_id).delete(synchronize_session=False)

    db.delete(cls)
    db.commit()
    return success_response(None, "Class deleted")
