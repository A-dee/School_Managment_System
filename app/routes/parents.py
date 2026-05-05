from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.parent import Parent, ParentStudent
from app.models.user import UserRole
from app.schemas.parent import ParentCreate, ParentOut, ParentUpdate, LinkParentStudent
from app.utils.rbac import is_principal_or_above, is_admin_or_above
from app.utils.auth import get_current_user
from app.utils.response import success_response
from app.utils.auth import hash_password
from app.utils.email import send_login_credentials
from app.models.user import User

router = APIRouter(prefix="/parents", tags=["Parents"])


@router.post("/")
def create_parent(data: ParentCreate, db: Session = Depends(get_db), current_user=Depends(is_admin_or_above)):
    if db.query(User).filter(User.email == data.user_email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=data.user_email,
        hashed_password=hash_password(data.user_password),
        role=UserRole.PARENT,
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    db.flush()
    parent = Parent(
        user_id=user.id,
        full_name=data.full_name,
        phone=data.phone,
        email=data.email,
        address=data.address,
    )
    db.add(parent)
    db.commit()
    db.refresh(parent)
    send_login_credentials(db, data.user_email, data.full_name, data.user_password, "Parent")
    return success_response(ParentOut.model_validate(parent).model_dump(), "Parent created")


@router.get("/")
def list_parents(db: Session = Depends(get_db), current_user=Depends(is_admin_or_above)):
    from app.models.student import Student
    parents = db.query(Parent).all()
    result = []
    for p in parents:
        links = db.query(ParentStudent).filter(ParentStudent.parent_id == p.id).all()
        children = []
        for lnk in links:
            s = db.query(Student).filter(Student.id == lnk.student_id).first()
            if s:
                children.append({
                    "id": s.id,
                    "first_name": s.first_name,
                    "last_name": s.last_name,
                    "admission_number": s.admission_number,
                    "current_class_id": s.current_class_id,
                    "status": s.status.value if hasattr(s.status, "value") else s.status,
                })
        d = ParentOut.model_validate(p).model_dump()
        d["children"] = children
        result.append(d)
    return success_response(result)


@router.get("/me/children")
def my_children(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.role != UserRole.PARENT:
        raise HTTPException(status_code=403, detail="Parent only")
    parent = db.query(Parent).filter(Parent.user_id == current_user.id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent profile not found")
    links = db.query(ParentStudent).filter(ParentStudent.parent_id == parent.id).all()
    from app.crud.student import get_student_by_id
    from app.schemas.student import StudentOut
    children = [StudentOut.model_validate(get_student_by_id(db, l.student_id)).model_dump() for l in links]
    return success_response(children)


@router.post("/link-student")
def link_student(data: LinkParentStudent, db: Session = Depends(get_db), current_user=Depends(is_principal_or_above)):
    existing = db.query(ParentStudent).filter(
        ParentStudent.parent_id == data.parent_id,
        ParentStudent.student_id == data.student_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already linked")
    link = ParentStudent(parent_id=data.parent_id, student_id=data.student_id)
    db.add(link)
    db.commit()
    return success_response(None, "Student linked to parent")


@router.delete("/link-student")
def unlink_student(data: LinkParentStudent, db: Session = Depends(get_db), current_user=Depends(is_principal_or_above)):
    link = db.query(ParentStudent).filter(
        ParentStudent.parent_id == data.parent_id,
        ParentStudent.student_id == data.student_id
    ).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    db.delete(link)
    db.commit()
    return success_response(None, "Student unlinked")
