"""
Management command to migrate scheduling/booking/payment data from Supabase.

Usage:
    python manage.py migrate_from_supabase --dry-run
    python manage.py migrate_from_supabase

Required environment variables:
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY
"""

import os
import uuid
from datetime import datetime
from decimal import Decimal
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from django.contrib.auth import get_user_model
from supabase import create_client

from scheduling.models import (
    Coach,
    AvailabilitySlot,
    Booking,
    FlexibleBooking,
    SpecialBooking,
    CoachBlockedDate,
)
from payments.models import UserPoints, PointTransaction

User = get_user_model()


def parse_time(value):
    """Parse HH:MM string or time object into a time."""
    if value is None:
        return None
    if isinstance(value, str):
        return datetime.strptime(value, "%H:%M").time()
    return value


def parse_date(value):
    """Parse ISO date string or date object into a date."""
    if value is None:
        return None
    if isinstance(value, str):
        return datetime.strptime(value[:10], "%Y-%m-%d").date()
    return value


def parse_datetime(value):
    """Parse ISO datetime string into timezone-aware datetime."""
    if value is None:
        return None
    if isinstance(value, str):
        # Handle both 'Z' and '+00:00' suffixes
        value = value.replace("Z", "+00:00")
        return datetime.fromisoformat(value)
    return value


def parse_decimal(value):
    """Parse numeric value into Decimal."""
    if value is None:
        return None
    return Decimal(str(value))


