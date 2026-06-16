from datetime import datetime, time
from django.shortcuts import render, redirect
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import AuthenticationForm
from django.utils import timezone
from .forms import CustomUserCreationForm


def _parse_session_date(value):
    if not value:
        return None
    try:
        return datetime.strptime(str(value), "%Y-%m-%d").date()
    except ValueError:
        return None


def _parse_session_time(value):
    if not value:
        return None
    try:
        return datetime.strptime(str(value), "%H:%M").time()
    except ValueError:
        return None


def _get_dashboard_url(user):
    """Return the appropriate dashboard URL based on user role."""
    if user.is_coach:
        return "scheduling:coach_dashboard"
    return "accounts:dashboard"


def login_view(request):
    if request.method == "POST":
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            return redirect(_get_dashboard_url(user))
    else:
        form = AuthenticationForm()
    return render(request, "accounts/login.html", {"form": form})


def logout_view(request):
    logout(request)
    return redirect("home")


def signup_view(request):
    if request.method == "POST":
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            _create_profile_for_user(user)
            login(request, user)
            return redirect(_get_dashboard_url(user))
    else:
        form = CustomUserCreationForm()
    return render(request, "accounts/signup.html", {"form": form})


def _create_profile_for_user(user):
    """Create a scheduling app profile for a newly registered user."""
    from scheduling.models import Coach, Student

    if user.is_coach:
        Coach.objects.get_or_create(
            user=user,
            defaults={
                "name": user.full_name or user.username or user.email,
                "email": user.email,
            },
        )
    elif user.is_student:
        Student.objects.get_or_create(
            user=user,
            defaults={"parent_phone": user.phone},
        )


@login_required
def dashboard_view(request):
    user = request.user
    today = timezone.now().date()

    if user.is_coach:
        return redirect("scheduling:coach_dashboard")

    # Student dashboard
    from scheduling.models import Booking, FlexibleBooking
    from quiz.models import Qtaker
    from payments.points_service import get_balance

    bookings = Booking.objects.filter(student_email=user.email).order_by("-created_at")
    pending_bookings = bookings.filter(status="pending")
    confirmed_bookings = bookings.filter(status="confirmed")
    rejected_bookings = bookings.filter(status="rejected")

    flexible_bookings = FlexibleBooking.objects.filter(user=user).order_by("-session_date", "-start_time")
    upcoming_flexible = flexible_bookings.filter(session_date__gte=today, status__in=["confirmed", "completed"])
    past_flexible = flexible_bookings.filter(session_date__lt=today, status__in=["confirmed", "completed"])
    cancelled_flexible = flexible_bookings.filter(status="cancelled")

    # Build a unified list of upcoming sessions from both recurring and points bookings
    upcoming_sessions = []

    for booking in confirmed_bookings:
        for session in booking.recurring_dates or []:
            session_date = _parse_session_date(session.get("date"))
            if session_date and session_date >= today:
                upcoming_sessions.append({
                    "type": "recurring",
                    "coach": booking.coach,
                    "session_date": session_date,
                    "start_time": _parse_session_time(session.get("start_time")),
                    "end_time": _parse_session_time(session.get("end_time")),
                    "booking": booking,
                })

    for booking in upcoming_flexible:
        upcoming_sessions.append({
            "type": "points",
            "coach": booking.coach,
            "session_date": booking.session_date,
            "start_time": booking.start_time,
            "end_time": booking.end_time,
            "booking": booking,
        })

    upcoming_sessions.sort(key=lambda s: (s["session_date"], s["start_time"] or time.min))

    quiz_history = Qtaker.objects.filter(email=user.email).order_by("-date_taken")[:5]

    context = {
        "user": user,
        "bookings": bookings,
        "pending_bookings": pending_bookings,
        "confirmed_bookings": confirmed_bookings,
        "rejected_bookings": rejected_bookings,
        "flexible_bookings": flexible_bookings,
        "past_flexible": past_flexible,
        "cancelled_flexible": cancelled_flexible,
        "upcoming_sessions": upcoming_sessions,
        "user_balance": get_balance(user),
        "quiz_history": quiz_history,
    }
    return render(request, "accounts/dashboard_student.html", context)
