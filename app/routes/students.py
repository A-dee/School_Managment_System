import os
import secrets
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.student import StudentStatus
from app.models.student_registration import StudentRegistration, StudentMedical, StudentAboutMe
from app.models.student_document import StudentDocument
from app.schemas.student import (
    StudentCreate,
    StudentOut,
    StudentUpdate,
    StudentTransfer,
    BulkPromotion,
    StudentParentPortalCreate,
)
from app.schemas.student_registration import StudentRegistrationData, StudentMedicalData, StudentAboutMeData
from app.crud.student import (
    create_student, get_student_by_id, get_all_students, update_student,
    graduate_student, withdraw_student, transfer_student, bulk_promote,
    get_student_by_admission
)
from app.utils.rbac import is_principal_or_above, is_admin_or_above, is_teacher_or_above
from app.utils.response import success_response, paginated_response
from app.utils.audit import log_action
from app.utils.student_portal import (
    is_parent_managed_class_id,
    student_has_parent_portal_link,
    sync_student_portal_access,
)

UPLOAD_DIR = "uploads/students"

router = APIRouter(prefix="/students", tags=["Students"])


def _ensure_parent_portal_ready(db: Session, student_id: int, class_id: Optional[int]):
    if not is_parent_managed_class_id(db, class_id):
        return
    if not student_has_parent_portal_link(db, student_id):
        raise HTTPException(
            status_code=400,
            detail="This class is parent-managed. Link a parent account before assigning the student here.",
        )


def _get_teacher_staff_and_class_id(db: Session, current_user):
    from app.models.user import UserRole
    from app.models.staff import Staff
    from app.models.class_ import Class

    if current_user.role != UserRole.TEACHER:
        return None, None
    staff = db.query(Staff).filter(Staff.user_id == current_user.id).first()
    if not staff:
        raise HTTPException(status_code=403, detail="Staff profile not found")
    cls = db.query(Class).filter(Class.class_teacher_id == staff.id).first()
    if not cls:
        raise HTTPException(status_code=403, detail="You are not assigned as a class teacher")
    return staff, cls.id


def _assert_teacher_can_access_student(db: Session, current_user, student):
    _, allowed_class_id = _get_teacher_staff_and_class_id(db, current_user)
    if allowed_class_id is None:
        return
    if student.current_class_id != allowed_class_id:
        raise HTTPException(status_code=403, detail="You can only access students in your own class")


def _build_student_portal_email(admission_number: str) -> str:
    return admission_number.lower().replace("/", ".").replace(" ", "") + "@student.portal"


def _link_parent_to_student(db: Session, parent_id: int, student_id: int) -> None:
    from app.models.parent import ParentStudent

    existing_link = db.query(ParentStudent).filter(
        ParentStudent.parent_id == parent_id,
        ParentStudent.student_id == student_id,
    ).first()
    if not existing_link:
        db.add(ParentStudent(parent_id=parent_id, student_id=student_id))


def _get_or_create_parent_account(
    db: Session,
    guardian_email: str,
    guardian_name: Optional[str],
    guardian_phone: Optional[str],
):
    from app.models.parent import Parent
    from app.models.user import User, UserRole
    from app.utils.auth import hash_password

    credentials: dict = {"parent_email": guardian_email}
    parent_created = False

    existing_user = db.query(User).filter(User.email == guardian_email).first()
    if existing_user:
        if existing_user.role != UserRole.PARENT:
            raise HTTPException(status_code=400, detail="This email already belongs to a non-parent account")
        parent_user = existing_user
        credentials["parent_note"] = "Linked to existing account - parent password unchanged"
    else:
        parent_password = secrets.token_urlsafe(8)
        parent_user = User(
            email=guardian_email,
            hashed_password=hash_password(parent_password),
            role=UserRole.PARENT,
            is_active=True,
            is_verified=True,
        )
        db.add(parent_user)
        db.flush()
        credentials["parent_password"] = parent_password
        parent_created = True

    parent = db.query(Parent).filter(Parent.user_id == parent_user.id).first()
    if not parent:
        parent = Parent(
            user_id=parent_user.id,
            full_name=guardian_name or "Parent/Guardian",
            phone=guardian_phone,
            email=guardian_email,
        )
        db.add(parent)
        db.flush()
    else:
        if guardian_name and not parent.full_name:
            parent.full_name = guardian_name
        if guardian_phone and not parent.phone:
            parent.phone = guardian_phone
        if guardian_email and not parent.email:
            parent.email = guardian_email

    return parent, credentials, parent_created


