import hashlib
import hmac
import json
from django.conf import settings
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from .models import PointTransaction
from .points_service import add_points
from .paystack_service import verify_transaction


@csrf_exempt
@require_POST
def paystack_webhook_view(request):
    """
    Handle Paystack webhook events.
    Paystack sends a signed POST request with event data.
    """
    secret_key = settings.PAYSTACK_SECRET_KEY
    if not secret_key:
        return JsonResponse({"status": "error", "message": "Paystack not configured"}, status=500)

    # Verify signature
    signature = request.headers.get("x-paystack-signature", "")
    expected_signature = hmac.new(
        secret_key.encode("utf-8"),
        request.body,
        hashlib.sha512,
    ).hexdigest()

    if not hmac.compare_digest(signature, expected_signature):
        return JsonResponse({"status": "error", "message": "Invalid signature"}, status=403)

    try:
        payload = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"status": "error", "message": "Invalid JSON"}, status=400)

    event = payload.get("event")
    data = payload.get("data", {})

    if event == "charge.success":
        reference = data.get("reference")
        status = data.get("status")

        if status == "success" and reference:
            # 1. Try points purchase
            try:
                tx = PointTransaction.objects.get(payment_reference=reference, status="pending")
                add_points(
                    tx.user,
                    tx.amount,
                    description=f"Paystack webhook purchase {reference}",
                    payment_reference=reference,
                )
                tx.status = "completed"
                tx.save(update_fields=["status"])
                return JsonResponse({"status": "ok"})
            except PointTransaction.DoesNotExist:
                pass

            # 2. Try recurring class booking
            try:
                from scheduling.models import Booking
                booking = Booking.objects.get(payment_reference=reference, payment_status="pending")

                # Verify amount matches to protect against tampering
                verified = verify_transaction(reference)
                if verified.get("success") and verified.get("data", {}).get("status") == "success":
                    expected_kobo = int(booking.monthly_amount * 100)
                    actual_kobo = verified["data"].get("amount", 0)
                    if actual_kobo == expected_kobo:
                        booking.payment_status = "paid"
                        booking.payment_date = timezone.now()
                        booking.status = "confirmed"
                        booking.save(update_fields=["payment_status", "payment_date", "status"])
                        return JsonResponse({"status": "ok"})
            except Booking.DoesNotExist:
                pass

            # 3. Try special coaching booking
            try:
                from scheduling.models import SpecialBooking
                booking = SpecialBooking.objects.get(payment_reference=reference, payment_status="pending")

                verified = verify_transaction(reference)
                if verified.get("success") and verified.get("data", {}).get("status") == "success":
                    expected_kobo = int(booking.total_amount * 100)
                    actual_kobo = verified["data"].get("amount", 0)
                    if actual_kobo == expected_kobo:
                        booking.payment_status = "paid"
                        booking.payment_date = timezone.now()
                        booking.status = "confirmed"
                        booking.save(update_fields=["payment_status", "payment_date", "status"])
                        return JsonResponse({"status": "ok"})
            except SpecialBooking.DoesNotExist:
                pass

    return JsonResponse({"status": "ok"})
