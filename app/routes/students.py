import os
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.student import StudentStatus
from app.models.student_registration import StudentRegistration, StudentMedical, StudentAboutMe
from app.models.student_document import StudentDocument
from app.schemas.student import StudentCreate, StudentOut, StudentUpdate, StudentTransfer, BulkPromotion
from app.schemas.student_registration import StudentRegistrationData, StudentMedicalData, StudentAboutMeData
from app.crud.student import (
    create_student, get_student_by_id, get_all_students, update_student,
    graduate_student, withdraw_student, transfer_student, bulk_promote,
    get_student_by_admission
)
from app.utils.rbac import is_principal_or_above, is_admin_or_above, is_teacher_or_above
from app.utils.response import success_response, paginated_response
from app.utils.audit import log_action

UPLOAD_DIR = "uploads/students"

router = APIRouter(prefix="/students", tags=["Students"])


@router.post("/")
def add_student(data: StudentCreate, db: Session = Depends(get_db), current_user=Depends(is_teacher_or_above)):
    import secrets
    from app.models.user import User, UserRole
    from app.models.parent import Parent, ParentStudent
    from app.models.staff import Staff
    from app.models.class_ import Class
    from app.utils.auth import hash_password

    if get_student_by_admission(db, data.admission_number):
        raise HTTPException(status_code=400, detail="Admission number already exists")

    # Teachers can only enroll into their own class
    if current_user.role == UserRole.TEACHER:
        staff = db.query(Staff).filter(Staff.user_id == current_user.id).first()
        if not staff:
            raise HTTPException(status_code=403, detail="Teacher profile not found")
        if not data.current_class_id:
            raise HTTPException(status_code=400, detail="Teachers must assign a class when enrolling a student")
        cls = db.query(Class).filter(Class.id == data.current_class_id, Class.class_teacher_id == staff.id).first()
        if not cls:
            raise HTTPException(status_code=403, detail="You can only enroll students into your own class")

    student = create_student(db, data)

    # Auto-create student login account
    student_email = (
        data.admission_number.lower()
        .replace("/", ".").replace(" ", "")
        + "@student.portal"
    )
    student_password = secrets.token_urlsafe(8)
    student_user = User(
        email=student_email,
        hashed_password=hash_password(student_password),
        role=UserRole.STUDENT,
        is_active=True,
        is_verified=True,
    )
    db.add(student_user)
    db.flush()
    student.user_id = student_user.id

    credentials: dict = {
        "student_email": student_email,
        "student_password": student_password,
    }

    # Auto-create parent account if guardian email provided
    if data.guardian_email:
        existing = db.query(User).filter(User.email == data.guardian_email).first()
        if existing:
            parent_user = existing
            credentials["parent_email"] = data.guardian_email
            credentials["parent_note"] = "Linked to existing account — parent password unchanged"
        else:
            parent_password = secrets.token_urlsafe(8)
            parent_user = User(
                email=data.guardian_email,
                hashed_password=hash_password(parent_password),
                role=UserRole.PARENT,
                is_active=True,
                is_verified=True,
            )
            db.add(parent_user)
            db.flush()
            credentials["parent_email"] = data.guardian_email
            credentials["parent_password"] = parent_password

        parent = db.query(Parent).filter(Parent.user_id == parent_user.id).first()
        if not parent:
            parent = Parent(
                user_id=parent_user.id,
                full_name=data.guardian_name or "Parent/Guardian",
                phone=data.guardian_phone,
                email=data.guardian_email,
            )
            db.add(parent)
            db.flush()

        db.add(ParentStudent(parent_id=parent.id, student_id=student.id))

    log_action(db, "CREATE_STUDENT", "Student", current_user.id, entity_id=student.id)
    db.commit()
    return success_response(
        {**StudentOut.model_validate(student).model_dump(), "credentials": credentials},
        "Student created",
    )


