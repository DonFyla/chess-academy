from django.shortcuts import render, redirect
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import AuthenticationForm
from django.utils import timezone
from .forms import CustomUserCreationForm


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
    from scheduling.models import Booking
    from quiz.models import Qtaker

    bookings = Booking.objects.filter(student_email=user.email).order_by("-created_at")
    pending_bookings = bookings.filter(status="pending")
    confirmed_bookings = bookings.filter(status="confirmed")
    rejected_bookings = bookings.filter(status="rejected")

    quiz_history = Qtaker.objects.filter(email=user.email).order_by("-date_taken")[:5]

    context = {
        "user": user,
        "bookings": bookings,
        "pending_bookings": pending_bookings,
        "confirmed_bookings": confirmed_bookings,
        "rejected_bookings": rejected_bookings,
        "quiz_history": quiz_history,
    }
    return render(request, "accounts/dashboard_student.html", context)
