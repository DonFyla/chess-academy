from django.contrib import messages
from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required, user_passes_test
from django.db import transaction
from django.shortcuts import render, redirect
from django.utils import timezone
from datetime import timedelta
from .models import PointTransaction, UserPoints
from .points_service import add_points


User = get_user_model()


def _is_superuser(user):
    return user.is_authenticated and user.is_superuser


@login_required
@user_passes_test(_is_superuser)
def points_admin_view(request):
    query = request.GET.get("q", "").strip()
    search_user = None
    search_error = None

    if query:
        try:
            search_user = User.objects.get(email__iexact=query)
        except User.DoesNotExist:
            search_error = f"No user found with email '{query}'."

    if request.method == "POST":
        action = request.POST.get("action")

        if action == "approve_pending":
            tx_id = request.POST.get("tx_id")
            try:
                tx = PointTransaction.objects.get(id=tx_id, status="pending", type="purchase")
            except PointTransaction.DoesNotExist:
                messages.error(request, "Pending transaction not found.")
                return redirect("payments:points_admin")

            with transaction.atomic():
                points, created = UserPoints.objects.get_or_create(
                    user=tx.user,
                    defaults={
                        "balance": 0,
                        "total_purchased": 0,
                        "total_used": 0,
                    },
                )
                points.balance += tx.amount
                points.total_purchased += tx.amount
                points.expires_at = timezone.now() + timedelta(days=365)
                points.save()

                tx.status = "completed"
                tx.balance_after = points.balance
                tx.expires_at = points.expires_at
                tx.save(update_fields=["status", "balance_after", "expires_at"])

            messages.success(
                request,
                f"Approved {tx.amount} points for {tx.user.email}. New balance: {points.balance}",
            )
            return redirect("payments:points_admin")

        elif action == "award_points":
            user_id = request.POST.get("user_id")
            amount = request.POST.get("amount", "0").strip()
            reason = request.POST.get("reason", "").strip()
            reference = request.POST.get("reference", "").strip()

            try:
                amount = int(amount)
            except ValueError:
                messages.error(request, "Points amount must be a number.")
                return redirect("payments:points_admin")

            if amount <= 0:
                messages.error(request, "Points amount must be greater than zero.")
                return redirect("payments:points_admin")

            try:
                target_user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                messages.error(request, "User not found.")
                return redirect("payments:points_admin")

            add_points(
                target_user,
                amount,
                description=reason or "Manual award",
                payment_reference=reference,
            )
            messages.success(
                request,
                f"Awarded {amount} points to {target_user.email}.",
            )
            return redirect("payments:points_admin")

        elif action == "reject_pending":
            tx_id = request.POST.get("tx_id")
            PointTransaction.objects.filter(id=tx_id, status="pending", type="purchase").update(
                status="rejected"
            )
            messages.success(request, "Transaction rejected.")
            return redirect("payments:points_admin")

    pending_transactions = PointTransaction.objects.filter(
        status="pending", type="purchase"
    ).select_related("user").order_by("-created_at")

    recent_transactions = PointTransaction.objects.exclude(
        status="pending"
    ).select_related("user").order_by("-created_at")[:20]

    context = {
        "pending_transactions": pending_transactions,
        "recent_transactions": recent_transactions,
        "query": query,
        "search_user": search_user,
        "search_error": search_error,
        "user_balance": _get_balance(search_user) if search_user else None,
    }
    return render(request, "payments/points_admin.html", context)


def _get_balance(user):
    points, _ = UserPoints.objects.get_or_create(
        user=user,
        defaults={
            "balance": 0,
            "total_purchased": 0,
            "total_used": 0,
        },
    )
    return points.balance
