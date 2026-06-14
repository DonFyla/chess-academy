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
    points_cost = models.PositiveIntegerField(default=1)
    meeting_link = models.URLField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Coach"
        verbose_name_plural = "Coaches"

    def __str__(self):
        return self.name


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
    payment_method = models.CharField(max_length=50, blank=True, default="")
    payment_reference = models.CharField(max_length=255, blank=True, default="")
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
