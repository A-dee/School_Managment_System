from typing import Any, Optional
from fastapi.responses import JSONResponse


def success_response(data: Any = None, message: str = "Success", status_code: int = 200) -> dict:
    return {"status": "success", "message": message, "data": data}


def error_response(message: str, status_code: int = 400) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"status": "error", "message": message, "data": None}
    )


def paginated_response(data: list, total: int, page: int, page_size: int) -> dict:
    return {
        "status": "success",
        "data": data,
        "pagination": {
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
        }
    }
