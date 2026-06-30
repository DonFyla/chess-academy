import uuid
from django.db import models
from django.conf import settings


class Coach(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    bio = models.TextField(blank=True, default="")
    photo = models.ImageField(upload_to="coaches/", blank=True, null=True)
    photo_url = models.URLField(blank=True, default="")
    specialization = models.CharField(max_length=255, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        related_name="coach_profile",
    )
    is_admin = models.BooleanField(default=False)
    is_special = models.BooleanField(default=False)
    rank_title = models.CharField(max_length=255, blank=True, default="")
    hourly_rate = models.PositiveIntegerField(blank=True, null=True)
    achievements = models.JSONField(default=list, blank=True)
    special_bio = models.TextField(blank=True, default="")
    featured_order = models.PositiveIntegerField(blank=True, null=True)
    points_cost = models.PositiveIntegerField(default=1, blank=True)
    meeting_link = models.URLField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Coach"
        verbose_name_plural = "Coaches"

    def __str__(self):
        return self.name

    def get_available_slots_for_date(self, date):
        """Return available (start_time, end_time) tuples for the given date,
        with blocked-date ranges subtracted from weekly availability slots."""
        from datetime import datetime, time

        day_of_week = date.weekday()
        # Django's weekday() returns Monday=0, Sunday=6. Our DAY_CHOICES use Sunday=0.
        day_of_week = (day_of_week + 1) % 7

        slots = self.availability_slots.filter(day_of_week=day_of_week)
        blocked_ranges = self.blocked_dates.filter(blocked_date=date)

        def to_minutes(t):
            return t.hour * 60 + t.minute

        def to_time(m):
            return time(m // 60, m % 60)

        available = []
        for slot in slots:
            slot_start = to_minutes(slot.start_time)
            slot_end = to_minutes(slot.end_time)
            intervals = [(slot_start, slot_end)]

            for blocked in blocked_ranges:
                if blocked.start_time is None or blocked.end_time is None:
                    # Full-day block cancels this slot entirely.
                    intervals = []
                    break

                block_start = to_minutes(blocked.start_time)
                block_end = to_minutes(blocked.end_time)
                new_intervals = []
                for start, end in intervals:
                    if block_end <= start or block_start >= end:
                        # No overlap
                        new_intervals.append((start, end))
                    else:
                        if start < block_start:
                            new_intervals.append((start, block_start))
                        if block_end < end:
                            new_intervals.append((block_end, end))
                intervals = new_intervals
                if not intervals:
                    break

            for start, end in intervals:
                if end > start:
                    available.append((to_time(start), to_time(end)))

        return sorted(available)


class AvailabilitySlot(models.Model):
    DAY_CHOICES = [
        (0, "Sunday"),
        (1, "Monday"),
        (2, "Tuesday"),
        (3, "Wednesday"),
        (4, "Thursday"),
        (5, "Friday"),
        (6, "Saturday"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    coach = models.ForeignKey(
        Coach, on_delete=models.CASCADE, related_name="availability_slots"
    )
    day_of_week = models.IntegerField(choices=DAY_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["day_of_week", "start_time"]
        verbose_name = "Availability Slot"
        verbose_name_plural = "Availability Slots"

    def __str__(self):
        return f"{self.coach.name} - {self.get_day_of_week_display()} {self.start_time}-{self.end_time}"


class Booking(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("confirmed", "Confirmed"),
        ("rejected", "Rejected"),
        ("cancelled", "Cancelled"),
    ]

    PAYMENT_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("paid", "Paid"),
        ("failed", "Failed"),
        ("refunded", "Refunded"),
    ]

    BOOKING_MODE_CHOICES = [
        ("single", "Single"),
        ("double", "Double"),
    ]

    COURSE_TYPE_CHOICES = [
        ("beginner", "Beginner"),
        ("intermediate", "Intermediate"),
        ("expert", "Expert"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    coach = models.ForeignKey(
        Coach, on_delete=models.CASCADE, related_name="bookings"
    )
    student_name = models.CharField(max_length=255)
    student_email = models.EmailField()
    student_phone = models.CharField(max_length=20, blank=True, default="")
    booking_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="pending"
    )
    notes = models.TextField(blank=True, default="")
    course_type = models.CharField(
        max_length=20, choices=COURSE_TYPE_CHOICES, blank=True, default=""
    )
    recurring_days = models.JSONField(default=list, blank=True)
    recurring_dates = models.JSONField(default=list, blank=True)
    monthly_amount = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True
    )
    sessions_per_month = models.PositiveIntegerField(default=4)
    booking_mode = models.CharField(
        max_length=20, choices=BOOKING_MODE_CHOICES, default="single"
    )
    payment_status = models.CharField(
        max_length=20, choices=PAYMENT_STATUS_CHOICES, default="pending"
    )
    payment_date = models.DateTimeField(blank=True, null=True)
    payment_method = models.CharField(max_length=50, blank=True, default="")
    payment_amount = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True
    )
    payment_reference = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Monthly Booking"
        verbose_name_plural = "Monthly Bookings"

    def __str__(self):
        return f"{self.student_name} - {self.coach.name} ({self.status})"


class FlexibleBooking(models.Model):
    STATUS_CHOICES = [
        ("confirmed", "Confirmed"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
        ("no_show", "No Show"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="flexible_bookings",
    )
    coach = models.ForeignKey(
        Coach, on_delete=models.CASCADE, related_name="flexible_bookings"
    )
    session_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    day_of_week = models.IntegerField(choices=AvailabilitySlot.DAY_CHOICES)
    points_used = models.PositiveIntegerField()
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="confirmed"
    )
    cancelled_at = models.DateTimeField(blank=True, null=True)
    refund_processed = models.BooleanField(default=False)
    meeting_link = models.URLField(blank=True, default="")
    coach_notes = models.TextField(blank=True, default="")
    student_notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-session_date", "-start_time"]
        verbose_name = "Flexible Booking"
        verbose_name_plural = "Flexible Bookings"

    def __str__(self):
        return f"{self.user.email} - {self.coach.name} ({self.session_date})"


class SpecialBooking(models.Model):
    STATUS_CHOICES = [
        ("pending_payment", "Pending Payment"),
        ("payment_received", "Payment Received"),
        ("confirmed", "Confirmed"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    coach = models.ForeignKey(
        Coach, on_delete=models.CASCADE, related_name="special_bookings"
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="special_bookings",
    )
    student_name = models.CharField(max_length=255)
    student_email = models.EmailField()
    student_phone = models.CharField(max_length=20, blank=True, default="")
    total_sessions = models.PositiveIntegerField()
    sessions_completed = models.PositiveIntegerField(default=0)
    session_dates = models.JSONField(default=list)
    is_recurring = models.BooleanField(default=False)
    recurring_days = models.JSONField(default=list, blank=True)
    recurring_weeks = models.PositiveIntegerField(default=4)
    hourly_rate = models.PositiveIntegerField()
    total_amount = models.PositiveIntegerField()
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="pending_payment"
    )
    payment_status = models.CharField(
        max_length=20,
        choices=[
            ("pending", "Pending"),
            ("paid", "Paid"),
            ("failed", "Failed"),
            ("refunded", "Refunded"),
        ],
        default="pending",
    )
    payment_method = models.CharField(max_length=50, blank=True, default="")
    payment_reference = models.CharField(max_length=255, blank=True, default="")
    payment_amount = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True
    )
    payment_date = models.DateTimeField(blank=True, null=True)
    admin_notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Special Booking"
        verbose_name_plural = "Special Bookings"

    def __str__(self):
        return f"{self.student_name} - {self.coach.name} ({self.status})"


class Student(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="student_profile",
    )
    date_of_birth = models.DateField(blank=True, null=True)
    parent_name = models.CharField(max_length=255, blank=True, default="")
    parent_phone = models.CharField(max_length=20, blank=True, default="")
    address = models.TextField(blank=True, default="")
    school = models.CharField(max_length=255, blank=True, default="")
    chess_rating = models.PositiveIntegerField(blank=True, null=True)
    bio = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["user__email"]
        verbose_name = "Student"
        verbose_name_plural = "Students"

    def __str__(self):
        return self.user.email


class CoachBlockedDate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    coach = models.ForeignKey(
        Coach, on_delete=models.CASCADE, related_name="blocked_dates"
    )
    blocked_date = models.DateField()
    start_time = models.TimeField(blank=True, null=True)
    end_time = models.TimeField(blank=True, null=True)
    reason = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-blocked_date"]
        verbose_name = "Coach Blocked Date"
        verbose_name_plural = "Coach Blocked Dates"
        unique_together = ["coach", "blocked_date", "start_time"]

    def __str__(self):
        return f"{self.coach.name} - {self.blocked_date}"
