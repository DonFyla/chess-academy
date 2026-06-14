from django.shortcuts import render


def quiz_index(request):
    return render(request, "quiz/index.html")
