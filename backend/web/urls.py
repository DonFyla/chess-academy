from django.urls import path
from . import views

urlpatterns = [
    path("", views.home, name="home"),
    path("courses/", views.courses, name="courses"),
    path("tutors/", views.tutors, name="tutors"),
    path("gallery/", views.gallery, name="gallery"),
    path("courses/<slug:slug>/", views.course_detail, name="course_detail"),
]