class Command(BaseCommand):
    help = "Migrate scheduling/booking/payment data from Supabase to Django"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be migrated without writing to the database",
        )

    def handle(self, *args, **options):
        self.dry_run = options["dry_run"]

        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

        if not supabase_url or not supabase_key:
            raise CommandError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment"
            )

        self.stdout.write(f"Connecting to Supabase: {supabase_url}")
        supabase = create_client(supabase_url, supabase_key)

        if self.dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN: No database changes will be made"))

        # Order matters due to foreign keys
        self.migrate_users(supabase)
        self.migrate_coaches(supabase)
        self.migrate_availability_slots(supabase)
        self.migrate_bookings(supabase)
        self.migrate_flexible_bookings(supabase)
        self.migrate_special_bookings(supabase)
        self.migrate_blocked_dates(supabase)
        self.migrate_user_points(supabase)
        self.migrate_point_transactions(supabase)

        self.stdout.write(self.style.SUCCESS("Migration complete"))

    def _fetch_all(self, supabase, table, select="*"):
        """Fetch all rows from a Supabase table."""
        self.stdout.write(f"  Fetching {table}...")
        try:
            response = supabase.table(table).select(select).execute()
            data = getattr(response, "data", [])
            self.stdout.write(f"    Found {len(data)} rows")
            return data
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"    Error fetching {table}: {e}"))
            return []

    def migrate_users(self, supabase):
        """Migrate auth.users to Django accounts.User."""
        self.stdout.write("Migrating users...")
        try:
            response = supabase.auth.admin.list_users()
            users = response.users if hasattr(response, "users") else []
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"  Error fetching users: {e}"))
            return

        self.stdout.write(f"  Found {len(users)} users")

        if self.dry_run:
            return

        created = 0
        skipped = 0
        for supabase_user in users:
            user_id = getattr(supabase_user, "id", None)
            email = getattr(supabase_user, "email", None) or ""
            metadata = getattr(supabase_user, "user_metadata", {}) or {}
            full_name = metadata.get("full_name", "") if isinstance(metadata, dict) else ""

            if not user_id or not email:
                skipped += 1
                continue

            user, was_created = User.objects.get_or_create(
                id=user_id,
                defaults={
                    "email": email,
                    "username": email,
                    "full_name": full_name,
                    "is_active": True,
                },
            )
            if was_created:
                user.set_unusable_password()
                user.save(update_fields=["password"])
                created += 1
            else:
                skipped += 1

        self.stdout.write(f"  Created {created}, skipped {skipped}")

    def migrate_coaches(self, supabase):
        """Migrate coaches table."""
        rows = self._fetch_all(supabase, "coaches")
        if self.dry_run:
            return

        created = 0
        skipped = 0
        for row in rows:
            coach_id = row.get("id")
            if not coach_id:
                skipped += 1
                continue

            user_id = row.get("user_id")
            user = None
            if user_id:
                user = User.objects.filter(id=user_id).first()

            coach, was_created = Coach.objects.update_or_create(
                id=coach_id,
                defaults={
                    "name": row.get("name", ""),
                    "bio": row.get("bio", ""),
                    "photo_url": row.get("photo_url", ""),
                    "specialization": row.get("specialization", ""),
                    "email": row.get("email", ""),
                    "user": user,
                    "is_admin": bool(row.get("is_admin", False)),
                    "is_special": bool(row.get("is_special", False)),
                    "rank_title": row.get("rank_title", ""),
                    "hourly_rate": row.get("hourly_rate"),
                    "achievements": row.get("achievements") or [],
                    "special_bio": row.get("special_bio", ""),
                    "featured_order": row.get("featured_order"),
                    "points_cost": row.get("points_cost", 1) or 1,
                    "meeting_link": row.get("meeting_link", ""),
                    "created_at": parse_datetime(row.get("created_at")) or timezone.now(),
                },
            )
            if was_created:
                created += 1
            else:
                skipped += 1

        self.stdout.write(f"  Created {created}, updated {skipped}")

    def migrate_availability_slots(self, supabase):
        """Migrate availability_slots table."""
        rows = self._fetch_all(supabase, "availability_slots")
        if self.dry_run:
            return

        created = 0
        for row in rows:
            coach_id = row.get("coach_id")
            coach = Coach.objects.filter(id=coach_id).first() if coach_id else None
            if not coach:
                continue

            AvailabilitySlot.objects.update_or_create(
                id=row.get("id"),
                defaults={
                    "coach": coach,
                    "day_of_week": row.get("day_of_week", 0),
                    "start_time": parse_time(row.get("start_time")) or datetime.min.time(),
                    "end_time": parse_time(row.get("end_time")) or datetime.min.time(),
                    "created_at": parse_datetime(row.get("created_at")) or timezone.now(),
                },
            )
            created += 1

        self.stdout.write(f"  Migrated {created} slots")

    def migrate_bookings(self, supabase):
        """Migrate bookings table."""
        rows = self._fetch_all(supabase, "bookings")
        if self.dry_run:
            return

        created = 0
        for row in rows:
            coach_id = row.get("coach_id")
            coach = Coach.objects.filter(id=coach_id).first() if coach_id else None
            if not coach:
                continue

            Booking.objects.update_or_create(
                id=row.get("id"),
                defaults={
                    "coach": coach,
                    "student_name": row.get("student_name", ""),
                    "student_email": row.get("student_email", ""),
                    "student_phone": row.get("student_phone", ""),
                    "booking_date": parse_date(row.get("booking_date")) or timezone.now().date(),
                    "start_time": parse_time(row.get("start_time")) or datetime.min.time(),
                    "end_time": parse_time(row.get("end_time")) or datetime.min.time(),
                    "status": row.get("status", "pending"),
                    "notes": row.get("notes", ""),
                    "course_type": row.get("course_type", ""),
                    "recurring_days": row.get("recurring_days") or [],
                    "recurring_dates": row.get("recurring_dates") or [],
                    "monthly_amount": parse_decimal(row.get("monthly_amount")),
                    "sessions_per_month": row.get("sessions_per_month", 4) or 4,
                    "booking_mode": row.get("booking_mode", "single"),
                    "payment_status": row.get("payment_status", "pending"),
                    "payment_date": parse_datetime(row.get("payment_date")),
                    "payment_method": row.get("payment_method", ""),
                    "payment_amount": parse_decimal(row.get("payment_amount")),
                    "payment_reference": row.get("payment_reference", ""),
                    "created_at": parse_datetime(row.get("created_at")) or timezone.now(),
                    "updated_at": parse_datetime(row.get("updated_at")) or timezone.now(),
                },
            )
            created += 1

        self.stdout.write(f"  Migrated {created} bookings")

    def migrate_flexible_bookings(self, supabase):
        """Migrate flexible_bookings table."""
        rows = self._fetch_all(supabase, "flexible_bookings")
        if self.dry_run:
            return

        created = 0
        for row in rows:
            coach_id = row.get("coach_id")
            user_id = row.get("user_id")
            coach = Coach.objects.filter(id=coach_id).first() if coach_id else None
            user = User.objects.filter(id=user_id).first() if user_id else None
            if not coach:
                continue

            FlexibleBooking.objects.update_or_create(
                id=row.get("id"),
                defaults={
                    "user": user,
                    "coach": coach,
                    "session_date": parse_date(row.get("session_date")) or timezone.now().date(),
                    "start_time": parse_time(row.get("start_time")) or datetime.min.time(),
                    "end_time": parse_time(row.get("end_time")) or datetime.min.time(),
                    "day_of_week": row.get("day_of_week", 0),
                    "points_used": row.get("points_used", 0) or 0,
                    "status": row.get("status", "confirmed"),
                    "cancelled_at": parse_datetime(row.get("cancelled_at")),
                    "refund_processed": bool(row.get("refund_processed", False)),
                    "meeting_link": row.get("meeting_link", ""),
                    "coach_notes": row.get("coach_notes", ""),
                    "student_notes": row.get("student_notes", ""),
                    "created_at": parse_datetime(row.get("created_at")) or timezone.now(),
                    "updated_at": parse_datetime(row.get("updated_at")) or timezone.now(),
                },
            )
            created += 1

        self.stdout.write(f"  Migrated {created} flexible bookings")

    def migrate_special_bookings(self, supabase):
        """Migrate special_bookings table."""
        rows = self._fetch_all(supabase, "special_bookings")
        if self.dry_run:
            return

        created = 0
        for row in rows:
            coach_id = row.get("coach_id")
            user_id = row.get("student_id")
            coach = Coach.objects.filter(id=coach_id).first() if coach_id else None
            user = User.objects.filter(id=user_id).first() if user_id else None
            if not coach:
                continue

            SpecialBooking.objects.update_or_create(
                id=row.get("id"),
                defaults={
                    "coach": coach,
                    "student": user,
                    "student_name": row.get("student_name", ""),
                    "student_email": row.get("student_email", ""),
                    "student_phone": row.get("student_phone", ""),
                    "total_sessions": row.get("total_sessions", 1) or 1,
                    "sessions_completed": row.get("sessions_completed", 0) or 0,
                    "session_dates": row.get("session_dates") or [],
                    "is_recurring": bool(row.get("is_recurring", False)),
                    "recurring_days": row.get("recurring_days") or [],
                    "recurring_weeks": row.get("recurring_weeks", 4) or 4,
                    "hourly_rate": row.get("hourly_rate", 0) or 0,
                    "total_amount": row.get("total_amount", 0) or 0,
                    "status": row.get("status", "pending_payment"),
                    "payment_method": row.get("payment_method", ""),
                    "payment_reference": row.get("payment_reference", ""),
                    "payment_date": parse_datetime(row.get("payment_date")),
                    "admin_notes": row.get("admin_notes", ""),
                    "created_at": parse_datetime(row.get("created_at")) or timezone.now(),
                    "updated_at": parse_datetime(row.get("updated_at")) or timezone.now(),
                },
            )
            created += 1

        self.stdout.write(f"  Migrated {created} special bookings")

    def migrate_blocked_dates(self, supabase):
        """Migrate coach_blocked_dates table."""
        rows = self._fetch_all(supabase, "coach_blocked_dates")
        if self.dry_run:
            return

        created = 0
        for row in rows:
            coach_id = row.get("coach_id")
            coach = Coach.objects.filter(id=coach_id).first() if coach_id else None
            if not coach:
                continue

            CoachBlockedDate.objects.update_or_create(
                id=row.get("id"),
                defaults={
                    "coach": coach,
                    "blocked_date": parse_date(row.get("blocked_date")) or timezone.now().date(),
                    "start_time": parse_time(row.get("start_time")),
                    "end_time": parse_time(row.get("end_time")),
                    "reason": row.get("reason", ""),
                    "created_at": parse_datetime(row.get("created_at")) or timezone.now(),
                },
            )
            created += 1

        self.stdout.write(f"  Migrated {created} blocked dates")

    def migrate_user_points(self, supabase):
        """Migrate user_points table."""
        rows = self._fetch_all(supabase, "user_points")
        if self.dry_run:
            return

        created = 0
        for row in rows:
            user_id = row.get("user_id")
            user = User.objects.filter(id=user_id).first() if user_id else None
            if not user:
                continue

            UserPoints.objects.update_or_create(
                id=row.get("id"),
                defaults={
                    "user": user,
                    "balance": row.get("balance", 0) or 0,
                    "total_purchased": row.get("total_purchased", 0) or 0,
                    "total_used": row.get("total_used", 0) or 0,
                    "expires_at": parse_datetime(row.get("expires_at")),
                    "created_at": parse_datetime(row.get("created_at")) or timezone.now(),
                    "updated_at": parse_datetime(row.get("updated_at")) or timezone.now(),
                },
            )
            created += 1

        self.stdout.write(f"  Migrated {created} user points records")

    def migrate_point_transactions(self, supabase):
        """Migrate point_transactions table."""
        rows = self._fetch_all(supabase, "point_transactions")
        if self.dry_run:
            return

        created = 0
        for row in rows:
            user_id = row.get("user_id")
            booking_id = row.get("booking_id")
            user = User.objects.filter(id=user_id).first() if user_id else None
            booking = (
                FlexibleBooking.objects.filter(id=booking_id).first()
                if booking_id
                else None
            )
            if not user:
                continue

            PointTransaction.objects.update_or_create(
                id=row.get("id"),
                defaults={
                    "user": user,
                    "type": row.get("type", "purchase"),
                    "amount": row.get("amount", 0) or 0,
                    "balance_after": row.get("balance_after", 0) or 0,
                    "booking": booking,
                    "payment_reference": row.get("payment_reference", ""),
                    "description": row.get("description", ""),
                    "status": row.get("status", "completed"),
                    "expires_at": parse_datetime(row.get("expires_at")),
                    "created_at": parse_datetime(row.get("created_at")) or timezone.now(),
                },
            )
            created += 1

        self.stdout.write(f"  Migrated {created} point transactions")
