import hashlib
import hmac
import uuid
from typing import Any
from decimal import Decimal

import httpx

from app.config import settings


def paystack_is_configured() -> bool:
    return bool(settings.PAYSTACK_SECRET_KEY and settings.paystack_base_url_normalized)


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
        "Content-Type": "application/json",
    }


def _using_paystack_test_key() -> bool:
    return (settings.PAYSTACK_SECRET_KEY or "").startswith("sk_test")


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


def fetch_bank_list() -> list[dict]:
    with httpx.Client(timeout=30.0) as client:
        response = client.get(
            f"{settings.paystack_base_url_normalized}/bank",
            headers=_headers(),
        )
        response.raise_for_status()
        return response.json().get("data", [])


def resolve_bank_account(account_number: str, bank_code: str) -> dict:
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.get(
                f"{settings.paystack_base_url_normalized}/bank/resolve",
                params={"account_number": account_number, "bank_code": bank_code},
                headers=_headers(),
            )
            response.raise_for_status()
            return response.json().get("data", {})
    except Exception:
        if _using_paystack_test_key():
            return {
                "account_name": "TEST STAFF ACCOUNT",
                "account_number": account_number,
                "bank_id": 9999,
            }
        raise


def create_transfer_recipient(name: str, account_number: str, bank_code: str) -> str:
    payload = {
        "type": "nuban",
        "name": name,
        "account_number": account_number,
        "bank_code": bank_code,
        "currency": "NGN",
    }
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                f"{settings.paystack_base_url_normalized}/transferrecipient",
                json=payload,
                headers=_headers(),
            )
            response.raise_for_status()
            return response.json().get("data", {}).get("recipient_code", "")
    except Exception:
        if _using_paystack_test_key():
            return f"RCP_{uuid.uuid4().hex[:12].upper()}"
        raise


def initiate_transfer(amount: Decimal, recipient_code: str, reason: str) -> str:
    payload = {
        "source": "balance",
        "amount": int(amount * 100),
        "recipient": recipient_code,
        "reason": reason,
    }
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                f"{settings.paystack_base_url_normalized}/transfer",
                json=payload,
                headers=_headers(),
            )
            response.raise_for_status()
            return response.json().get("data", {}).get("reference", "")
    except Exception:
        if _using_paystack_test_key():
            return f"TRF_{uuid.uuid4().hex[:12].upper()}"
        raise

