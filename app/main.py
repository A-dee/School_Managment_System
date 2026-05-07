import time
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.utils.limiter import limiter
from app.utils.log import get_logger
from app.config import settings

from app.routes import (
    auth, users, staff, students, classes, academic,
    subjects, parents, results, attendance, discipline,
    finance, audit, notifications, exports, pdfs,
)
from app.routes import messages, email_config, report_card, seed, announcements, calendar

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
logger = get_logger(__name__)

app = FastAPI(
    title="School Management System API",
    description="Full-featured school management backend with RBAC, finance, results, messaging and more.",
    version="1.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    ms = round((time.perf_counter() - start) * 1000)
    status = response.status_code
    # Colour-code by status bucket
    marker = "✓" if status < 300 else ("⚠" if status < 500 else "✗")
    logger.info("%s %s %s → %d (%dms)", marker, request.method, request.url.path, status, ms)
    return response

_allowed_origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
    max_age=600,
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
app.include_router(announcements.router, prefix=API_PREFIX)
app.include_router(calendar.router,     prefix=API_PREFIX)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("✗ 500 %s %s — %s", request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(status_code=500, content={"status": "error", "message": "Internal server error", "data": None})


@app.get("/")
def root():
    return {"message": "School Management System API v1.1", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "healthy"}
