import hashlib
import hmac
from typing import Any

import httpx

from app.config import settings


def paystack_is_configured() -> bool:
    return bool(settings.PAYSTACK_SECRET_KEY and settings.paystack_base_url_normalized)


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
        "Content-Type": "application/json",
    }


def initialize_paystack_transaction(payload: dict[str, Any]) -> dict[str, Any]:
    with httpx.Client(timeout=30.0) as client:
        response = client.post(
            f"{settings.paystack_base_url_normalized}/transaction/initialize",
            json=payload,
            headers=_headers(),
        )
        response.raise_for_status()
        return response.json()


def verify_paystack_transaction(reference: str) -> dict[str, Any]:
    with httpx.Client(timeout=30.0) as client:
        response = client.get(
            f"{settings.paystack_base_url_normalized}/transaction/verify/{reference}",
            headers=_headers(),
        )
        response.raise_for_status()
        return response.json()


def verify_paystack_signature(payload: bytes, signature: str | None) -> bool:
    # Paystack signs the raw webhook body with the same secret key family used for the integration.
    if not settings.PAYSTACK_WEBHOOK_SECRET or not signature:
        return False
    digest = hmac.new(
        settings.PAYSTACK_WEBHOOK_SECRET.encode("utf-8"),
        payload,
        hashlib.sha512,
    ).hexdigest()
    return hmac.compare_digest(digest, signature)
