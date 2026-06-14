from django.contrib import admin
from .models import UserPoints, PointTransaction


@admin.register(UserPoints)
class UserPointsAdmin(admin.ModelAdmin):
    list_display = ["user", "balance", "total_purchased", "total_used", "expires_at"]
    search_fields = ["user__email"]


@admin.register(PointTransaction)
class PointTransactionAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "type",
        "amount",
        "balance_after",
        "status",
        "created_at",
    ]
    list_filter = ["type", "status"]
    search_fields = ["user__email", "payment_reference"]
