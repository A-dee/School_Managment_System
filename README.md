# School Management System (SMS)

Full-stack school management system — FastAPI backend + Next.js frontend.

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI, SQLAlchemy, PostgreSQL, Alembic |
| Auth | JWT (access + refresh), bcrypt |
| Frontend | Next.js 14, Tailwind CSS, Recharts |
| PDF | ReportLab |
| Exports | Pandas, openpyxl |

## Project Structure

```
sms/
├── app/                    # FastAPI backend
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── models/             # SQLAlchemy models
│   ├── schemas/            # Pydantic schemas
│   ├── crud/               # Database logic
│   ├── routes/             # API endpoints
│   └── utils/              # Auth, RBAC, PDF, export
├── migrations/             # Alembic migrations
├── frontend/               # Next.js app
│   └── src/
│       ├── app/            # Next.js App Router pages
│       ├── components/     # Shared UI components
│       └── lib/            # API client, auth helpers
├── seed.py                 # Create initial SUPER_ADMIN
├── requirements.txt
└── alembic.ini
```

## Quick Start

### 1. Backend Setup

```bash
cd sms
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# Run migrations
alembic upgrade head

# Seed super admin
python seed.py

# Start API server
g
```

API docs: http://localhost:8000/docs

### 2. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

npm run dev
```

Frontend: http://localhost:3000

## Roles & Default Credentials

| Role | Default Login |
|------|--------------|
| SUPER_ADMIN | superadmin@school.com / Admin@1234 |

Create other roles via `/api/v1/users/` endpoint after login.

## Role Dashboards

| Role | Dashboard URL |
|------|--------------|
| SUPER_ADMIN / PRINCIPAL | `/principal/dashboard` |
| ADMIN | `/admin/dashboard` |
| TEACHER | `/teacher/dashboard` |
| PARENT | `/parent/dashboard` |
| STUDENT | `/student/dashboard` |

## Key API Endpoints

```
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
GET    /api/v1/auth/me

GET    /api/v1/students
POST   /api/v1/students
POST   /api/v1/students/{id}/graduate
POST   /api/v1/students/bulk-promote

GET    /api/v1/finance/invoices
POST   /api/v1/finance/invoices/generate
POST   /api/v1/finance/payments
GET    /api/v1/finance/reports/profit-loss
GET    /api/v1/finance/invoices/debtors

POST   /api/v1/results
POST   /api/v1/results/submit
POST   /api/v1/results/approve
POST   /api/v1/results/publish
POST   /api/v1/results/compute-positions

GET    /api/v1/exports/students?fmt=excel
GET    /api/v1/exports/debtors?session_id=1&term_id=1

GET    /api/v1/pdfs/report-card/{student_id}
GET    /api/v1/pdfs/receipt/{payment_id}
GET    /api/v1/pdfs/payslip/{payroll_id}

GET    /api/v1/audit-logs
```

## Modules Implemented

- ✅ Authentication (JWT access + refresh + password reset)
- ✅ RBAC (7 roles, permission checks on all endpoints)
- ✅ User management (create, activate, deactivate)
- ✅ Staff management (CRUD, salary, staff types)
- ✅ Student management (CRUD, graduate, withdraw, transfer, bulk promote)
- ✅ Parent management (link to children, role-guarded child data)
- ✅ Academic sessions & terms
- ✅ Class management
- ✅ Subject management (teacher creates → principal approves)
- ✅ Teacher-subject-class assignments
- ✅ Results (DRAFT → SUBMITTED → APPROVED → PUBLISHED)
- ✅ Class position ranking computation
- ✅ Attendance (single + bulk)
- ✅ Discipline records
- ✅ Fee structures per class/term
- ✅ Auto invoice generation for active students
- ✅ Payment recording with file upload
- ✅ Expenditure management (admin records, principal approves)
- ✅ Payroll / payslip generation
- ✅ Profit/Loss reports (by session/term/month)
- ✅ Audit logs (all sensitive actions)
- ✅ Notifications (in-app)
- ✅ PDF generation (report card, receipt, payslip)
- ✅ CSV/Excel exports (students, debtors, payments, staff, results)
- ✅ Next.js frontend with role-based dashboards
