# Backend Security and Code Review Audit

## [CRITICAL] Security / Logic Issues

### 1. Insecure default JWT secrets allow token forgery

Fault: `app/config.py`

```python
SECRET_KEY: str = "change-this-in-production"
REFRESH_SECRET_KEY: str = "change-this-refresh-key"
```

If production ever runs with defaults, anyone with repo access can forge access/refresh tokens.

Recommended fix:

```python
from pydantic import field_validator

@field_validator("SECRET_KEY", "REFRESH_SECRET_KEY")
@classmethod
def reject_insecure_secret(cls, value: str) -> str:
    if value.startswith("change-this") or len(value) < 32:
        raise ValueError("Secure secret must be configured")
    return value
```

Also fail startup when `ENVIRONMENT != "development"` and secrets are defaults.

### 2. Payment declaration IDOR: non-parent users can declare payment for any invoice

Fault: `app/routes/finance.py`

```python
invoice = db.query(Invoice).filter(Invoice.id == data.invoice_id).first()
...
if current_user.role == UserRole.PARENT:
    ...
    if not link:
        raise HTTPException(status_code=403, detail="Not your child's invoice")
decl = PaymentDeclaration(...)
```

Only parents are ownership-checked. Students, teachers, and other authenticated users can submit declarations against arbitrary invoice IDs.

Recommended fix:

```python
invoice = db.query(Invoice).filter(Invoice.id == data.invoice_id).first()
if not invoice:
    raise HTTPException(status_code=404, detail="Invoice not found")

_assert_user_can_access_invoice(db, current_user, invoice)

if current_user.role == UserRole.PARENT:
    _assert_parent_declared_amount_matches_schedule(invoice, data.declared_amount, data.payment_option)
elif current_user.role not in {UserRole.ADMIN, UserRole.PRINCIPAL, UserRole.SUPER_ADMIN}:
    raise HTTPException(status_code=403, detail="Only parents or admins can declare payments")
```

### 3. Message thread injection via unchecked `parent_message_id`

Fault: `app/routes/messages.py`

```python
msg = Message(
    sender_user_id=current_user.id,
    recipient_user_id=data.recipient_user_id,
    subject=data.subject,
    body=data.body,
    parent_message_id=data.parent_message_id,
)
```

A user can provide any `parent_message_id`, injecting a message into another thread. Thread reads include all replies by parent ID:

```python
replies = db.query(Message).filter(Message.parent_message_id == msg.id).all()
```

Recommended fix:

```python
if data.parent_message_id is not None:
    root = _get_thread_root(db, data.parent_message_id)
    if not root:
        raise HTTPException(status_code=404, detail="Thread not found")
    if current_user.id not in {root.sender_user_id, root.recipient_user_id}:
        raise HTTPException(status_code=403, detail="Access denied")
    if data.recipient_user_id not in {root.sender_user_id, root.recipient_user_id}:
        raise HTTPException(status_code=400, detail="Invalid thread recipient")
```

Better: remove `parent_message_id` from normal send and force replies through `POST /messages/{message_id}/reply`.

### 4. Published or approved results can be modified by assigned teachers/admins

Fault: `app/routes/results.py`

```python
if data.ca_score is not None:
    result.ca_score = data.ca_score
...
apply_grade_fields(result)
db.commit()
```

There is no status guard. A teacher assigned to the class/subject can edit a result after it is `SUBMITTED`, `APPROVED`, or `PUBLISHED`.

Recommended fix:

```python
from app.models.result import ResultStatus

if result.status not in {ResultStatus.DRAFT, ResultStatus.SUBMITTED}:
    raise HTTPException(status_code=400, detail="Approved or published results cannot be edited")

if current_user.role == UserRole.TEACHER and result.status != ResultStatus.DRAFT:
    raise HTTPException(status_code=403, detail="Submitted results require admin reopen")
```

Add an explicit "reopen result" admin route with audit logging.

### 5. Attendance check-in lets any teacher/admin mark any student

Fault: `app/routes/attendance_checkin.py`

```python
student = db.query(Student).filter(Student.admission_number == data.admission_number).first()
...
current_user=Depends(is_teacher_or_above)
```

Any teacher can check in/out any student by admission number. This bypasses class-teacher ownership used in `app/routes/attendance.py`.

Recommended fix:

```python
if current_user.role == UserRole.TEACHER:
    staff = get_staff_by_user_id(db, current_user.id)
    cls = db.query(Class).filter(
        Class.id == student.current_class_id,
        Class.class_teacher_id == staff.id,
    ).first()
    if not cls:
        raise HTTPException(status_code=403, detail="You can only check in students in your class")
```

