from decimal import Decimal
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.result import Result, ResultStatus


def compute_grade(total: Decimal) -> tuple[str, str]:
    t = float(total)
    if t >= 70:
        return "A", "Excellent"
    elif t >= 60:
        return "B", "Very Good"
    elif t >= 50:
        return "C", "Good"
    elif t >= 45:
        return "D", "Pass"
    elif t >= 40:
        return "E", "Fair"
    else:
        return "F", "Fail"


def apply_grade_fields(result: Result) -> Result:
    grade, remarks = compute_grade(result.total_score)
    result.grade = grade
    result.remarks = remarks
    return result


def create_result(db: Session, data, teacher_id: int) -> Result:
    total = data.ca_score + data.exam_score
    grade, remarks = compute_grade(total)
    result = Result(
        student_id=data.student_id,
        subject_id=data.subject_id,
        class_id=data.class_id,
        session_id=data.session_id,
        term_id=data.term_id,
        teacher_id=teacher_id,
        exam_type=data.exam_type,
        ca_score=data.ca_score,
        exam_score=data.exam_score,
        total_score=total,
        grade=grade,
        remarks=remarks,
        status=ResultStatus.DRAFT,
    )
    db.add(result)
    db.flush()
    return result


def get_result(db: Session, result_id: int) -> Optional[Result]:
    return db.query(Result).filter(Result.id == result_id).first()


def get_results_by_class_term(db: Session, class_id: int, term_id: int, session_id: int):
    return db.query(Result).filter(
        Result.class_id == class_id,
        Result.term_id == term_id,
        Result.session_id == session_id,
    ).all()


def get_student_results(db: Session, student_id: int, session_id: int, term_id: int):
    return db.query(Result).filter(
        Result.student_id == student_id,
        Result.session_id == session_id,
        Result.term_id == term_id,
        Result.status == ResultStatus.PUBLISHED,
    ).all()


def submit_results(db: Session, class_id: int, subject_id: int, term_id: int, session_id: int, teacher_id: int):
    db.query(Result).filter(
        Result.class_id == class_id,
        Result.subject_id == subject_id,
        Result.term_id == term_id,
        Result.session_id == session_id,
        Result.teacher_id == teacher_id,
        Result.status == ResultStatus.DRAFT,
    ).update({"status": ResultStatus.SUBMITTED}, synchronize_session=False)
    db.flush()


def approve_results(db: Session, class_id: int, term_id: int, session_id: int):
    db.query(Result).filter(
        Result.class_id == class_id,
        Result.term_id == term_id,
        Result.session_id == session_id,
        Result.status.in_([ResultStatus.SUBMITTED, ResultStatus.DRAFT]),
    ).update({"status": ResultStatus.APPROVED}, synchronize_session=False)
    db.flush()


def publish_results(db: Session, class_id: int, term_id: int, session_id: int):
    db.query(Result).filter(
        Result.class_id == class_id,
        Result.term_id == term_id,
        Result.session_id == session_id,
        Result.status.in_([ResultStatus.APPROVED, ResultStatus.SUBMITTED, ResultStatus.DRAFT]),
    ).update({"status": ResultStatus.PUBLISHED}, synchronize_session=False)
    db.flush()


def compute_class_positions(db: Session, class_id: int, term_id: int, session_id: int):
    """Compute average score per student and rank them."""
    results = db.query(
        Result.student_id,
        func.avg(Result.total_score).label("avg_score"),
    ).filter(
        Result.class_id == class_id,
        Result.term_id == term_id,
        Result.session_id == session_id,
        Result.status.in_([ResultStatus.APPROVED, ResultStatus.PUBLISHED]),
    ).group_by(Result.student_id).order_by(func.avg(Result.total_score).desc()).all()

    for rank, row in enumerate(results, start=1):
        db.query(Result).filter(
            Result.student_id == row.student_id,
            Result.class_id == class_id,
            Result.term_id == term_id,
            Result.session_id == session_id,
        ).update({"class_position": rank}, synchronize_session=False)
    db.flush()
    return len(results)
