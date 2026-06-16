from datetime import timedelta

from django.contrib import messages
from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required, user_passes_test
from django.db.models import Count, Sum, Q
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone

from payments.models import PointTransaction, UserPoints
from scheduling.models import Booking, Coach, FlexibleBooking


User = get_user_model()


def _is_admin(user):
    return user.is_authenticated and user.is_superuser


def _admin_view(view):
    return login_required(user_passes_test(_is_admin)(view))


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
        "confirmed_bookings_this_week": Booking.objects.filter(
            status="confirmed", payment_status="paid", booking_date__range=(week_start, week_end)
        ).count(),
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
        messages.success(request, f"Booking for {booking.student_name} confirmed.")
    elif action == "reject":
        booking.status = "rejected"
        booking.save(update_fields=["status"])
        messages.success(request, f"Booking for {booking.student_name} rejected.")
    elif action == "cancel":
        booking.status = "cancelled"
        booking.save(update_fields=["status"])
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

    context = {
        "admin_section": "coaches",
        "coach": coach,
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
