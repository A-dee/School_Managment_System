import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.routes import (
    auth, users, staff, students, classes, academic,
    subjects, parents, results, attendance, discipline,
    finance, audit, notifications, exports, pdfs,
)
from app.routes import messages, email_config, report_card, seed

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title="School Management System API",
    description="Full-featured school management backend with RBAC, finance, results, messaging and more.",
    version="1.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://school-managment-system-dye9.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "/api/v1"

app.include_router(auth.router,         prefix=API_PREFIX)
app.include_router(users.router,        prefix=API_PREFIX)
app.include_router(staff.router,        prefix=API_PREFIX)
app.include_router(students.router,     prefix=API_PREFIX)
app.include_router(classes.router,      prefix=API_PREFIX)
app.include_router(academic.router,     prefix=API_PREFIX)
app.include_router(subjects.router,     prefix=API_PREFIX)
app.include_router(parents.router,      prefix=API_PREFIX)
app.include_router(results.router,      prefix=API_PREFIX)
app.include_router(attendance.router,   prefix=API_PREFIX)
app.include_router(discipline.router,   prefix=API_PREFIX)
app.include_router(finance.router,      prefix=API_PREFIX)
app.include_router(audit.router,        prefix=API_PREFIX)
app.include_router(notifications.router,prefix=API_PREFIX)
app.include_router(exports.router,      prefix=API_PREFIX)
app.include_router(pdfs.router,         prefix=API_PREFIX)
app.include_router(messages.router,     prefix=API_PREFIX)
app.include_router(email_config.router, prefix=API_PREFIX)
app.include_router(report_card.router,  prefix=API_PREFIX)
app.include_router(seed.router,         prefix=API_PREFIX)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"status": "error", "message": "Internal server error", "data": None})


@app.get("/")
def root():
    return {"message": "School Management System API v1.1", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "healthy"}
