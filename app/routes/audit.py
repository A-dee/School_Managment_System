from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.audit import AuditLog
from app.utils.rbac import is_principal_or_above
from app.utils.response import paginated_response

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])


@router.get("/")
def list_audit_logs(
    skip: int = 0, limit: int = 50,
    entity_type: Optional[str] = None,
    performed_by_user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user=Depends(is_principal_or_above)
):
    q = db.query(AuditLog).order_by(AuditLog.timestamp.desc())
    if entity_type:
        q = q.filter(AuditLog.entity_type == entity_type)
    if performed_by_user_id:
        q = q.filter(AuditLog.performed_by_user_id == performed_by_user_id)
    total = q.count()
    logs = q.offset(skip).limit(limit).all()
    return paginated_response(
        [{
            "id": l.id, "action": l.action, "entity_type": l.entity_type,
            "entity_id": l.entity_id, "performed_by_user_id": l.performed_by_user_id,
            "old_value": l.old_value, "new_value": l.new_value,
            "ip_address": l.ip_address, "timestamp": str(l.timestamp),
        } for l in logs],
        total, skip // limit + 1, limit
    )
