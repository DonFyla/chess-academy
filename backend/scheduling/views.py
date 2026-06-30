import json
from collections import OrderedDict, defaultdict
from datetime import date, datetime, time, timedelta
from django.conf import settings
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.urls import reverse
from django.utils import timezone
from .models import Coach, AvailabilitySlot, CoachBlockedDate, SpecialBooking
from .forms import BookingForm, CoachProfileForm, AvailabilitySlotForm, CoachBlockedDateForm, PointsBookingForm, SpecialBookingForm
from .emails import (
    send_recurring_booking_created,
    send_flexible_booking_created,
    send_special_booking_created,
)
from payments.paystack_service import generate_reference, initialize_transaction


DAY_ORDER = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
]


def _parse_session_date(value):
    if isinstance(value, date):
        return value
    if isinstance(value, dict):
        value = value.get("date") or value.get("session_date")
    if not value:
        return None
    try:
        return datetime.strptime(str(value), "%Y-%m-%d").date()
    except ValueError:
        return None


def _parse_session_time(value):
    if isinstance(value, time):
        return value
    if not value:
        return None
    for fmt in ("%H:%M", "%H:%M:%S", "%I:%M %p"):
        try:
            return datetime.strptime(str(value), fmt).time()
        except ValueError:
            continue
    return None


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
                if booking.payment_status == "paid":
                    booking.status = "confirmed"
                    booking.save(update_fields=["status"])
                    messages.success(request, "Booking confirmed.")
                else:
                    messages.error(request, "Booking cannot be confirmed until payment has been received.")
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
    flexible_bookings = coach.flexible_bookings.exclude(status="cancelled").order_by("-session_date", "-start_time")

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
        "flexible_bookings": flexible_bookings,
    }
    return render(request, "scheduling/coach_dashboard.html", context)


