from django.urls import path
from . import views

app_name = "scheduling"

urlpatterns = [
    path("", views.schedule_index, name="index"),
    path("coach/dashboard/", views.coach_dashboard_view, name="coach_dashboard"),
    path("book/<uuid:coach_id>/", views.book_coach_view, name="book_coach"),
    path("book/confirmation/<uuid:booking_id>/", views.booking_confirmation_view, name="booking_confirmation"),
]
