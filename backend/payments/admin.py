from django.contrib import admin
from django.contrib import messages
from django.db import transaction
from django.utils import timezone
from datetime import timedelta
from .models import UserPoints, PointTransaction


@admin.register(UserPoints)
class UserPointsAdmin(admin.ModelAdmin):
    list_display = ["user", "balance", "total_purchased", "total_used", "expires_at"]
    search_fields = ["user__email"]
    readonly_fields = ["total_purchased", "total_used"]


@admin.register(PointTransaction)
class PointTransactionAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "type",
        "amount",
        "balance_after",
        "status",
        "payment_reference",
        "created_at",
    ]
    list_filter = ["type", "status"]
    search_fields = ["user__email", "payment_reference", "description"]
    readonly_fields = ["balance_after"]
    actions = ["approve_purchases"]

    @admin.action(description="Approve selected pending purchases and credit points")
    def approve_purchases(self, request, queryset):
        pending = queryset.filter(status="pending", type="purchase")
        approved = 0

        with transaction.atomic():
            for tx in pending:
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
                approved += 1

        skipped = queryset.count() - approved
        if approved:
            messages.success(request, f"Approved {approved} purchase(s) and credited points.")
        if skipped:
            messages.warning(request, f"Skipped {skipped} non-pending or non-purchase transaction(s).")
