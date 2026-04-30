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
    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    db.delete(cls)
    db.commit()
    return success_response(None, "Class deleted")
