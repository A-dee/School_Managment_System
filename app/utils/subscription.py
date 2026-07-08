from datetime import datetime, timezone
from typing import Any, Callable

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.school import SchoolConfig, SubscriptionTier
from app.models.student import Student, StudentStatus

UNLIMITED = None

TIER_CAPABILITIES: dict[SubscriptionTier, dict[str, Any]] = {
    SubscriptionTier.FREE: {
        "max_students": 50,
        "parent_portal": False,
        "payroll": False,
        "timetable": False,
    },
    SubscriptionTier.PRO: {
        "max_students": 300,
        "parent_portal": True,
        "payroll": False,
        "timetable": True,
    },
    SubscriptionTier.PREMIUM: {
        "max_students": UNLIMITED,
        "parent_portal": True,
        "payroll": True,
        "timetable": True,
    },
    SubscriptionTier.ENTERPRISE: {
        "max_students": UNLIMITED,
        "parent_portal": True,
        "payroll": True,
        "timetable": True,
        "multi_campus": True,
    },
}


def get_current_school_config(db: Session) -> SchoolConfig | None:
    return db.query(SchoolConfig).order_by(SchoolConfig.id.asc()).first()


def get_active_subscription_tier(config: SchoolConfig | None) -> SubscriptionTier:
    if not config:
        return SubscriptionTier.FREE
    if config.subscription_expires_at:
        expires_at = config.subscription_expires_at
        if expires_at.tzinfo is not None:
            expires_at = expires_at.astimezone(timezone.utc).replace(tzinfo=None)
        if expires_at < datetime.now(timezone.utc).replace(tzinfo=None):
            return SubscriptionTier.FREE
    return config.subscription_tier or SubscriptionTier.FREE


def get_tier_capabilities(config: SchoolConfig | None) -> dict[str, Any]:
    return TIER_CAPABILITIES[get_active_subscription_tier(config)]


def require_feature(feature_key: str) -> Callable[[Session], None]:
    def dependency(db: Session = Depends(get_db)) -> None:
        config = get_current_school_config(db)
        capabilities = get_tier_capabilities(config)
        if not capabilities.get(feature_key, False):
            tier = get_active_subscription_tier(config).value
            raise HTTPException(
                status_code=402,
                detail=f"Feature '{feature_key}' is not available on the active {tier} subscription tier.",
            )

    return dependency


def require_student_capacity(db: Session, additional_students: int = 1) -> None:
    config = get_current_school_config(db)
    capabilities = get_tier_capabilities(config)
    max_students = capabilities.get("max_students")
    if max_students is None:
        return

    active_count = db.query(Student).filter(Student.status == StudentStatus.ACTIVE).count()
    if active_count + additional_students > max_students:
        tier = get_active_subscription_tier(config).value
        raise HTTPException(
            status_code=402,
            detail=f"The active {tier} subscription tier allows up to {max_students} active students.",
        )
