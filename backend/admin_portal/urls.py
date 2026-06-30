from django.urls import path
from . import views

app_name = "admin_portal"

urlpatterns = [
    path("", views.dashboard_view, name="dashboard"),
    path("bookings/", views.bookings_view, name="bookings"),
    path("bookings/<uuid:booking_id>/action/", views.booking_action_view, name="booking_action"),
    path("schedule/", views.schedule_view, name="schedule"),
    path("schedule-dashboard/", views.schedule_dashboard_view, name="schedule_dashboard"),
    path("coaches/", views.coaches_view, name="coaches"),
    path("coaches/<uuid:coach_id>/edit/", views.coach_edit_view, name="coach_edit"),
    path("students/", views.students_view, name="students"),
    path("students/<uuid:student_id>/", views.student_detail_view, name="student_detail"),
]
