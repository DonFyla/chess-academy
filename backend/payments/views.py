import logging
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from django.urls import reverse
from django.conf import settings
from django.utils import timezone
from .models import PointTransaction
from .points_service import get_balance
from .paystack_service import initialize_transaction, verify_transaction, generate_reference
from .emails import send_points_purchased
from scheduling.emails import (
    send_recurring_booking_confirmed,
    send_special_booking_confirmed,
)


logger = logging.getLogger(__name__)


POINT_PACKAGES = [
    {"points": 1, "price": 10000, "label": "Single Class"},
    {"points": 4, "price": 38000, "label": "4 Classes", "savings": "5%"},
    {"points": 8, "price": 72000, "label": "8 Classes", "savings": "10%", "popular": True},
    {"points": 12, "price": 102000, "label": "12 Classes", "savings": "15%"},
    {"points": 20, "price": 160000, "label": "20 Classes", "savings": "20%"},
]

BANK_DETAILS = {
    "bank_name": "GT Bank",
    "account_number": "0878016456",
    "account_name": "The Moving Train Educational Services Ltd",
}

WHATSAPP_LINK = "https://wa.link/uj48gk"
PRICE_PER_POINT = 10000


def payments_index(request):
    return render(request, "payments/index.html")


@login_required
def buy_points_view(request):
    balance = get_balance(request.user)
    selected_package = None
    payment_reference = None
    authorization_url = None
    paystack_public_key = settings.PAYSTACK_PUBLIC_KEY
    paystack_error = None

    if request.method == "POST":
        action = request.POST.get("action")

        if action == "buy_package":
            try:
                points = int(request.POST.get("points", 0))
                price = int(request.POST.get("price", 0))
            except (TypeError, ValueError):
                paystack_error = "Invalid package selection."
                points = 0
                price = 0
            selected_package = next((p for p in POINT_PACKAGES if p["points"] == points), None)
            if not selected_package or selected_package["price"] != price:
                paystack_error = "Selected package is not valid."
                selected_package = None

        elif action == "buy_custom":
            try:
                points = int(request.POST.get("custom_amount", 0))
            except (TypeError, ValueError):
                points = 0
            if points < 1:
                paystack_error = "Please enter a valid amount."
            else:
                price = points * PRICE_PER_POINT
                selected_package = {"points": points, "price": price, "label": "Custom"}

        if selected_package and not paystack_error:
            payment_reference = generate_reference()
            callback_url = request.build_absolute_uri(reverse("payments:paystack_callback"))

            # Create pending transaction first
            PointTransaction.objects.create(
                user=request.user,
                type="purchase",
                amount=selected_package["points"],
                balance_after=balance,
                payment_reference=payment_reference,
                description=f"Purchase of {selected_package['points']} points - {selected_package['label']}",
                status="pending",
            )

            logger.info(
                "Initializing Paystack for user %s, ref %s, amount %s kobo, key prefix %s",
                request.user.email,
                payment_reference,
                selected_package["price"] * 100,
                settings.PAYSTACK_SECRET_KEY[:8] if settings.PAYSTACK_SECRET_KEY else "NONE",
            )

            result = initialize_transaction(
                email=request.user.email,
                amount_kobo=selected_package["price"] * 100,
                reference=payment_reference,
                callback_url=callback_url,
                metadata={
                    "points": selected_package["points"],
                    "price": selected_package["price"],
                    "label": selected_package["label"],
                    "user_id": str(request.user.id),
                },
            )

            if result["success"]:
                authorization_url = result["authorization_url"]
            else:
                paystack_error = f"Could not start payment: {result['message']}"
                logger.error("Paystack initialize failed for user %s: %s", request.user.email, result.get("message"))
                # Clean up the failed pending transaction
                PointTransaction.objects.filter(
                    payment_reference=payment_reference, status="pending"
                ).delete()

    context = {
        "point_packages": POINT_PACKAGES,
        "price_per_point": PRICE_PER_POINT,
        "bank_details": BANK_DETAILS,
        "whatsapp_link": WHATSAPP_LINK,
        "balance": balance,
        "selected_package": selected_package,
        "payment_reference": payment_reference,
        "authorization_url": authorization_url,
        "paystack_public_key": paystack_public_key,
        "paystack_error": paystack_error,
    }
    return render(request, "payments/buy_points.html", context)


