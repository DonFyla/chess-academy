from django.urls import path
from . import views

app_name = "scheduling"

urlpatterns = [
    path("", views.schedule_index, name="index"),
]
