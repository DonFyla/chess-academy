from datetime import date, datetime, time, timedelta

from django.contrib import messages
from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required, user_passes_test
from django.db.models import Count, Sum, Q
from django.shortcuts import get_object_or_404, redirect, render, reverse
from django.utils import timezone

from payments.models import PointTransaction, UserPoints
from scheduling.models import (
    AvailabilitySlot,
    Booking,
    Coach,
    FlexibleBooking,
    SpecialBooking,
    CoachBlockedDate,
)
from scheduling.forms import AvailabilitySlotForm, CoachBlockedDateForm
from scheduling.emails import (
    send_recurring_booking_confirmed,
    send_recurring_booking_cancelled,
    send_special_booking_confirmed,
    send_special_booking_cancelled,
)


User = get_user_model()


def _is_admin(user):
    return user.is_authenticated and user.is_superuser


def _admin_view(view):
    return login_required(user_passes_test(_is_admin)(view))


def _parse_date(value):
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


def _parse_time(value):
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


def _count_sessions_this_week(week_start, week_end):
    """Count actual class sessions occurring this week across all booking types."""
    count = 0

    # Recurring monthly bookings: count session dates in recurring_dates JSON
    for booking in Booking.objects.filter(
        status="confirmed", payment_status="paid"
    ).iterator():
        for session in booking.recurring_dates or []:
            session_date = _parse_date(session)
            if session_date and week_start <= session_date <= week_end:
                count += 1

    # Flexible points bookings: count sessions by session_date
    count += FlexibleBooking.objects.filter(
        session_date__range=(week_start, week_end),
        status__in=["confirmed", "completed"],
    ).count()

    # Special bookings: count session dates in session_dates JSON
    for booking in SpecialBooking.objects.filter(
        status__in=["confirmed", "completed"]
    ).iterator():
        for session in booking.session_dates or []:
            session_date = _parse_date(session)
            if session_date and week_start <= session_date <= week_end:
                count += 1

    return count


@_admin_view
def dashboard_view(request):
    today = timezone.now().date()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)

    context = {
        "admin_section": "dashboard",
        "total_students": User.objects.filter(is_student=True).count(),
        "total_coaches": Coach.objects.count(),
        "pending_bookings": Booking.objects.filter(status="pending").count(),
        "confirmed_bookings_this_week": _count_sessions_this_week(week_start, week_end),
        "pending_points": PointTransaction.objects.filter(status="pending", type="purchase").count(),
        "recent_bookings": Booking.objects.select_related("coach").order_by("-created_at")[:5],
        "recent_points": PointTransaction.objects.select_related("user").order_by("-created_at")[:5],
    }
    return render(request, "admin_portal/dashboard.html", context)


@_admin_view
def bookings_view(request):
    bookings = Booking.objects.select_related("coach").order_by("-created_at")

    status_filter = request.GET.get("status", "")
    coach_filter = request.GET.get("coach", "")
    search = request.GET.get("q", "").strip()

    if status_filter:
        bookings = bookings.filter(status=status_filter)
    if coach_filter:
        bookings = bookings.filter(coach_id=coach_filter)
    if search:
        bookings = bookings.filter(
            Q(student_name__icontains=search)
            | Q(student_email__icontains=search)
        )

    coaches = Coach.objects.order_by("name")

    context = {
        "admin_section": "bookings",
        "bookings": bookings,
        "coaches": coaches,
        "status_filter": status_filter,
        "coach_filter": coach_filter,
        "search": search,
        "status_choices": Booking.STATUS_CHOICES,
    }
    return render(request, "admin_portal/bookings.html", context)


@_admin_view
def booking_action_view(request, booking_id):
    booking = get_object_or_404(Booking, id=booking_id)
    action = request.POST.get("action")

    if action == "confirm":
        booking.status = "confirmed"
        booking.payment_status = "paid"
        booking.payment_date = timezone.now()
        booking.save(update_fields=["status", "payment_status", "payment_date"])
        send_recurring_booking_confirmed(booking)
        messages.success(request, f"Booking for {booking.student_name} confirmed.")
    elif action == "reject":
        booking.status = "rejected"
        booking.save(update_fields=["status"])
        send_recurring_booking_cancelled(booking)
        messages.success(request, f"Booking for {booking.student_name} rejected.")
    elif action == "cancel":
        booking.status = "cancelled"
        booking.save(update_fields=["status"])
        send_recurring_booking_cancelled(booking)
        messages.success(request, f"Booking for {booking.student_name} cancelled.")
    else:
        messages.error(request, "Unknown action.")

    return redirect("admin_portal:bookings")


