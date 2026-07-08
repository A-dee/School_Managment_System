# School Management System (SMS) Handover - July 6, 2026

## Project Overview
- **Workspace Path:** `C:\Users\adeye\Desktop\projects\School_managment_system`
- **Backend:** FastAPI (Python 3.13) in the `app` directory.
- **Frontend:** Next.js 14 (App Router) in the `frontend` directory.
- **Database:** PostgreSQL (Database name: `sms_db` on localhost:5432).
- **ORM / Migrations:** SQLAlchemy + Alembic.
- **Auth:** JWT access + refresh tokens stored in HTTP-only cookies.

---

## Current Setup & State
1. **Repository:** Fully cloned.
2. **Environment File:** Local `.env` file has been created at the root with `sms_db` database settings.
3. **Python Virtual Environment (`venv`):** Created and fully initialized at the root.
4. **Backend Dependencies:** All packages in `requirements.txt` are **already installed** in `venv`.

---

## Development & AI Alignment Strategy
To execute the user's goals, the workspace is partitioned as follows:
- **Codex (Backend AI Agent):** Responsible for the FastAPI Python backend (`app/`, migrations, seeds, test scripts).
- **Gemini (Frontend AI Agent):** Responsible for the Next.js React frontend (`frontend/`, components, UI styling, charts).
- **Antigravity (Project Manager AI / "The Boss"):** Oversees coordination, validates changes, provides prompts, reviews code, and aligns both agents to prevent conflicts.

---

## Role Mapping Configuration
The application uses a custom mapping between backend roles and displayed names. **Do not modify this mapping unless explicitly instructed:**

| Backend Role | Displayed Name / User Type | Dashboard Path |
|--------------|---------------------------|----------------|
| `SUPER_ADMIN` | Proprietor | `/principal/dashboard` |
| `ADMIN` | Principal | `/admin/dashboard` |
| `PRINCIPAL` | Vice Principal | `/principal/dashboard` |
| `TEACHER` | Teacher | `/teacher/dashboard` |
| `PARENT` | Parent | `/parent/dashboard` |
| `STUDENT` | Student | `/student/dashboard` |
| `NON_TEACHING_STAFF` | Staff | N/A |

---

## System Architecture & Key Directories
```text
sms/
├── app/                        FastAPI backend
│   ├── models/                 SQLAlchemy database models
│   ├── schemas/                Pydantic validation schemas
│   ├── crud/                   Database queries and mutations
│   ├── routes/                 API endpoints
│   └── utils/                  Security, RBAC, PDF, and export utils
├── frontend/                   Next.js frontend
│   └── src/
│       ├── app/                App Router (pages & layout)
│       ├── components/         Reusable UI components (buttons, grids, widgets)
│       └── lib/                API client layer (api.ts) & Auth helpers
└── migrations/                 Alembic migration history
```

---

## Current Development Tasks
1. **Initialize the local database:**
   * Create the database: `CREATE DATABASE sms_db;` in PostgreSQL.
   * Run database migrations: `alembic upgrade head`
   * Seed the database: `python seed.py`
2. **Start Backend Server:** `uvicorn app.main:app --reload`
3. **Start Frontend Server:** 
   * Navigate to `frontend/`
   * Run `npm install`
   * Copy `.env.example` to `.env.local`
   * Run `npm run dev`
4. **Iterative Feature Work:** Ensure mobile responsiveness on data tables, polish invoicing/payroll views, and align frontend/backend API payload shapes.
