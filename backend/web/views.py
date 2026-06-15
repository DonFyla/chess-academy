from django.shortcuts import render
from .data import (
    TUTORS,
    EVENTS,
    GALLERY,
    COURSES,
    TESTIMONIALS,
    COURSE_CURRICULA,
    COURSE_TUTORS,
)


def home(request):
    context = {
        "courses": COURSES[:3],
        "tutors": TUTORS,
        "testimonials": TESTIMONIALS,
        "gallery": GALLERY[:6],
        "hero_cards": GALLERY[6:10],
    }
    return render(request, "web/home.html", context)


def courses(request):
    return render(request, "web/courses.html", {"courses": COURSES})


def tutors(request):
    return render(request, "web/tutors.html", {"tutors": TUTORS})


def gallery(request):
    return render(request, "web/gallery.html", {"gallery": GALLERY, "events": EVENTS})


def course_detail(request, slug):
    course = COURSE_CURRICULA.get(slug)
    if not course:
        from django.http import Http404

        raise Http404("Course not found")
    context = {
        "course": course,
        "tutors": COURSE_TUTORS,
        "slug": slug,
    }
    return render(request, "web/course_detail.html", context)