@_admin_view
def coaches_view(request):
    coaches = Coach.objects.order_by("name")
    context = {
        "admin_section": "coaches",
        "coaches": coaches,
    }
    return render(request, "admin_portal/coaches.html", context)


@_admin_view
def coach_edit_view(request, coach_id):
    coach = get_object_or_404(Coach, id=coach_id)

    if request.method == "POST":
        action = request.POST.get("action", "save")

        if action == "add_blocked_date":
            form = CoachBlockedDateForm(request.POST)
            if form.is_valid():
                block = form.save(commit=False)
                block.coach = coach
                block.save()
                messages.success(
                    request,
                    f"Blocked {block.blocked_date} for {coach.name}."
                )
            else:
                messages.error(request, "Could not add blocked date. Please check the form.")
            return redirect("admin_portal:coach_edit", coach_id=coach.id)

        if action == "delete_blocked_date":
            block_id = request.POST.get("block_id")
            CoachBlockedDate.objects.filter(id=block_id, coach=coach).delete()
            messages.success(request, "Blocked date removed.")
            return redirect("admin_portal:coach_edit", coach_id=coach.id)

        # Default: save coach profile
        coach.name = request.POST.get("name", coach.name).strip()
        coach.email = request.POST.get("email", coach.email).strip()
        coach.specialization = request.POST.get("specialization", "").strip()
        coach.bio = request.POST.get("bio", "").strip()
        coach.rank_title = request.POST.get("rank_title", "").strip()
        coach.meeting_link = request.POST.get("meeting_link", "").strip()
        coach.photo_url = request.POST.get("photo_url", "").strip()
        coach.hourly_rate = int(request.POST.get("hourly_rate", coach.hourly_rate or 0)) or None
        coach.points_cost = int(request.POST.get("points_cost", coach.points_cost or 1)) or 1
        coach.featured_order = request.POST.get("featured_order", "").strip() or None
        coach.is_special = request.POST.get("is_special") == "on"
        coach.is_admin = request.POST.get("is_admin") == "on"
        coach.save()
        messages.success(request, f"Coach {coach.name} updated.")
        return redirect("admin_portal:coaches")

    blocked_dates = coach.blocked_dates.order_by("-blocked_date", "-start_time")
    blocked_date_form = CoachBlockedDateForm()

    context = {
        "admin_section": "coaches",
        "coach": coach,
        "blocked_dates": blocked_dates,
        "blocked_date_form": blocked_date_form,
    }
    return render(request, "admin_portal/coach_edit.html", context)


@_admin_view
def students_view(request):
    students = User.objects.filter(is_student=True).order_by("-date_joined")
    search = request.GET.get("q", "").strip()
    if search:
        students = students.filter(
            Q(email__icontains=search)
            | Q(full_name__icontains=search)
        )

    context = {
        "admin_section": "students",
        "students": students,
        "search": search,
    }
    return render(request, "admin_portal/students.html", context)


@_admin_view
def student_detail_view(request, student_id):
    student = get_object_or_404(User, id=student_id, is_student=True)

    bookings = Booking.objects.filter(student_email=student.email).order_by("-created_at")
    flexible_bookings = FlexibleBooking.objects.filter(user=student).select_related("coach").order_by("-session_date")
    points_balance = 0
    try:
        points_balance = UserPoints.objects.get(user=student).balance
    except UserPoints.DoesNotExist:
        pass

    points_transactions = PointTransaction.objects.filter(user=student).order_by("-created_at")[:20]

    context = {
        "admin_section": "students",
        "student": student,
        "bookings": bookings,
        "flexible_bookings": flexible_bookings,
        "points_balance": points_balance,
        "points_transactions": points_transactions,
    }
    return render(request, "admin_portal/student_detail.html", context)


