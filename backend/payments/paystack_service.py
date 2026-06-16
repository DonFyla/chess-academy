import requests
from django.conf import settings
from django.urls import reverse


PAYSTACK_BASE_URL = "https://api.paystack.co"


def _get_headers():
    secret_key = settings.PAYSTACK_SECRET_KEY
    if not secret_key:
        raise RuntimeError("PAYSTACK_SECRET_KEY is not set.")
    return {
        "Authorization": f"Bearer {secret_key}",
        "Content-Type": "application/json",
    }


def initialize_transaction(email, amount_kobo, reference, callback_url=None, metadata=None):
    """
    Initialize a Paystack transaction.

    Args:
        email: customer email
        amount_kobo: amount in kobo (NGN * 100)
        reference: unique transaction reference
        callback_url: optional URL for Paystack to redirect to after payment
        metadata: optional dict attached to the transaction

    Returns:
        dict with success (bool), authorization_url, reference, message
    """
    url = f"{PAYSTACK_BASE_URL}/transaction/initialize"
    payload = {
        "email": email,
        "amount": amount_kobo,
        "reference": reference,
        "callback_url": callback_url,
        "metadata": metadata or {},
    }

    try:
        response = requests.post(url, headers=_get_headers(), json=payload, timeout=30)
        response.raise_for_status()
        data = response.json()

        if data.get("status") and data.get("data"):
            return {
                "success": True,
                "authorization_url": data["data"]["authorization_url"],
                "reference": data["data"]["reference"],
                "message": data.get("message", "Transaction initialized"),
            }
        return {
            "success": False,
            "message": data.get("message", "Failed to initialize transaction"),
        }
    except RuntimeError as e:
        return {
            "success": False,
            "message": str(e),
        }
    except requests.HTTPError as e:
        try:
            error_body = response.json()
            message = error_body.get("message", str(e))
        except ValueError:
            message = str(e)
        return {
            "success": False,
            "message": f"Paystack error: {message}",
        }
    except requests.RequestException as e:
        return {
            "success": False,
            "message": f"Paystack request failed: {e}",
        }


def verify_transaction(reference):
    """
    Verify a Paystack transaction by reference.

    Returns:
        dict with success (bool), status, amount, email, reference, message, data
    """
    url = f"{PAYSTACK_BASE_URL}/transaction/verify/{reference}"

    try:
        response = requests.get(url, headers=_get_headers(), timeout=30)
        response.raise_for_status()
        data = response.json()

        if data.get("status") and data.get("data"):
            tx_data = data["data"]
            return {
                "success": True,
                "status": tx_data.get("status"),
                "amount": tx_data.get("amount"),  # in kobo
                "email": tx_data.get("customer", {}).get("email"),
                "reference": tx_data.get("reference"),
                "message": data.get("message", "Verification successful"),
                "data": tx_data,
            }
        return {
            "success": False,
            "message": data.get("message", "Verification failed"),
        }
    except RuntimeError as e:
        return {
            "success": False,
            "message": str(e),
        }
    except requests.HTTPError as e:
        try:
            error_body = response.json()
            message = error_body.get("message", str(e))
        except ValueError:
            message = str(e)
        return {
            "success": False,
            "message": f"Paystack error: {message}",
        }
    except requests.RequestException as e:
        return {
            "success": False,
            "message": f"Paystack request failed: {e}",
        }


def generate_reference(prefix="PTS"):
    """Generate a unique payment reference."""
    import time
    import secrets
    return f"{prefix}-{int(time.time())}-{secrets.token_hex(4)}"
