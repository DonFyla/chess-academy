from django.contrib import admin
from .models import (
    Coach,
    Student,
    AvailabilitySlot,
    Booking,
    FlexibleBooking,
    SpecialBooking,
    CoachBlockedDate,
)


class AvailabilitySlotInline(admin.TabularInline):
    model = AvailabilitySlot
    extra = 1


class CoachBlockedDateInline(admin.TabularInline):
    model = CoachBlockedDate
    extra = 1


@admin.register(Coach)
class CoachAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "email",
        "is_admin",
        "is_special",
        "points_cost",
        "featured_order",
        "created_at",
    ]
    list_filter = ["is_admin", "is_special"]
    search_fields = ["name", "email", "specialization"]
    inlines = [AvailabilitySlotInline, CoachBlockedDateInline]


@admin.register(AvailabilitySlot)
class AvailabilitySlotAdmin(admin.ModelAdmin):
    list_display = ["coach", "day_of_week", "start_time", "end_time"]
    list_filter = ["day_of_week", "coach"]


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = [
        "student_name",
        "coach",
        "booking_date",
        "status",
        "payment_status",
        "created_at",
    ]
    list_filter = ["status", "payment_status", "course_type", "coach"]
    search_fields = ["student_name", "student_email"]


@admin.register(FlexibleBooking)
class FlexibleBookingAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "coach",
        "session_date",
        "start_time",
        "points_used",
        "status",
    ]
    list_filter = ["status", "coach"]
    search_fields = ["user__email", "coach__name"]


@admin.register(SpecialBooking)
class SpecialBookingAdmin(admin.ModelAdmin):
    list_display = [
        "student_name",
        "coach",
        "total_sessions",
        "status",
        "total_amount",
        "created_at",
    ]
    list_filter = ["status", "coach"]
    search_fields = ["student_name", "student_email"]


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "parent_name",
        "school",
        "chess_rating",
        "created_at",
    ]
    list_filter = ["school"]
    search_fields = ["user__email", "user__full_name", "parent_name", "school"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(CoachBlockedDate)
class CoachBlockedDateAdmin(admin.ModelAdmin):
    list_display = ["coach", "blocked_date", "start_time", "end_time", "reason"]
    list_filter = ["coach", "blocked_date"]