@router.post("/")
def add_student(data: StudentCreate, db: Session = Depends(get_db), current_user=Depends(is_admin_or_above)):
    from app.models.parent import Parent
    from app.models.user import User, UserRole
    from app.utils.auth import hash_password
    from app.utils.email import send_login_credentials

    if get_student_by_admission(db, data.admission_number):
        raise HTTPException(status_code=400, detail="Admission number already exists")

    parent_managed_class = is_parent_managed_class_id(db, data.current_class_id)
    if parent_managed_class and data.parent_link_mode == "GUARDIAN_ONLY":
        raise HTTPException(
            status_code=400,
            detail="This class uses parent-only portal access. Link an existing parent or create a parent portal.",
        )

    student = create_student(db, data)

    credentials: dict = {
        "portal_mode": "PARENT_ONLY" if parent_managed_class else ("STUDENT_AND_PARENT" if data.create_student_login else "GUARDIAN_ONLY"),
    }
    parent_created = False

    if not parent_managed_class and data.create_student_login:
        student_email = _build_student_portal_email(data.admission_number)
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
        credentials["student_email"] = student_email
        credentials["student_password"] = student_password

    # Legacy auto-create path kept disabled while the explicit parent-link modes handle registration.
    if False and data.guardian_email:
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
            parent_created = True

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

    if data.parent_link_mode == "EXISTING_PARENT":
        if not data.existing_parent_id:
            raise HTTPException(status_code=400, detail="Select an existing parent to continue")
        parent = db.query(Parent).filter(Parent.id == data.existing_parent_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Selected parent was not found")
        _link_parent_to_student(db, parent.id, student.id)
        credentials["parent_email"] = parent.email or (parent.user.email if parent.user else None)
        credentials["parent_note"] = "Linked to existing parent account"
    elif data.parent_link_mode == "NEW_PARENT_PORTAL":
        if not data.guardian_email:
            raise HTTPException(status_code=400, detail="Parent email is required to create a parent portal")
        parent, parent_credentials, parent_created = _get_or_create_parent_account(
            db,
            data.guardian_email,
            data.guardian_name,
            data.guardian_phone,
        )
        _link_parent_to_student(db, parent.id, student.id)
        credentials.update(parent_credentials)

    log_action(db, "CREATE_STUDENT", "Student", current_user.id, entity_id=student.id)
    db.commit()
    if credentials.get("student_email") and credentials.get("student_password"):
        send_login_credentials(
            db,
            credentials["student_email"],
            f"{student.first_name} {student.last_name}".strip(),
            credentials["student_password"],
            "Student",
        )
    if parent_created and credentials.get("parent_email") and credentials.get("parent_password"):
        send_login_credentials(
            db,
            credentials["parent_email"],
            data.guardian_name or "Parent/Guardian",
            credentials["parent_password"],
            "Parent",
        )
    return success_response(
        {**StudentOut.model_validate(student).model_dump(), "credentials": credentials},
        "Student created",
    )


@router.post("/{student_id}/create-student-portal")
def create_student_portal(student_id: int, db: Session = Depends(get_db), current_user=Depends(is_admin_or_above)):
    from app.models.user import User, UserRole
    from app.utils.auth import hash_password
    from app.utils.email import send_login_credentials

    student = get_student_by_id(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if student.user_id:
        raise HTTPException(status_code=400, detail="Student portal already exists")
    if is_parent_managed_class_id(db, student.current_class_id):
        raise HTTPException(status_code=400, detail="This class uses parent-only portal access")

    student_email = _build_student_portal_email(student.admission_number)
    if db.query(User).filter(User.email == student_email).first():
        raise HTTPException(status_code=400, detail="Default student portal email is already in use")

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
    sync_student_portal_access(db, student)
    log_action(db, "CREATE_STUDENT_PORTAL", "Student", current_user.id, entity_id=student.id)
    db.commit()
    send_login_credentials(
        db,
        student_email,
        f"{student.first_name} {student.last_name}".strip(),
        student_password,
        "Student",
    )
    return success_response(
        {"student_email": student_email, "student_password": student_password},
        "Student portal created",
    )


@router.post("/{student_id}/create-parent-portal")
def create_parent_portal(
    student_id: int,
    data: StudentParentPortalCreate,
    db: Session = Depends(get_db),
    current_user=Depends(is_admin_or_above),
):
    from app.models.parent import Parent
    from app.utils.email import send_login_credentials

    student = get_student_by_id(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    guardian_name = data.guardian_name or student.guardian_name
    guardian_phone = data.guardian_phone or student.guardian_phone
    guardian_email = data.guardian_email or student.guardian_email

    if data.guardian_name is not None:
        student.guardian_name = data.guardian_name
    if data.guardian_phone is not None:
        student.guardian_phone = data.guardian_phone
    if data.guardian_email is not None:
        student.guardian_email = data.guardian_email

    if data.existing_parent_id:
        parent = db.query(Parent).filter(Parent.id == data.existing_parent_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Selected parent was not found")
        _link_parent_to_student(db, parent.id, student.id)
        log_action(db, "LINK_PARENT_PORTAL", "Student", current_user.id, entity_id=student.id)
        db.commit()
        return success_response(
            {
                "parent_email": parent.email or (parent.user.email if parent.user else None),
                "parent_note": "Linked to existing parent account",
            },
            "Parent linked",
        )

    if not guardian_email:
        raise HTTPException(status_code=400, detail="Guardian email is required to create a parent portal")

    parent, credentials, parent_created = _get_or_create_parent_account(
        db,
        guardian_email,
        guardian_name,
        guardian_phone,
    )
    _link_parent_to_student(db, parent.id, student.id)
    log_action(db, "CREATE_PARENT_PORTAL", "Student", current_user.id, entity_id=student.id)
    db.commit()

    if parent_created and credentials.get("parent_password"):
        send_login_credentials(
            db,
            credentials["parent_email"],
            guardian_name or "Parent/Guardian",
            credentials["parent_password"],
            "Parent",
        )
    return success_response(credentials, "Parent portal created")


@router.patch("/{student_id}/assign-class")
def assign_student_to_class(
    student_id: int,
    class_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(is_teacher_or_above),
):
    from app.models.user import UserRole
    from app.models.staff import Staff
    from app.models.class_ import Class

    student = get_student_by_id(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if current_user.role == UserRole.TEACHER:
        staff = db.query(Staff).filter(Staff.user_id == current_user.id).first()
        if not staff:
            raise HTTPException(status_code=403, detail="Staff profile not found")
        cls = db.query(Class).filter(
            Class.id == class_id,
            Class.class_teacher_id == staff.id,
        ).first()
        if not cls:
            raise HTTPException(status_code=403, detail="You can only enroll students into your own class")

    _ensure_parent_portal_ready(db, student.id, class_id)
    student.current_class_id = class_id
    sync_student_portal_access(db, student)
    log_action(db, "ASSIGN_CLASS", "Student", current_user.id, entity_id=student_id,
               new_value={"class_id": class_id})
    db.commit()
    return success_response(None, "Student enrolled in class")


@router.get("/")
def list_students(
    skip: int = 0, limit: int = 50,
    class_id: Optional[int] = None, status: Optional[StudentStatus] = None, search: Optional[str] = None,
    db: Session = Depends(get_db), current_user=Depends(is_teacher_or_above)
):
    _, teacher_class_id = _get_teacher_staff_and_class_id(db, current_user)
    if teacher_class_id is not None:
        if class_id is not None and class_id != teacher_class_id:
            raise HTTPException(status_code=403, detail="You can only view students in your own class")
        class_id = teacher_class_id
    students, total = get_all_students(db, skip=skip, limit=limit, class_id=class_id, status=status, search=search)
    return paginated_response([StudentOut.model_validate(s).model_dump() for s in students], total, skip // limit + 1, limit)


@router.get("/{student_id}")
def get_student(student_id: int, db: Session = Depends(get_db), current_user=Depends(is_teacher_or_above)):
    student = get_student_by_id(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    _assert_teacher_can_access_student(db, current_user, student)
    return success_response(StudentOut.model_validate(student).model_dump())


@router.patch("/{student_id}/scholarship")
def set_scholarship(
    student_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(is_principal_or_above),
    percentage: int = 0,
):
    from pydantic import BaseModel
    student = get_student_by_id(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if percentage not in (0, 25, 50, 75, 100):
        raise HTTPException(status_code=400, detail="Percentage must be 0, 25, 50, 75, or 100")
    student.scholarship_percentage = percentage
    db.commit()
    return success_response({"scholarship_percentage": percentage}, "Scholarship updated")


@router.put("/{student_id}")
def update_student_info(
    student_id: int, data: StudentUpdate,
    db: Session = Depends(get_db), current_user=Depends(is_admin_or_above)
):
    student = get_student_by_id(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    target_class_id = data.current_class_id if data.current_class_id is not None else student.current_class_id
    _ensure_parent_portal_ready(db, student.id, target_class_id)
    updated = update_student(db, student, data)
    sync_student_portal_access(db, updated)
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
    _ensure_parent_portal_ready(db, student.id, data.new_class_id)
    transfer_student(db, student, data.new_class_id)
    sync_student_portal_access(db, student)
    log_action(db, "TRANSFER_STUDENT", "Student", current_user.id, entity_id=student_id,
               old_value={"class_id": old_class}, new_value={"class_id": data.new_class_id})
    db.commit()
    return success_response(None, "Student transferred")


@router.delete("/{student_id}")
def delete_student_record(student_id: int, db: Session = Depends(get_db), current_user=Depends(is_principal_or_above)):
    from app.models.parent import ParentStudent
    from app.models.attendance import Attendance
    from app.models.discipline import Discipline
    from app.models.result import Result
    from app.models.report_card_meta import ReportCardMeta
    from app.models.student_registration import StudentRegistration, StudentMedical, StudentAboutMe
    from app.models.student_document import StudentDocument
    from app.models.finance import Invoice, Payment, PaymentDeclaration, PaystackTransaction, PaystackTransactionStatus
    student = get_student_by_id(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    invoice_ids = [row[0] for row in db.query(Invoice.id).filter(Invoice.student_id == student_id).all()]
    has_financial_history = bool(
        invoice_ids and (
            db.query(Payment.id).filter(Payment.invoice_id.in_(invoice_ids)).first()
            or db.query(PaystackTransaction.id).filter(
                PaystackTransaction.student_id == student_id,
                PaystackTransaction.status == PaystackTransactionStatus.SUCCESS,
            ).first()
        )
    )
    if has_financial_history:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete: this student has recorded fee payments. Withdraw the student instead.",
        )

    log_action(db, "DELETE_STUDENT", "Student", current_user.id, entity_id=student_id,
               old_value={"name": f"{student.first_name} {student.last_name}"})
    if invoice_ids:
        db.query(PaymentDeclaration).filter(PaymentDeclaration.invoice_id.in_(invoice_ids)).delete(synchronize_session=False)
        db.query(PaystackTransaction).filter(PaystackTransaction.student_id == student_id).delete(synchronize_session=False)
        db.query(Payment).filter(Payment.invoice_id.in_(invoice_ids)).delete(synchronize_session=False)
        db.query(Invoice).filter(Invoice.id.in_(invoice_ids)).delete(synchronize_session=False)
    db.query(ParentStudent).filter(ParentStudent.student_id == student_id).delete(synchronize_session=False)
    db.query(Attendance).filter(Attendance.student_id == student_id).delete(synchronize_session=False)
    db.query(Discipline).filter(Discipline.student_id == student_id).delete(synchronize_session=False)
    db.query(Result).filter(Result.student_id == student_id).delete(synchronize_session=False)
    db.query(ReportCardMeta).filter(ReportCardMeta.student_id == student_id).delete(synchronize_session=False)
    db.query(StudentRegistration).filter(StudentRegistration.student_id == student_id).delete(synchronize_session=False)
    db.query(StudentMedical).filter(StudentMedical.student_id == student_id).delete(synchronize_session=False)
    db.query(StudentAboutMe).filter(StudentAboutMe.student_id == student_id).delete(synchronize_session=False)
    db.query(StudentDocument).filter(StudentDocument.student_id == student_id).delete(synchronize_session=False)
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
    for student_id in data.student_ids:
        _ensure_parent_portal_ready(db, student_id, data.to_class_id)
    count = bulk_promote(db, data.student_ids, data.to_class_id)
    for student_id in data.student_ids:
        student = get_student_by_id(db, student_id)
        if student:
            sync_student_portal_access(db, student)
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
def get_registration(student_id: int, db: Session = Depends(get_db), current_user=Depends(is_principal_or_above)):
    student = get_student_by_id(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    _assert_teacher_can_access_student(db, current_user, student)
    r = db.query(StudentRegistration).filter(StudentRegistration.student_id == student_id).first()
    return success_response(StudentRegistrationData.model_validate(r).model_dump() if r else None)


@router.put("/{student_id}/registration")
def save_registration(student_id: int, data: StudentRegistrationData, db: Session = Depends(get_db), current_user=Depends(is_teacher_or_above)):
    student = get_student_by_id(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    _assert_teacher_can_access_student(db, current_user, student)
    _upsert(db, StudentRegistration, student_id, data)
    return success_response(None, "Registration saved")


@router.get("/{student_id}/medical")
def get_medical(student_id: int, db: Session = Depends(get_db), current_user=Depends(is_principal_or_above)):
    student = get_student_by_id(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    _assert_teacher_can_access_student(db, current_user, student)
    r = db.query(StudentMedical).filter(StudentMedical.student_id == student_id).first()
    return success_response(StudentMedicalData.model_validate(r).model_dump() if r else None)


@router.put("/{student_id}/medical")
def save_medical(student_id: int, data: StudentMedicalData, db: Session = Depends(get_db), current_user=Depends(is_principal_or_above)):
    student = get_student_by_id(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    _assert_teacher_can_access_student(db, current_user, student)
    _upsert(db, StudentMedical, student_id, data)
    return success_response(None, "Medical information saved")


@router.get("/{student_id}/about-me")
def get_about_me(student_id: int, db: Session = Depends(get_db), current_user=Depends(is_principal_or_above)):
    student = get_student_by_id(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    _assert_teacher_can_access_student(db, current_user, student)
    r = db.query(StudentAboutMe).filter(StudentAboutMe.student_id == student_id).first()
    return success_response(StudentAboutMeData.model_validate(r).model_dump() if r else None)


@router.put("/{student_id}/about-me")
def save_about_me(student_id: int, data: StudentAboutMeData, db: Session = Depends(get_db), current_user=Depends(is_teacher_or_above)):
    student = get_student_by_id(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    _assert_teacher_can_access_student(db, current_user, student)
    _upsert(db, StudentAboutMe, student_id, data)
    return success_response(None, "About Me information saved")


@router.get("/{student_id}/documents")
def list_documents(student_id: int, db: Session = Depends(get_db), current_user=Depends(is_teacher_or_above)):
    student = get_student_by_id(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    _assert_teacher_can_access_student(db, current_user, student)
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
    student = get_student_by_id(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    _assert_teacher_can_access_student(db, current_user, student)
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
    student = get_student_by_id(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    _assert_teacher_can_access_student(db, current_user, student)
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