@login_required
def book_coach_view(request, coach_id):
    from datetime import date as dt_date
    from payments.points_service import get_balance, has_sufficient_points, use_points
    from .models import FlexibleBooking

    coach = get_object_or_404(Coach, id=coach_id)

    availability_slots = coach.availability_slots.order_by("day_of_week", "start_time")
    slots_by_day = defaultdict(list)
    for slot in availability_slots:
        slots_by_day[slot.day_of_week].append(slot)
    available_days = sorted(slots_by_day.keys())

    # Existing recurring bookings for recurring tab
    existing_recurring = coach.bookings.exclude(status__in=["rejected", "cancelled"])
    booked_slots_recurring = defaultdict(list)
    seen_recurring_slots = set()
    for booking in existing_recurring:
        for session in booking.recurring_dates or []:
            try:
                session_date = dt_date.fromisoformat(session["date"])
            except (ValueError, TypeError):
                continue
            # Convert Python weekday (Mon=0) to JS weekday (Sun=0)
            day = (session_date.weekday() + 1) % 7
            start = session.get("start_time")
            end = session.get("end_time")
            if not start or not end:
                continue
            key = (day, start, end)
            if key not in seen_recurring_slots:
                seen_recurring_slots.add(key)
                booked_slots_recurring[day].append({"start": start, "end": end})

    # Existing flexible bookings for points tab
    existing_flexible = coach.flexible_bookings.exclude(status="cancelled")
    booked_slots_flexible = defaultdict(list)
    for booking in existing_flexible:
        booked_slots_flexible[booking.session_date.isoformat()].append({
            "start": booking.start_time.strftime("%H:%M"),
            "end": booking.end_time.strftime("%H:%M"),
        })

    # Existing special bookings block their chosen slots too
    existing_special = coach.special_bookings.exclude(status__in=["cancelled"])
    booked_slots_special = defaultdict(list)
    for booking in existing_special:
        for session in booking.session_dates or []:
            session_date = _parse_session_date(session)
            start = _parse_session_time(session.get("start_time")) if isinstance(session, dict) else None
            end = _parse_session_time(session.get("end_time")) if isinstance(session, dict) else None
            if session_date and start and end:
                booked_slots_special[session_date.isoformat()].append({
                    "start": start.strftime("%H:%M"),
                    "end": end.strftime("%H:%M"),
                })

    # Blocked dates
    blocked_dates_list = list(coach.blocked_dates.all())
    blocked_dates_json = {}
    for block in blocked_dates_list:
        key = block.blocked_date.isoformat()
        blocked_dates_json[key] = {
            "full_day": block.start_time is None or block.end_time is None,
            "start": block.start_time.strftime("%H:%M") if block.start_time else None,
            "end": block.end_time.strftime("%H:%M") if block.end_time else None,
        }

    initial = {}
    if request.user.is_authenticated:
        initial["student_name"] = request.user.full_name or request.user.username or ""
        initial["student_email"] = request.user.email
        initial["student_phone"] = request.user.phone or ""

    recurring_form = BookingForm(initial=initial)
    points_form = PointsBookingForm(initial=initial)
    special_form = SpecialBookingForm(initial=initial)

    if request.method == "POST":
        booking_type = request.POST.get("booking_type", "recurring")

        if booking_type == "recurring":
            recurring_form = BookingForm(request.POST)
            if recurring_form.is_valid():
                booking = recurring_form.save(coach=coach)

                # Initialize Paystack payment for the recurring booking
                payment_reference = generate_reference(prefix="BK")
                amount_kobo = int(booking.monthly_amount * 100)
                callback_url = request.build_absolute_uri(reverse("payments:booking_callback"))

                booking.payment_reference = payment_reference
                booking.payment_amount = booking.monthly_amount
                booking.payment_status = "pending"
                booking.save(update_fields=["payment_reference", "payment_amount", "payment_status"])

                send_recurring_booking_created(booking)

                result = initialize_transaction(
                    email=booking.student_email,
                    amount_kobo=amount_kobo,
                    reference=payment_reference,
                    callback_url=callback_url,
                    metadata={
                        "booking_id": str(booking.id),
                        "type": "recurring_booking",
                        "coach_id": str(coach.id),
                        "amount": str(booking.monthly_amount),
                    },
                )

                if result["success"]:
                    return render(request, "scheduling/booking_payment.html", {
                        "booking": booking,
                        "payment_reference": payment_reference,
                        "authorization_url": result["authorization_url"],
                        "paystack_public_key": settings.PAYSTACK_PUBLIC_KEY,
                    })
                else:
                    messages.error(
                        request,
                        f"Booking saved, but we could not start payment: {result['message']}. Please retry from your dashboard."
                    )
                    return render(request, "scheduling/booking_payment.html", {
                        "booking": booking,
                        "payment_reference": payment_reference,
                        "paystack_error": result["message"],
                        "paystack_public_key": settings.PAYSTACK_PUBLIC_KEY,
                    })
            else:
                messages.error(request, "Please correct the errors below.")

        elif booking_type == "special":
            special_form = SpecialBookingForm(request.POST)
            if special_form.is_valid():
                slots = special_form.cleaned_data["selected_slots"]
                hourly_rate = coach.hourly_rate or 10000
                base_amount = len(slots) * hourly_rate

                # Discount tiers
                discount_percent = 0
                if len(slots) >= 12:
                    discount_percent = 15
                elif len(slots) >= 8:
                    discount_percent = 10
                total_amount = int(base_amount * (1 - discount_percent / 100))

                session_dates = []
                for slot in slots:
                    session_date = dt_date.fromisoformat(slot["date"])
                    start_time = datetime.strptime(slot["start_time"], "%H:%M").time()
                    end_time = datetime.strptime(slot["end_time"], "%H:%M").time()
                    session_dates.append({
                        "date": session_date.isoformat(),
                        "start_time": start_time.strftime("%H:%M"),
                        "end_time": end_time.strftime("%H:%M"),
                    })

                payment_reference = generate_reference(prefix="SP")
                special_booking = SpecialBooking.objects.create(
                    coach=coach,
                    student=request.user,
                    student_name=special_form.cleaned_data["student_name"],
                    student_email=special_form.cleaned_data["student_email"],
                    student_phone=special_form.cleaned_data.get("student_phone", ""),
                    total_sessions=len(slots),
                    session_dates=session_dates,
                    is_recurring=False,
                    recurring_days=[],
                    recurring_weeks=4,
                    hourly_rate=hourly_rate,
                    total_amount=total_amount,
                    status="pending_payment",
                    payment_status="pending",
                    payment_reference=payment_reference,
                    payment_amount=total_amount,
                    admin_notes=special_form.cleaned_data.get("admin_notes", ""),
                )

                send_special_booking_created(special_booking)

                # Initialize Paystack payment for the special booking
                amount_kobo = int(total_amount * 100)
                callback_url = request.build_absolute_uri(reverse("payments:special_booking_callback"))

                result = initialize_transaction(
                    email=special_booking.student_email,
                    amount_kobo=amount_kobo,
                    reference=payment_reference,
                    callback_url=callback_url,
                    metadata={
                        "booking_id": str(special_booking.id),
                        "type": "special_booking",
                        "coach_id": str(coach.id),
                        "amount": str(total_amount),
                    },
                )

                if result["success"]:
                    return render(request, "scheduling/special_booking_payment.html", {
                        "booking": special_booking,
                        "payment_reference": payment_reference,
                        "authorization_url": result["authorization_url"],
                        "paystack_public_key": settings.PAYSTACK_PUBLIC_KEY,
                    })
                else:
                    messages.error(
                        request,
                        f"Booking saved, but we could not start payment: {result['message']}. Please retry from your dashboard."
                    )
                    return render(request, "scheduling/special_booking_payment.html", {
                        "booking": special_booking,
                        "payment_reference": payment_reference,
                        "paystack_error": result["message"],
                        "paystack_public_key": settings.PAYSTACK_PUBLIC_KEY,
                    })
            else:
                messages.error(request, "Please correct the errors below.")

        elif booking_type == "points":
            points_form = PointsBookingForm(request.POST)
            if points_form.is_valid():
                slots = points_form.cleaned_data["selected_slots"]
                points_cost = coach.points_cost or 1
                total_cost = len(slots) * points_cost

                if not has_sufficient_points(request.user, total_cost):
                    messages.error(
                        request,
                        f"You need {total_cost} points but only have {get_balance(request.user)}. Please buy more points."
                    )
                else:
                    created_bookings = []
                    for slot in slots:
                        session_date = dt_date.fromisoformat(slot["date"])
                        start_time = datetime.strptime(slot["start_time"], "%H:%M").time()
                        end_time = datetime.strptime(slot["end_time"], "%H:%M").time()

                        flex_booking = FlexibleBooking.objects.create(
                            user=request.user,
                            coach=coach,
                            session_date=session_date,
                            start_time=start_time,
                            end_time=end_time,
                            day_of_week=slot["day_of_week"],
                            points_used=points_cost,
                            meeting_link=coach.meeting_link,
                            student_notes=points_form.cleaned_data.get("student_notes", ""),
                        )
                        created_bookings.append(flex_booking)

                    if created_bookings:
                        use_points(
                            request.user,
                            total_cost,
                            flexible_booking=created_bookings[0],
                            description=f"Booked {len(created_bookings)} session(s) with {coach.name}",
                        )
                        for flex_booking in created_bookings:
                            send_flexible_booking_created(flex_booking)
                        messages.success(
                            request,
                            f"Successfully booked {len(created_bookings)} session(s) with {coach.name}. Your remaining balance is {get_balance(request.user)} points."
                        )
                        return redirect("scheduling:flexible_booking_confirmation", booking_id=created_bookings[0].id)
            else:
                messages.error(request, "Please correct the errors below.")

    # Serialize slot data for JavaScript
    slots_json = {}
    for day, slots in slots_by_day.items():
        slots_json[str(day)] = [
            {"start_time": s.start_time.strftime("%H:%M"), "end_time": s.end_time.strftime("%H:%M")}
            for s in slots
        ]

    booked_recurring_json = {}
    for day, slots in booked_slots_recurring.items():
        booked_recurring_json[str(day)] = [
            {"start": s["start"], "end": s["end"]}
            for s in slots
        ]

    context = {
        "coach": coach,
        "recurring_form": recurring_form,
        "points_form": points_form,
        "special_form": special_form,
        "slots_by_day_json": json.dumps(slots_json),
        "available_days": available_days,
        "booked_slots_recurring_json": json.dumps(booked_recurring_json),
        "booked_slots_flexible_json": json.dumps(booked_slots_flexible),
        "booked_slots_special_json": json.dumps(booked_slots_special),
        "blocked_dates_json": json.dumps(blocked_dates_json),
        "day_order": DAY_ORDER,
        "day_order_json": json.dumps(DAY_ORDER),
        "price_per_session": coach.hourly_rate or 10000,
        "points_cost": coach.points_cost or 1,
        "user_balance": get_balance(request.user),
    }
    return render(request, "scheduling/book_coach.html", context)


@login_required
def booking_confirmation_view(request, booking_id):
    from .models import Booking
    booking = get_object_or_404(Booking, id=booking_id)
    return render(request, "scheduling/booking_confirmation.html", {"booking": booking})


@login_required
def flexible_booking_confirmation_view(request, booking_id):
    from .models import FlexibleBooking
    booking = get_object_or_404(FlexibleBooking, id=booking_id)
    return render(request, "scheduling/flexible_booking_confirmation.html", {"booking": booking})


@login_required
def special_booking_confirmation_view(request, booking_id):
    booking = get_object_or_404(SpecialBooking, id=booking_id)
    return render(request, "scheduling/special_booking_confirmation.html", {"booking": booking})
