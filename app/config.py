from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/school_db"
    SECRET_KEY: str = "change-this-in-production"
    REFRESH_SECRET_KEY: str = "change-this-refresh-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 10485760
    ENVIRONMENT: str = "development"
    # Comma-separated allowed CORS origins; override via ALLOWED_ORIGINS env var on Railway/Vercel
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:3001,https://school-managment-system-dye9.vercel.app,https://school-managment-system-dye9-git-main-dee11.vercel.app"

    # Email (Resend)
    RESEND_API_KEY: str = "re_placeholder"
    EMAIL_FROM: str = "Hope Hills Academy <noreply@hopehillsacademy.ng>"
    FRONTEND_URL: str = "http://localhost:3000"

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