@_admin_view
def schedule_view(request):
    today = timezone.now().date()
    week_offset = int(request.GET.get("week", 0) or 0)
    week_start = today - timedelta(days=today.weekday()) + timedelta(weeks=week_offset)
    week_end = week_start + timedelta(days=6)

    sessions = []

    # Recurring monthly bookings
    recurring_bookings = Booking.objects.select_related("coach").exclude(
        status__in=["rejected", "cancelled"]
    )
    for booking in recurring_bookings:
        for session in booking.recurring_dates or []:
            session_date = _parse_date(session)
            if session_date and week_start <= session_date <= week_end:
                sessions.append(
                    {
                        "date": session_date,
                        "start_time": _parse_time(session.get("start_time")),
                        "end_time": _parse_time(session.get("end_time")),
                        "coach": booking.coach.name,
                        "student_name": booking.student_name,
                        "student_email": booking.student_email,
                        "type": "Recurring",
                        "status": booking.get_status_display(),
                        "payment_status": booking.get_payment_status_display(),
                        "booking": booking,
                    }
                )

    # Flexible points bookings
    flexible_bookings = FlexibleBooking.objects.select_related("coach", "user").filter(
        session_date__range=(week_start, week_end)
    ).exclude(status__in=["cancelled", "no_show"])
    for fb in flexible_bookings:
        sessions.append(
            {
                "date": fb.session_date,
                "start_time": fb.start_time,
                "end_time": fb.end_time,
                "coach": fb.coach.name,
                "student_name": fb.user.full_name or fb.user.email,
                "student_email": fb.user.email,
                "type": "Flexible",
                "status": fb.get_status_display(),
                "payment_status": "Points",
                "flexible_booking": fb,
            }
        )

    # Special bookings
    special_bookings = SpecialBooking.objects.select_related("coach").exclude(
        status__in=["cancelled"]
    )
    for sb in special_bookings:
        for session in sb.session_dates or []:
            session_date = _parse_date(session)
            if session_date and week_start <= session_date <= week_end:
                sessions.append(
                    {
                        "date": session_date,
                        "start_time": None,
                        "end_time": None,
                        "coach": sb.coach.name,
                        "student_name": sb.student_name,
                        "student_email": sb.student_email,
                        "type": "Special",
                        "status": sb.get_status_display(),
                        "payment_status": sb.get_status_display(),
                        "special_booking": sb,
                    }
                )

    sessions.sort(key=lambda s: (s["date"], s["start_time"] or time.min))

    context = {
        "admin_section": "schedule",
        "week_start": week_start,
        "week_end": week_end,
        "week_offset": week_offset,
        "prev_week": week_offset - 1,
        "next_week": week_offset + 1,
        "sessions": sessions,
    }
    return render(request, "admin_portal/schedule.html", context)


