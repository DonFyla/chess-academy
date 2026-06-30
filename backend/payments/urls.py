from django.urls import path
from . import views
from . import admin_views
from . import webhook_views

app_name = "payments"

urlpatterns = [
    path("", views.payments_index, name="index"),
    path("buy-points/", views.buy_points_view, name="buy_points"),
    path("paystack/callback/", views.paystack_callback_view, name="paystack_callback"),
    path("paystack/booking/callback/", views.booking_callback_view, name="booking_callback"),
    path("paystack/special-booking/callback/", views.special_booking_callback_view, name="special_booking_callback"),
    path("paystack/webhook/", webhook_views.paystack_webhook_view, name="paystack_webhook"),
    path("admin/points/", admin_views.points_admin_view, name="points_admin"),
]
