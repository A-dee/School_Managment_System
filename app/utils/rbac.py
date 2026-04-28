from fastapi import Depends, HTTPException, status
from app.models.user import User, UserRole
from app.utils.auth import get_current_user


def require_roles(*roles: UserRole):
    def checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {[r.value for r in roles]}"
            )
        return current_user
    return checker


def is_super_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Super admin access required")
    return current_user


def is_principal_or_above(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in (UserRole.SUPER_ADMIN, UserRole.PRINCIPAL, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Principal or above access required")
    return current_user


def is_admin_or_above(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in (UserRole.SUPER_ADMIN, UserRole.PRINCIPAL, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Admin or above access required")
    return current_user


def is_vp_or_above(current_user: User = Depends(get_current_user)) -> User:
    """SUPER_ADMIN + PRINCIPAL (Vice Principal) only — excludes ADMIN (Principal)."""
    if current_user.role not in (UserRole.SUPER_ADMIN, UserRole.PRINCIPAL):
        raise HTTPException(status_code=403, detail="Vice Principal or above access required")
    return current_user


def is_teacher_or_above(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in (UserRole.SUPER_ADMIN, UserRole.PRINCIPAL, UserRole.ADMIN, UserRole.TEACHER):
        raise HTTPException(status_code=403, detail="Teacher or above access required")
    return current_user


def is_parent(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.PARENT:
        raise HTTPException(status_code=403, detail="Parent access required")
    return current_user


ROLE_PERMISSIONS = {
    UserRole.SUPER_ADMIN: {"*"},
    UserRole.PRINCIPAL: {
        "create_staff", "assign_classes", "approve_subjects", "approve_results",
        "approve_expenses", "graduate_students", "view_financial_reports",
        "view_audit_logs", "record_payments", "manage_invoices", "process_payroll",
        "transfer_students", "view_all_students", "view_all_attendance",
    },
    UserRole.ADMIN: {
        "record_payments", "manage_invoices", "record_expenses", "process_payroll",
        "view_students", "manage_fee_structure",
    },
    UserRole.TEACHER: {
        "create_subjects", "upload_results", "mark_attendance", "create_discipline_records",
        "view_assigned_classes",
    },
    UserRole.PARENT: {
        "view_own_children", "view_children_fees", "view_children_results",
        "view_children_attendance", "view_children_discipline",
    },
    UserRole.STUDENT: {
        "view_own_results", "view_own_fees",
    },
    UserRole.NON_TEACHING_STAFF: {
        "view_own_salary",
    },
}


def has_permission(user: User, permission: str) -> bool:
    perms = ROLE_PERMISSIONS.get(user.role, set())
    return "*" in perms or permission in perms