@router.get("/")
def list_students(
    skip: int = 0, limit: int = 50,
    class_id: Optional[int] = None, status: Optional[StudentStatus] = None, search: Optional[str] = None,
    db: Session = Depends(get_db), current_user=Depends(is_teacher_or_above)
):
    students, total = get_all_students(db, skip=skip, limit=limit, class_id=class_id, status=status, search=search)
    return paginated_response([StudentOut.model_validate(s).model_dump() for s in students], total, skip // limit + 1, limit)


@router.get("/{student_id}")
def get_student(student_id: int, db: Session = Depends(get_db), current_user=Depends(is_teacher_or_above)):
    student = get_student_by_id(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return success_response(StudentOut.model_validate(student).model_dump())


@router.put("/{student_id}")
def update_student_info(
    student_id: int, data: StudentUpdate,
    db: Session = Depends(get_db), current_user=Depends(is_admin_or_above)
):
    student = get_student_by_id(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    updated = update_student(db, student, data)
    db.commit()
    return success_response(StudentOut.model_validate(updated).model_dump(), "Student updated")


@router.post("/{student_id}/graduate")
def graduate(student_id: int, db: Session = Depends(get_db), current_user=Depends(is_principal_or_above)):
    student = get_student_by_id(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    graduate_student(db, student)
    log_action(db, "GRADUATE_STUDENT", "Student", current_user.id, entity_id=student_id)
    db.commit()
    return success_response(None, "Student graduated")


@router.post("/{student_id}/withdraw")
def withdraw(student_id: int, db: Session = Depends(get_db), current_user=Depends(is_principal_or_above)):
    student = get_student_by_id(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    withdraw_student(db, student)
    log_action(db, "WITHDRAW_STUDENT", "Student", current_user.id, entity_id=student_id)
    db.commit()
    return success_response(None, "Student withdrawn")


@router.post("/{student_id}/transfer")
def transfer(
    student_id: int, data: StudentTransfer,
    db: Session = Depends(get_db), current_user=Depends(is_principal_or_above)
):
    student = get_student_by_id(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    old_class = student.current_class_id
    transfer_student(db, student, data.new_class_id)
    log_action(db, "TRANSFER_STUDENT", "Student", current_user.id, entity_id=student_id,
               old_value={"class_id": old_class}, new_value={"class_id": data.new_class_id})
    db.commit()
    return success_response(None, "Student transferred")


@router.delete("/{student_id}")
def delete_student_record(student_id: int, db: Session = Depends(get_db), current_user=Depends(is_principal_or_above)):
    student = get_student_by_id(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    log_action(db, "DELETE_STUDENT", "Student", current_user.id, entity_id=student_id,
               old_value={"name": f"{student.first_name} {student.last_name}"})
    if student.user_id:
        from app.models.user import User
        user = db.query(User).filter(User.id == student.user_id).first()
        if user:
            db.delete(user)
    db.delete(student)
    db.commit()
    return success_response(None, "Student deleted")


@router.post("/bulk-promote")
def bulk_promotion(data: BulkPromotion, db: Session = Depends(get_db), current_user=Depends(is_principal_or_above)):
    count = bulk_promote(db, data.student_ids, data.to_class_id)
    log_action(db, "BULK_PROMOTE", "Student", current_user.id, new_value={"count": count, "to_class_id": data.to_class_id})
    db.commit()
    return success_response({"promoted_count": count}, f"{count} students promoted")


def _upsert(db, model_class, student_id: int, data):
    record = db.query(model_class).filter(model_class.student_id == student_id).first()
    if not record:
        record = model_class(student_id=student_id)
        db.add(record)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(record, field, value)
    db.commit()
    db.refresh(record)
    return record


@router.get("/{student_id}/registration")
def get_registration(student_id: int, db: Session = Depends(get_db), current_user=Depends(is_teacher_or_above)):
    r = db.query(StudentRegistration).filter(StudentRegistration.student_id == student_id).first()
    return success_response(StudentRegistrationData.model_validate(r).model_dump() if r else None)


@router.put("/{student_id}/registration")
def save_registration(student_id: int, data: StudentRegistrationData, db: Session = Depends(get_db), current_user=Depends(is_teacher_or_above)):
    if not get_student_by_id(db, student_id):
        raise HTTPException(status_code=404, detail="Student not found")
    _upsert(db, StudentRegistration, student_id, data)
    return success_response(None, "Registration saved")


@router.get("/{student_id}/medical")
def get_medical(student_id: int, db: Session = Depends(get_db), current_user=Depends(is_teacher_or_above)):
    r = db.query(StudentMedical).filter(StudentMedical.student_id == student_id).first()
    return success_response(StudentMedicalData.model_validate(r).model_dump() if r else None)


@router.put("/{student_id}/medical")
def save_medical(student_id: int, data: StudentMedicalData, db: Session = Depends(get_db), current_user=Depends(is_teacher_or_above)):
    if not get_student_by_id(db, student_id):
        raise HTTPException(status_code=404, detail="Student not found")
    _upsert(db, StudentMedical, student_id, data)
    return success_response(None, "Medical information saved")


@router.get("/{student_id}/about-me")
def get_about_me(student_id: int, db: Session = Depends(get_db), current_user=Depends(is_teacher_or_above)):
    r = db.query(StudentAboutMe).filter(StudentAboutMe.student_id == student_id).first()
    return success_response(StudentAboutMeData.model_validate(r).model_dump() if r else None)


@router.put("/{student_id}/about-me")
def save_about_me(student_id: int, data: StudentAboutMeData, db: Session = Depends(get_db), current_user=Depends(is_teacher_or_above)):
    if not get_student_by_id(db, student_id):
        raise HTTPException(status_code=404, detail="Student not found")
    _upsert(db, StudentAboutMe, student_id, data)
    return success_response(None, "About Me information saved")


@router.get("/{student_id}/documents")
def list_documents(student_id: int, db: Session = Depends(get_db), current_user=Depends(is_teacher_or_above)):
    docs = db.query(StudentDocument).filter(StudentDocument.student_id == student_id).order_by(StudentDocument.created_at.desc()).all()
    return success_response([{
        "id": d.id, "original_filename": d.original_filename,
        "file_size": d.file_size, "document_type": d.document_type,
        "created_at": d.created_at.isoformat() if d.created_at else None,
    } for d in docs])


@router.post("/{student_id}/documents")
async def upload_document(
    student_id: int,
    file: UploadFile = File(...),
    document_type: str = "registration_form",
    db: Session = Depends(get_db),
    current_user=Depends(is_teacher_or_above),
):
    if not get_student_by_id(db, student_id):
        raise HTTPException(status_code=404, detail="Student not found")
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")
    content = await file.read()
    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 20 MB)")
    upload_dir = os.path.join(UPLOAD_DIR, str(student_id))
    os.makedirs(upload_dir, exist_ok=True)
    safe_name = f"{uuid.uuid4()}_{file.filename.replace(' ', '_')}"
    file_path = os.path.join(upload_dir, safe_name)
    with open(file_path, "wb") as f:
        f.write(content)
    doc = StudentDocument(
        student_id=student_id,
        original_filename=file.filename,
        file_path=file_path,
        file_size=len(content),
        document_type=document_type,
        uploaded_by=current_user.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    log_action(db, "UPLOAD_DOCUMENT", "StudentDocument", current_user.id, entity_id=doc.id)
    db.commit()
    return success_response({"id": doc.id, "original_filename": doc.original_filename}, "Document uploaded")


@router.get("/{student_id}/documents/{doc_id}/file")
def serve_document(student_id: int, doc_id: int, db: Session = Depends(get_db), current_user=Depends(is_teacher_or_above)):
    doc = db.query(StudentDocument).filter(
        StudentDocument.id == doc_id,
        StudentDocument.student_id == student_id,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    return FileResponse(doc.file_path, media_type="application/pdf", filename=doc.original_filename)


@router.delete("/{student_id}/documents/{doc_id}")
def delete_document(student_id: int, doc_id: int, db: Session = Depends(get_db), current_user=Depends(is_principal_or_above)):
    doc = db.query(StudentDocument).filter(
        StudentDocument.id == doc_id,
        StudentDocument.student_id == student_id,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if os.path.exists(doc.file_path):
        os.remove(doc.file_path)
    db.delete(doc)
    db.commit()
    return success_response(None, "Document deleted")
