import uuid
from django.db import models
from django.conf import settings


class UserPoints(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="points_account",
    )
    balance = models.IntegerField(default=0)
    total_purchased = models.IntegerField(default=0)
    total_used = models.IntegerField(default=0)
    expires_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "User Points"
        verbose_name_plural = "User Points"

    def __str__(self):
        return f"{self.user.email} - {self.balance} points"


class PointTransaction(models.Model):
    TRANSACTION_TYPES = [
        ("purchase", "Purchase"),
        ("usage", "Usage"),
        ("refund", "Refund"),
        ("bonus", "Bonus"),
        ("expired", "Expired"),
    ]

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("completed", "Completed"),
        ("failed", "Failed"),
        ("cancelled", "Cancelled"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="point_transactions",
    )
    type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    amount = models.IntegerField()
    balance_after = models.IntegerField()
    booking = models.ForeignKey(
        "scheduling.FlexibleBooking",
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="point_transactions",
    )
    payment_reference = models.CharField(max_length=255, blank=True, default="")
    description = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="completed"
    )
    expires_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Point Transaction"
        verbose_name_plural = "Point Transactions"

    def __str__(self):
        return f"{self.user.email} - {self.type} {self.amount}"