Also consider a dedicated scanner role instead of `is_teacher_or_above`.

## [WARNING] Bugs / Edge Cases / Performance

### 6. Refresh tokens are stateless and cannot be revoked or rotated

Fault: `app/utils/auth.py`

```python
def create_refresh_token(data: dict) -> str:
    ...
    return jwt.encode(to_encode, settings.REFRESH_SECRET_KEY, algorithm=settings.ALGORITHM)
```

There is no token ID, server-side session table, rotation, reuse detection, or logout invalidation.

Recommended fix:

- Add `refresh_token_sessions` table with `jti`, `user_id`, `expires_at`, `revoked_at`.
- Store only a hash of the refresh token.
- Rotate refresh tokens on every `/refresh`.
- Revoke all sessions on password reset.

### 7. Finance proof upload lacks file validation and reads whole file into memory

Fault: `app/routes/finance.py`

```python
ext = file.filename.split(".")[-1]
...
with open(filepath, "wb") as f:
    f.write(await file.read())
```

`MAX_UPLOAD_SIZE` is unused. Any extension can be uploaded, and large files can exhaust memory.

Recommended fix:

```python
allowed = {"jpg", "jpeg", "png", "pdf"}
ext = file.filename.rsplit(".", 1)[-1].lower()
if ext not in allowed:
    raise HTTPException(400, "Unsupported file type")

size = 0
with open(filepath, "wb") as out:
    while chunk := await file.read(1024 * 1024):
        size += len(chunk)
        if size > settings.MAX_UPLOAD_SIZE:
            raise HTTPException(413, "File too large")
        out.write(chunk)
```

### 8. Payment confirmation race can double-apply declarations

Fault: `app/routes/finance.py`

```python
decl = db.query(PaymentDeclaration).filter(PaymentDeclaration.id == decl_id).first()
if decl.status != PaymentDeclarationStatus.PENDING:
    ...
decl.status = PaymentDeclarationStatus.CONFIRMED
...
db.add(payment)
```

Two admins can confirm the same declaration concurrently before either commits.

Recommended fix:

```python
decl = (
    db.query(PaymentDeclaration)
    .filter(PaymentDeclaration.id == decl_id)
    .with_for_update()
    .first()
)
```

Also add a unique reference/idempotency key for declaration-created payments.

### 9. N+1 queries in messaging contact and broadcast flows

Fault: `app/routes/messages.py`

```python
for link in links:
    student = db.query(Student).filter(Student.id == link.student_id).first()
    cls = db.query(Class).filter(Class.id == student.current_class_id).first()
    teacher = db.query(Staff).filter(Staff.id == cls.class_teacher_id).first()
```

Same issue exists in class parent broadcast recipient lookup.

Recommended fix: use joins or `selectinload`.

```python
rows = (
    db.query(Staff.user_id)
    .join(Class, Class.class_teacher_id == Staff.id)
    .join(Student, Student.current_class_id == Class.id)
    .join(ParentStudent, ParentStudent.student_id == Student.id)
    .filter(ParentStudent.parent_id == parent.id)
    .all()
)
```

### 10. Invoice generation is O(students x fee lookups)

Fault: `app/crud/finance.py`

```python
students = db.query(Student).filter(Student.status == StudentStatus.ACTIVE).all()
for student in students:
    fs = get_fee_structure_for_student(db, student, session_id, term_id)
    existing = db.query(Invoice).filter(...).first()
```

For large schools this becomes slow.

Recommended fix:

- Preload session once.
- Preload fee structures into a dict keyed by `(class_id, target_group)`.
- Preload existing invoice student IDs for the term/session in one query.

## [INFO/ADVICE]

### 11. SQL injection risk is currently low

I did not find raw string-built SQL execution in `app/`. Most queries use SQLAlchemy ORM filters, which parameterize values.

Continue avoiding `text(f"...{user_input}...")`.

### 12. DB session lifecycle is acceptable

Fault checked: `app/database.py`

```python
try:
    yield db
finally:
    db.close()
```

Sessions are closed correctly. For production, configure pool size/timeouts explicitly:

```python
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
)
```

### 13. Foreign key indexing has been addressed

The latest migration adds broad FK indexes. This reduces many lookup bottlenecks. Keep unique FK columns unique-only; PostgreSQL already indexes unique constraints.
