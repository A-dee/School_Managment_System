from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.subject import Subject, SubjectStatus, TeacherSubjectClass
from app.models.user import UserRole
from app.schemas.subject import SubjectCreate, SubjectOut, SubjectUpdate, TeacherSubjectClassCreate, TeacherSubjectClassOut
from app.utils.rbac import is_principal_or_above, is_teacher_or_above
from app.utils.auth import get_current_user
from app.utils.response import success_response
from app.crud.staff import get_staff_by_user_id

router = APIRouter(prefix="/subjects", tags=["Subjects"])


@router.post("/")
def create_subject(data: SubjectCreate, db: Session = Depends(get_db), current_user=Depends(is_teacher_or_above)):
    existing = db.query(Subject).filter(Subject.code == data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Subject code already exists")

    teacher_id = None
    if current_user.role == UserRole.TEACHER:
        staff = get_staff_by_user_id(db, current_user.id)
        teacher_id = staff.id if staff else None

    subject = Subject(
        name=data.name,
        code=data.code,
        created_by_teacher_id=teacher_id,
        status=SubjectStatus.PENDING if current_user.role == UserRole.TEACHER else SubjectStatus.APPROVED,
    )
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return success_response(SubjectOut.model_validate(subject).model_dump(), "Subject created")


@router.get("/")
def list_subjects(db: Session = Depends(get_db), current_user=Depends(is_teacher_or_above)):
    subjects = db.query(Subject).all()
    return success_response([SubjectOut.model_validate(s).model_dump() for s in subjects])


@router.put("/{subject_id}/approve")
def approve_subject(subject_id: int, db: Session = Depends(get_db), current_user=Depends(is_principal_or_above)):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    subject.status = SubjectStatus.APPROVED
    db.commit()
    return success_response(None, "Subject approved")


@router.put("/{subject_id}/reject")
def reject_subject(subject_id: int, db: Session = Depends(get_db), current_user=Depends(is_principal_or_above)):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    subject.status = SubjectStatus.REJECTED
    db.commit()
    return success_response(None, "Subject rejected")


@router.post("/assignments")
def assign_teacher(data: TeacherSubjectClassCreate, db: Session = Depends(get_db), current_user=Depends(is_principal_or_above)):
    existing = db.query(TeacherSubjectClass).filter(
        TeacherSubjectClass.teacher_id == data.teacher_id,
        TeacherSubjectClass.subject_id == data.subject_id,
        TeacherSubjectClass.class_id == data.class_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Assignment already exists")
    assignment = TeacherSubjectClass(**data.model_dump())
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return success_response(TeacherSubjectClassOut.model_validate(assignment).model_dump(), "Teacher assigned")


@router.get("/assignments")
def list_assignments(db: Session = Depends(get_db), current_user=Depends(is_teacher_or_above)):
    if current_user.role == UserRole.TEACHER:
        staff = get_staff_by_user_id(db, current_user.id)
        assignments = db.query(TeacherSubjectClass).filter(TeacherSubjectClass.teacher_id == staff.id).all() if staff else []
    else:
        assignments = db.query(TeacherSubjectClass).all()
    return success_response([TeacherSubjectClassOut.model_validate(a).model_dump() for a in assignments])


@router.delete("/assignments/{assignment_id}")
def remove_assignment(assignment_id: int, db: Session = Depends(get_db), current_user=Depends(is_principal_or_above)):
    assignment = db.query(TeacherSubjectClass).filter(TeacherSubjectClass.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    db.delete(assignment)
    db.commit()
    return success_response(None, "Assignment removed")
