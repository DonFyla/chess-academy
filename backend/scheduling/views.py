import json
from collections import OrderedDict, defaultdict
from datetime import timedelta
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from .models import Coach, AvailabilitySlot, CoachBlockedDate
from .forms import BookingForm, CoachProfileForm, AvailabilitySlotForm, CoachBlockedDateForm


DAY_ORDER = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
]


@login_required
def schedule_index(request):
    return render(request, "scheduling/index.html")


@login_required
def coach_dashboard_view(request):
    if not request.user.is_coach:
        messages.error(request, "Coach dashboard is only available for coach accounts.")
        return redirect("accounts:dashboard")

    coach, created = Coach.objects.get_or_create(
        user=request.user,
        defaults={
            "name": request.user.full_name or request.user.username or request.user.email,
            "email": request.user.email,
        },
    )
    today = timezone.now().date()

    if request.method == "POST":
        action = request.POST.get("action")

        if action == "update_profile":
            form = CoachProfileForm(request.POST, request.FILES, instance=coach)
            if form.is_valid():
                form.save()
                messages.success(request, "Profile updated successfully.")
            else:
                messages.error(request, "Please correct the errors below.")
            return redirect("scheduling:coach_dashboard")

        elif action == "update_meeting_link":
            link = request.POST.get("meeting_link", "").strip()
            coach.meeting_link = link
            coach.save(update_fields=["meeting_link"])
            messages.success(request, "Meeting link updated successfully.")
            return redirect("scheduling:coach_dashboard")

        elif action == "add_availability":
            form = AvailabilitySlotForm(request.POST)
            if form.is_valid():
                slot = form.save(commit=False)
                slot.coach = coach
                slot.save()
                messages.success(request, "Availability slot added.")
            else:
                messages.error(request, "Could not add availability slot.")
            return redirect("scheduling:coach_dashboard")

        elif action == "delete_availability":
            slot_id = request.POST.get("slot_id")
            AvailabilitySlot.objects.filter(id=slot_id, coach=coach).delete()
            messages.success(request, "Availability slot removed.")
            return redirect("scheduling:coach_dashboard")

        elif action == "add_blocked_date":
            form = CoachBlockedDateForm(request.POST)
            if form.is_valid():
                blocked = form.save(commit=False)
                blocked.coach = coach
                blocked.save()
                messages.success(request, "Date blocked successfully.")
            else:
                messages.error(request, "Could not block date.")
            return redirect("scheduling:coach_dashboard")

        elif action == "delete_blocked_date":
            block_id = request.POST.get("block_id")
            CoachBlockedDate.objects.filter(id=block_id, coach=coach).delete()
            messages.success(request, "Blocked date removed.")
            return redirect("scheduling:coach_dashboard")

        elif action == "confirm_booking":
            booking_id = request.POST.get("booking_id")
            booking = coach.bookings.filter(id=booking_id).first()
            if booking:
                booking.status = "confirmed"
                booking.save(update_fields=["status"])
                messages.success(request, "Booking confirmed.")
            return redirect("scheduling:coach_dashboard")

        elif action == "reject_booking":
            booking_id = request.POST.get("booking_id")
            booking = coach.bookings.filter(id=booking_id).first()
            if booking:
                booking.status = "rejected"
                booking.save(update_fields=["status"])
                messages.success(request, "Booking rejected.")
            return redirect("scheduling:coach_dashboard")

    profile_form = CoachProfileForm(instance=coach)
    availability_form = AvailabilitySlotForm()
    blocked_date_form = CoachBlockedDateForm()

    availability_slots = coach.availability_slots.order_by("day_of_week", "start_time")

    # Effective availability preview for the next 7 days
    effective_availability_preview = []
    for offset in range(7):
        preview_date = today + timedelta(days=offset)
        slots = coach.get_available_slots_for_date(preview_date)
        effective_availability_preview.append({
            "date": preview_date,
            "slots": slots,
        })

    availability_slots_by_day = OrderedDict()
    for slot in availability_slots:
        day_name = DAY_ORDER[slot.day_of_week]
        availability_slots_by_day.setdefault(day_name, []).append(slot)

    blocked_dates = coach.blocked_dates.filter(blocked_date__gte=today).order_by("blocked_date")
    pending_bookings = coach.bookings.filter(status="pending").order_by("-created_at")
    upcoming_bookings = (
        coach.bookings.filter(status="confirmed", booking_date__gte=today)
        .order_by("booking_date", "start_time")
    )

    context = {
        "coach": coach,
        "profile_form": profile_form,
        "availability_form": availability_form,
        "blocked_date_form": blocked_date_form,
        "availability_slots": availability_slots,
        "availability_slots_by_day": availability_slots_by_day,
        "effective_availability_preview": effective_availability_preview,
        "blocked_dates": blocked_dates,
        "pending_bookings": pending_bookings,
        "upcoming_bookings": upcoming_bookings,
    }
    return render(request, "scheduling/coach_dashboard.html", context)


@login_required
def book_coach_view(request, coach_id):
    coach = get_object_or_404(Coach, id=coach_id)

    availability_slots = coach.availability_slots.order_by("day_of_week", "start_time")
    slots_by_day = defaultdict(list)
    for slot in availability_slots:
        slots_by_day[slot.day_of_week].append(slot)
    available_days = sorted(slots_by_day.keys())

    # Get existing bookings to mark conflicts
    existing_bookings = coach.bookings.exclude(status__in=["rejected", "cancelled"])
    booked_slots = defaultdict(list)
    for booking in existing_bookings:
        for day in booking.recurring_days or []:
            booked_slots[day].append({
                "start": booking.start_time,
                "end": booking.end_time,
            })

    if request.method == "POST":
        form = BookingForm(request.POST)
        if form.is_valid():
            booking = form.save(coach=coach)
            messages.success(
                request,
                f"Your booking request for {booking.sessions_per_month} sessions with {coach.name} has been submitted."
            )
            return redirect("scheduling:booking_confirmation", booking_id=booking.id)
        else:
            messages.error(request, "Please correct the errors below.")
    else:
        initial = {}
        if request.user.is_authenticated:
            initial["student_name"] = request.user.full_name or request.user.username or ""
            initial["student_email"] = request.user.email
            initial["student_phone"] = request.user.phone or ""
        form = BookingForm(initial=initial)

    # Serialize slot data for JavaScript
    slots_json = {}
    for day, slots in slots_by_day.items():
        slots_json[str(day)] = [
            {"start_time": s.start_time.strftime("%H:%M"), "end_time": s.end_time.strftime("%H:%M")}
            for s in slots
        ]

    booked_json = {}
    for day, slots in booked_slots.items():
        booked_json[str(day)] = [
            {"start": s["start"].strftime("%H:%M"), "end": s["end"].strftime("%H:%M")}
            for s in slots
        ]

    context = {
        "coach": coach,
        "form": form,
        "slots_by_day_json": json.dumps(slots_json),
        "available_days": available_days,
        "booked_slots_json": json.dumps(booked_json),
        "day_order": DAY_ORDER,
        "day_order_json": json.dumps(DAY_ORDER),
        "price_per_session": coach.hourly_rate or 10000,
    }
    return render(request, "scheduling/book_coach.html", context)


@login_required
def booking_confirmation_view(request, booking_id):
    from .models import Booking
    booking = get_object_or_404(Booking, id=booking_id)
    return render(request, "scheduling/booking_confirmation.html", {"booking": booking})
