from django.urls import path
from . import views

app_name = "payments"

urlpatterns = [
    path("", views.payments_index, name="index"),
]
