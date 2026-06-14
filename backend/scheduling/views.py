from django.shortcuts import render


def schedule_index(request):
    return render(request, "scheduling/index.html")
