from datetime import datetime
from typing import Optional, Any
from sqlalchemy.orm import Session
from app.models.audit import AuditLog


def log_action(
    db: Session,
    action: str,
    entity_type: str,
    performed_by_user_id: int,
    entity_id: Optional[int] = None,
    old_value: Optional[Any] = None,
    new_value: Optional[Any] = None,
    ip_address: Optional[str] = None,
):
    entry = AuditLog(
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        performed_by_user_id=performed_by_user_id,
        old_value=old_value,
        new_value=new_value,
        ip_address=ip_address,
        timestamp=datetime.utcnow(),
    )
    db.add(entry)
    db.flush()
    return entry
