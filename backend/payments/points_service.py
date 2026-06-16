from django.db import transaction
from django.utils import timezone
from datetime import timedelta
from .models import UserPoints, PointTransaction


def get_or_create_user_points(user):
    points, created = UserPoints.objects.get_or_create(
        user=user,
        defaults={
            "balance": 0,
            "total_purchased": 0,
            "total_used": 0,
        },
    )
    return points


def get_balance(user):
    points = get_or_create_user_points(user)
    return points.balance


def has_sufficient_points(user, amount):
    return get_balance(user) >= amount


@transaction.atomic
def add_points(user, amount, description="", payment_reference="", status="completed"):
    if amount <= 0:
        raise ValueError("Amount must be positive")

    points = get_or_create_user_points(user)
    points.balance += amount
    points.total_purchased += amount
    points.expires_at = timezone.now() + timedelta(days=365)
    points.save()

    PointTransaction.objects.create(
        user=user,
        type="purchase",
        amount=amount,
        balance_after=points.balance,
        payment_reference=payment_reference,
        description=description,
        status=status,
        expires_at=points.expires_at,
    )
    return points


@transaction.atomic
def use_points(user, amount, flexible_booking=None, description=""):
    if amount <= 0:
        raise ValueError("Amount must be positive")

    points = get_or_create_user_points(user)
    if points.balance < amount:
        raise ValueError(f"Insufficient points. Balance: {points.balance}, needed: {amount}")

    points.balance -= amount
    points.total_used += amount
    points.save()

    PointTransaction.objects.create(
        user=user,
        type="usage",
        amount=-amount,
        balance_after=points.balance,
        booking=flexible_booking,
        description=description,
    )
    return points


@transaction.atomic
def refund_points(user, amount, flexible_booking=None, description=""):
    if amount <= 0:
        raise ValueError("Amount must be positive")

    points = get_or_create_user_points(user)
    points.balance += amount
    points.save()

    PointTransaction.objects.create(
        user=user,
        type="refund",
        amount=amount,
        balance_after=points.balance,
        booking=flexible_booking,
        description=description,
    )
    return points
