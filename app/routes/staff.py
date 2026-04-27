from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.staff import StaffType
from app.schemas.staff import StaffCreate, StaffOut, StaffUpdate
from app.crud.staff import create_staff, get_staff_by_id, get_all_staff, update_staff, delete_staff
from app.utils.rbac import is_principal_or_above, is_admin_or_above
from app.utils.response import success_response, paginated_response
from app.utils.audit import log_action
from app.utils.email import send_login_credentials

router = APIRouter(prefix="/staff", tags=["Staff"])


@router.post("/")
def add_staff(data: StaffCreate, db: Session = Depends(get_db), current_user=Depends(is_principal_or_above)):
    from app.crud.user import get_user_by_email
    if get_user_by_email(db, data.user_email):
        raise HTTPException(status_code=400, detail="Email already registered")
    staff = create_staff(db, data)
    log_action(db, "CREATE_STAFF", "Staff", current_user.id, entity_id=staff.id, new_value={"name": staff.full_name})
    db.commit()
    send_login_credentials(db, data.user_email, staff.full_name, data.user_password, str(data.staff_type))
    return success_response(StaffOut.model_validate(staff).model_dump(), "Staff created")


@router.get("/")
def list_staff(
    skip: int = 0, limit: int = 50, staff_type: Optional[StaffType] = None,
    db: Session = Depends(get_db), current_user=Depends(is_admin_or_above)
):
    staff_list, total = get_all_staff(db, skip=skip, limit=limit, staff_type=staff_type)
    return paginated_response([StaffOut.model_validate(s).model_dump() for s in staff_list], total, skip // limit + 1, limit)


@router.get("/{staff_id}")
def get_staff(staff_id: int, db: Session = Depends(get_db), current_user=Depends(is_admin_or_above)):
    staff = get_staff_by_id(db, staff_id)
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    return success_response(StaffOut.model_validate(staff).model_dump())


@router.put("/{staff_id}")
def update_staff_info(
    staff_id: int, data: StaffUpdate,
    db: Session = Depends(get_db), current_user=Depends(is_principal_or_above)
):
    staff = get_staff_by_id(db, staff_id)
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    updated = update_staff(db, staff, data)
    log_action(db, "UPDATE_STAFF", "Staff", current_user.id, entity_id=staff_id)
    db.commit()
    return success_response(StaffOut.model_validate(updated).model_dump(), "Staff updated")


@router.delete("/{staff_id}")
def remove_staff(staff_id: int, db: Session = Depends(get_db), current_user=Depends(is_principal_or_above)):
    staff = get_staff_by_id(db, staff_id)
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    log_action(db, "DELETE_STAFF", "Staff", current_user.id, entity_id=staff_id, old_value={"name": staff.full_name})
    delete_staff(db, staff)
    db.commit()
    return success_response(None, "Staff deleted")