@_admin_view
def schedule_dashboard_view(request):
    selected_coach_id = request.GET.get("coach") or request.POST.get("coach_id")
    selected_coach = None
    if selected_coach_id:
        selected_coach = get_object_or_404(Coach, id=selected_coach_id)

    if request.method == "POST":
        action = request.POST.get("action", "")

        if action == "confirm_booking":
            booking = get_object_or_404(
                Booking, id=request.POST.get("booking_id"), status="pending", payment_status="pending"
            )
            booking.status = "confirmed"
            booking.payment_status = "paid"
            booking.payment_method = "admin_confirmed"
            booking.payment_date = timezone.now()
            booking.save(update_fields=["status", "payment_status", "payment_method", "payment_date"])
            send_recurring_booking_confirmed(booking)
            messages.success(request, f"Booking for {booking.student_name} confirmed.")
            return redirect("admin_portal:schedule_dashboard")

        if action == "reject_booking":
            booking = get_object_or_404(Booking, id=request.POST.get("booking_id"), status="pending")
            booking.status = "rejected"
            booking.save(update_fields=["status"])
            send_recurring_booking_cancelled(booking)
            messages.success(request, f"Booking for {booking.student_name} rejected.")
            return redirect("admin_portal:schedule_dashboard")

        if action == "cancel_booking":
            booking = get_object_or_404(Booking, id=request.POST.get("booking_id"))
            booking.status = "cancelled"
            booking.save(update_fields=["status"])
            send_recurring_booking_cancelled(booking)
            messages.success(request, f"Booking for {booking.student_name} cancelled.")
            return redirect("admin_portal:schedule_dashboard")

        if action == "confirm_special":
            booking = get_object_or_404(
                SpecialBooking, id=request.POST.get("booking_id"), status="pending_payment"
            )
            booking.status = "confirmed"
            booking.payment_status = "paid"
            booking.payment_method = "admin_confirmed"
            booking.payment_date = timezone.now()
            booking.save(update_fields=["status", "payment_status", "payment_method", "payment_date"])
            send_special_booking_confirmed(booking)
            messages.success(request, f"Special booking for {booking.student_name} confirmed.")
            return redirect("admin_portal:schedule_dashboard")

        if action == "cancel_special":
            booking = get_object_or_404(SpecialBooking, id=request.POST.get("booking_id"))
            booking.status = "cancelled"
            booking.save(update_fields=["status"])
            send_special_booking_cancelled(booking)
            messages.success(request, f"Special booking for {booking.student_name} cancelled.")
            return redirect("admin_portal:schedule_dashboard")

        if action == "add_availability" and selected_coach:
            form = AvailabilitySlotForm(request.POST)
            if form.is_valid():
                slot = form.save(commit=False)
                slot.coach = selected_coach
                slot.save()
                messages.success(
                    request,
                    f"Availability added for {selected_coach.name} on {slot.get_day_of_week_display()}."
                )
            else:
                messages.error(request, "Could not add availability. Please check the form.")
            return redirect(f"{reverse('admin_portal:schedule_dashboard')}?coach={selected_coach.id}")

        if action == "delete_availability" and selected_coach:
            slot_id = request.POST.get("slot_id")
            AvailabilitySlot.objects.filter(id=slot_id, coach=selected_coach).delete()
            messages.success(request, "Availability removed.")
            return redirect(f"{reverse('admin_portal:schedule_dashboard')}?coach={selected_coach.id}")

        if action == "add_block" and selected_coach:
            form = CoachBlockedDateForm(request.POST)
            if form.is_valid():
                block = form.save(commit=False)
                block.coach = selected_coach
                block.save()
                messages.success(request, f"Blocked {block.blocked_date} for {selected_coach.name}.")
            else:
                messages.error(request, "Could not add blocked date. Please check the form.")
            return redirect(f"{reverse('admin_portal:schedule_dashboard')}?coach={selected_coach.id}")

        if action == "delete_block" and selected_coach:
            block_id = request.POST.get("block_id")
            CoachBlockedDate.objects.filter(id=block_id, coach=selected_coach).delete()
            messages.success(request, "Blocked date removed.")
            return redirect(f"{reverse('admin_portal:schedule_dashboard')}?coach={selected_coach.id}")

    coaches = Coach.objects.order_by("name")

    pending_payment_bookings = Booking.objects.filter(
        status="pending", payment_status="pending"
    ).select_related("coach").order_by("-created_at")

    confirmed_bookings = Booking.objects.filter(
        status="confirmed"
    ).select_related("coach").order_by("-created_at")

    flexible_bookings = FlexibleBooking.objects.select_related("coach", "user").order_by("-session_date", "-start_time")

    pending_special = SpecialBooking.objects.filter(
        status="pending_payment"
    ).select_related("coach").order_by("-created_at")

    confirmed_special = SpecialBooking.objects.filter(
        status="confirmed"
    ).select_related("coach").order_by("-created_at")

    availability_slots = []
    blocked_dates = []
    availability_form = AvailabilitySlotForm()
    blocked_date_form = CoachBlockedDateForm()

    if selected_coach:
        availability_slots = selected_coach.availability_slots.order_by("day_of_week", "start_time")
        blocked_dates = selected_coach.blocked_dates.order_by("-blocked_date", "-start_time")

    context = {
        "admin_section": "schedule_dashboard",
        "coaches": coaches,
        "selected_coach": selected_coach,
        "availability_slots": availability_slots,
        "blocked_dates": blocked_dates,
        "availability_form": availability_form,
        "blocked_date_form": blocked_date_form,
        "pending_payment_bookings": pending_payment_bookings,
        "confirmed_bookings": confirmed_bookings,
        "flexible_bookings": flexible_bookings,
        "pending_special": pending_special,
        "confirmed_special": confirmed_special,
    }
    return render(request, "admin_portal/schedule_dashboard.html", context)
