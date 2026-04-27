from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import UserRole
from app.models.subject import TeacherSubjectClass
from app.schemas.result import ResultCreate, ResultOut, ResultUpdate
from app.crud.result import (
    create_result, get_result, get_results_by_class_term,
    get_student_results, submit_results, approve_results,
    publish_results, compute_class_positions
)
from app.utils.rbac import is_principal_or_above, is_teacher_or_above
from app.utils.auth import get_current_user
from app.utils.response import success_response
from app.utils.audit import log_action
from app.crud.staff import get_staff_by_user_id

router = APIRouter(prefix="/results", tags=["Results"])


def verify_teacher_assignment(db, teacher_id, subject_id, class_id):
    assignment = db.query(TeacherSubjectClass).filter(
        TeacherSubjectClass.teacher_id == teacher_id,
        TeacherSubjectClass.subject_id == subject_id,
        TeacherSubjectClass.class_id == class_id,
    ).first()
    if not assignment:
        raise HTTPException(status_code=403, detail="You are not assigned to teach this subject in this class")


@router.post("/")
def upload_result(data: ResultCreate, db: Session = Depends(get_db), current_user=Depends(is_teacher_or_above)):
    staff = get_staff_by_user_id(db, current_user.id)
    if current_user.role == UserRole.TEACHER:
        if not staff:
            raise HTTPException(status_code=403, detail="No staff profile found")
        verify_teacher_assignment(db, staff.id, data.subject_id, data.class_id)
    teacher_id = staff.id if staff else 1
    result = create_result(db, data, teacher_id)
    db.commit()
    return success_response(ResultOut.model_validate(result).model_dump(), "Result uploaded")


@router.put("/{result_id}")
def update_result(
    result_id: int, data: ResultUpdate,
    db: Session = Depends(get_db), current_user=Depends(is_teacher_or_above)
):
    result = get_result(db, result_id)
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    staff = get_staff_by_user_id(db, current_user.id)
    if current_user.role == UserRole.TEACHER:
        if not staff:
            raise HTTPException(status_code=403, detail="No staff profile found")
        verify_teacher_assignment(db, staff.id, result.subject_id, result.class_id)
    if data.ca_score is not None:
        result.ca_score = data.ca_score
    if data.exam_score is not None:
        result.exam_score = data.exam_score
    if data.remarks is not None:
        result.remarks = data.remarks
    result.total_score = result.ca_score + result.exam_score
    total = float(result.total_score)
    if total >= 70:
        result.grade = "A"
    elif total >= 60:
        result.grade = "B"
    elif total >= 50:
        result.grade = "C"
    elif total >= 40:
        result.grade = "D"
    else:
        result.grade = "F"
    db.commit()
    return success_response(ResultOut.model_validate(result).model_dump(), "Result updated")


@router.get("/class/{class_id}")
def class_results(
    class_id: int, term_id: int, session_id: int,
    db: Session = Depends(get_db), current_user=Depends(is_teacher_or_above)
):
    results = get_results_by_class_term(db, class_id, term_id, session_id)
    return success_response([ResultOut.model_validate(r).model_dump() for r in results])


@router.get("/student/{student_id}")
def student_results(
    student_id: int, session_id: int, term_id: int,
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
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
    results = get_student_results(db, student_id, session_id, term_id)
    return success_response([ResultOut.model_validate(r).model_dump() for r in results])


@router.get("/my")
def my_results(
    session_id: int, term_id: int,
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    from app.models.student import Student
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    results = get_student_results(db, student.id, session_id, term_id)
    return success_response([ResultOut.model_validate(r).model_dump() for r in results])


@router.post("/submit")
def submit(class_id: int, subject_id: int, term_id: int, db: Session = Depends(get_db), current_user=Depends(is_teacher_or_above)):
    staff = get_staff_by_user_id(db, current_user.id)
    if not staff:
        raise HTTPException(status_code=403, detail="No staff profile")
    submit_results(db, class_id, subject_id, term_id, staff.id)
    db.commit()
    return success_response(None, "Results submitted for approval")


@router.post("/approve")
def approve(class_id: int, term_id: int, db: Session = Depends(get_db), current_user=Depends(is_principal_or_above)):
    approve_results(db, class_id, term_id)
    log_action(db, "APPROVE_RESULTS", "Result", current_user.id, new_value={"class_id": class_id, "term_id": term_id})
    db.commit()
    return success_response(None, "Results approved")


@router.post("/publish")
def publish(class_id: int, term_id: int, db: Session = Depends(get_db), current_user=Depends(is_principal_or_above)):
    compute_class_positions(db, class_id, term_id, 0)
    publish_results(db, class_id, term_id)
    log_action(db, "PUBLISH_RESULTS", "Result", current_user.id, new_value={"class_id": class_id, "term_id": term_id})
    db.commit()
    return success_response(None, "Results published")


@router.post("/compute-positions")
def compute_positions(
    class_id: int, term_id: int, session_id: int,
    db: Session = Depends(get_db), current_user=Depends(is_principal_or_above)
):
    count = compute_class_positions(db, class_id, term_id, session_id)
    db.commit()
    return success_response({"students_ranked": count}, "Positions computed")
