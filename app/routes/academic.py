from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.academic import AcademicSession, Term
from app.schemas.academic import SessionCreate, SessionOut, TermCreate, TermUpdate, TermOut
from app.utils.rbac import is_principal_or_above, is_teacher_or_above
from app.utils.response import success_response

router = APIRouter(prefix="/academic", tags=["Academic"])


@router.post("/sessions")
def create_session(data: SessionCreate, db: Session = Depends(get_db), current_user=Depends(is_principal_or_above)):
    if data.is_current:
        db.query(AcademicSession).update({"is_current": False})
    session = AcademicSession(**data.model_dump())
    db.add(session)
    db.commit()
    db.refresh(session)
    return success_response(SessionOut.model_validate(session).model_dump(), "Session created")


@router.get("/sessions")
def list_sessions(db: Session = Depends(get_db), current_user=Depends(is_teacher_or_above)):
    sessions = db.query(AcademicSession).all()
    return success_response([SessionOut.model_validate(s).model_dump() for s in sessions])


@router.get("/sessions/current")
def current_session(db: Session = Depends(get_db), current_user=Depends(is_teacher_or_above)):
    session = db.query(AcademicSession).filter(AcademicSession.is_current == True).first()
    if not session:
        raise HTTPException(status_code=404, detail="No current session set")
    return success_response(SessionOut.model_validate(session).model_dump())


@router.post("/terms")
def create_term(data: TermCreate, db: Session = Depends(get_db), current_user=Depends(is_principal_or_above)):
    if data.is_current:
        db.query(Term).update({"is_current": False})
    term = Term(**data.model_dump())
    db.add(term)
    db.commit()
    db.refresh(term)
    return success_response(TermOut.model_validate(term).model_dump(), "Term created")


@router.get("/terms")
def list_terms(session_id: Optional[int] = None, db: Session = Depends(get_db), current_user=Depends(is_teacher_or_above)):
    q = db.query(Term)
    if session_id:
        q = q.filter(Term.session_id == session_id)
    terms = q.all()
    return success_response([TermOut.model_validate(t).model_dump() for t in terms])


@router.get("/terms/current")
def current_term(db: Session = Depends(get_db), current_user=Depends(is_teacher_or_above)):
    term = db.query(Term).filter(Term.is_current == True).first()
    if not term:
        raise HTTPException(status_code=404, detail="No current term set")
    return success_response(TermOut.model_validate(term).model_dump())


@router.put("/terms/{term_id}")
def update_term(term_id: int, data: TermUpdate, db: Session = Depends(get_db), current_user=Depends(is_principal_or_above)):
    term = db.query(Term).filter(Term.id == term_id).first()
    if not term:
        raise HTTPException(status_code=404, detail="Term not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(term, field, value)
    db.commit()
    db.refresh(term)
    return success_response(TermOut.model_validate(term).model_dump(), "Term updated")


@router.delete("/terms/{term_id}")
def delete_term(term_id: int, db: Session = Depends(get_db), current_user=Depends(is_principal_or_above)):
    term = db.query(Term).filter(Term.id == term_id).first()
    if not term:
        raise HTTPException(status_code=404, detail="Term not found")
    db.delete(term)
    db.commit()
    return success_response(None, "Term deleted")


@router.delete("/sessions/{session_id}")
def delete_session(session_id: int, db: Session = Depends(get_db), current_user=Depends(is_principal_or_above)):
    session = db.query(AcademicSession).filter(AcademicSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.query(Term).filter(Term.session_id == session_id).delete()
    db.delete(session)
    db.commit()
    return success_response(None, "Session deleted")


@router.patch("/sessions/{session_id}/set-current")
def set_current_session(session_id: int, db: Session = Depends(get_db), current_user=Depends(is_principal_or_above)):
    session = db.query(AcademicSession).filter(AcademicSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.query(AcademicSession).update({"is_current": False})
    session.is_current = True
    db.commit()
    return success_response(SessionOut.model_validate(session).model_dump(), "Current session updated")


@router.patch("/terms/{term_id}/set-current")
def set_current_term(term_id: int, db: Session = Depends(get_db), current_user=Depends(is_principal_or_above)):
    term = db.query(Term).filter(Term.id == term_id).first()
    if not term:
        raise HTTPException(status_code=404, detail="Term not found")
    db.query(Term).update({"is_current": False})
    term.is_current = True
    db.commit()
    return success_response(TermOut.model_validate(term).model_dump(), "Current term updated")
