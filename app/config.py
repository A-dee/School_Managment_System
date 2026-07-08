from functools import lru_cache

from pydantic import ValidationInfo, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/school_db"
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 30
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 3600
    DB_POOL_PRE_PING: bool = True
    API_CACHE_TTL_SECONDS: int = 60
    ENVIRONMENT: str = "development"
    SECRET_KEY: str = "change-this-in-production"
    REFRESH_SECRET_KEY: str = "change-this-refresh-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 10485760
    # Comma-separated allowed CORS origins; override via ALLOWED_ORIGINS env var on Railway/Vercel
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:3001,https://school-managment-system-dye9.vercel.app,https://school-managment-system-dye9-git-main-dee11.vercel.app"
    ALLOWED_ORIGIN_REGEX: str = r"^https://school-managment-system-dye9(?:-[a-z0-9-]+)?\.vercel\.app$"

    # Email
    RESEND_API_KEY: str = "re_placeholder"
    EMAIL_FROM: str = "Lenage Management Systems <noreply@lenagetechnologies.com>"
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_SECURE: str = "tls"
    FRONTEND_URL: str = "http://localhost:3000"
    PAYSTACK_SECRET_KEY: str = ""
    PAYSTACK_PUBLIC_KEY: str = ""
    PAYSTACK_BASE_URL: str = "https://api.paystack.co"
    PAYSTACK_CALLBACK_URL: str = ""
    PAYSTACK_WEBHOOK_SECRET: str = ""

    @field_validator("SECRET_KEY", "REFRESH_SECRET_KEY")
    @classmethod
    def reject_default_production_secrets(cls, value: str, info: ValidationInfo) -> str:
        environment = str(info.data.get("ENVIRONMENT", "development")).lower()
        if environment == "production" and value.startswith("change-this"):
            raise ValueError(f"{info.field_name} must be configured in production")
        return value

    @property
    def frontend_url_normalized(self) -> str:
        # Email links should not depend on whether FRONTEND_URL was configured with a trailing slash.
        return self.FRONTEND_URL.rstrip("/")

    @property
    def paystack_base_url_normalized(self) -> str:
        # Accept env values with or without a trailing slash so request builders
        # do not accidentally produce double slashes.
        return self.PAYSTACK_BASE_URL.rstrip("/")

    @property
    def paystack_callback_url_normalized(self) -> str:
        # Optional because some deployments prefer constructing callback URLs from
        # the logged-in role instead of using one fixed callback for everyone.
        return self.PAYSTACK_CALLBACK_URL.rstrip("/")


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

