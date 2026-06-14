from django.shortcuts import render


def payments_index(request):
    return render(request, "payments/index.html")
