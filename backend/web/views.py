from django.shortcuts import render


def home(request):
    return render(request, "web/home.html")


def quiz_page(request):
    return render(request, "web/quiz.html")