@login_required
def paystack_callback_view(request):
    """Handle Paystack redirect after payment."""
    reference = request.GET.get("reference")
    if not reference:
        messages.error(request, "No payment reference provided.")
        return redirect("payments:buy_points")

    result = verify_transaction(reference)

    if not result["success"]:
        messages.error(request, f"Payment verification failed: {result['message']}")
        return redirect("payments:buy_points")

    status = result["status"]

    try:
        tx = PointTransaction.objects.get(payment_reference=reference, user=request.user)
    except PointTransaction.DoesNotExist:
        messages.error(request, "Payment record not found.")
        return redirect("payments:buy_points")

    if status == "success":
        if tx.status == "pending":
            from payments.points_service import add_points
            add_points(
                request.user,
                tx.amount,
                description=f"Paystack purchase {reference}",
                payment_reference=reference,
            )
            tx.status = "completed"
            tx.save(update_fields=["status"])
            send_points_purchased(request.user, tx)
        messages.success(
            request,
            f"Payment successful! {tx.amount} points have been added to your balance.",
        )
        return redirect("accounts:dashboard")
    elif status == "abandoned":
        messages.warning(request, "Payment was not completed. You can try again.")
        return redirect("payments:buy_points")
    else:
        messages.error(request, f"Payment was not successful. Status: {status}")
        return redirect("payments:buy_points")


@login_required
def booking_callback_view(request):
    """Handle Paystack redirect after payment for a recurring class booking."""
    from scheduling.models import Booking

    reference = request.GET.get("reference")
    if not reference:
        messages.error(request, "No payment reference provided.")
        return redirect("accounts:dashboard")

    result = verify_transaction(reference)

    if not result["success"]:
        messages.error(request, f"Payment verification failed: {result['message']}")
        return redirect("accounts:dashboard")

    status = result["status"]

    try:
        booking = Booking.objects.get(payment_reference=reference)
    except Booking.DoesNotExist:
        messages.error(request, "Booking record not found.")
        return redirect("accounts:dashboard")

    if status == "success":
        if booking.payment_status != "paid":
            booking.payment_status = "paid"
            booking.payment_date = timezone.now()
            booking.status = "confirmed"
            booking.save(update_fields=["payment_status", "payment_date", "status"])
            send_recurring_booking_confirmed(booking)
        messages.success(
            request,
            f"Payment successful! Your recurring booking with {booking.coach.name} is confirmed.",
        )
        return redirect("scheduling:booking_confirmation", booking_id=booking.id)
    elif status == "abandoned":
        messages.warning(request, "Payment was not completed. You can retry from your dashboard.")
        return redirect("accounts:dashboard")
    else:
        messages.error(request, f"Payment was not successful. Status: {status}")
        return redirect("accounts:dashboard")


@login_required
def special_booking_callback_view(request):
    """Handle Paystack redirect after payment for a special coaching booking."""
    from scheduling.models import SpecialBooking

    reference = request.GET.get("reference")
    if not reference:
        messages.error(request, "No payment reference provided.")
        return redirect("accounts:dashboard")

    result = verify_transaction(reference)

    if not result["success"]:
        messages.error(request, f"Payment verification failed: {result['message']}")
        return redirect("accounts:dashboard")

    status = result["status"]

    try:
        booking = SpecialBooking.objects.get(payment_reference=reference)
    except SpecialBooking.DoesNotExist:
        messages.error(request, "Special booking record not found.")
        return redirect("accounts:dashboard")

    if status == "success":
        if booking.payment_status != "paid":
            booking.payment_status = "paid"
            booking.payment_date = timezone.now()
            booking.status = "confirmed"
            booking.save(update_fields=["payment_status", "payment_date", "status"])
            send_special_booking_confirmed(booking)
        messages.success(
            request,
            f"Payment successful! Your special coaching with {booking.coach.name} is confirmed.",
        )
        return redirect("scheduling:special_booking_confirmation", booking_id=booking.id)
    elif status == "abandoned":
        messages.warning(request, "Payment was not completed. You can retry from your dashboard.")
        return redirect("accounts:dashboard")
    else:
        messages.error(request, f"Payment was not successful. Status: {status}")
        return redirect("accounts:dashboard")
