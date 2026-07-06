from fastapi import Request
from slowapi import Limiter


def _get_real_ip(request: Request) -> str:
    # Railway (and most reverse proxies) forward the client IP in X-Forwarded-For
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# Global default: 200 requests/minute per IP
# Individual routes can override with a stricter @limiter.limit() decorator
limiter = Limiter(key_func=_get_real_ip, default_limits=["200/minute"])
