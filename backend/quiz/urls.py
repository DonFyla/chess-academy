from django.urls import path
from . import views

app_name = "quiz"

urlpatterns = [
    path("", views.qtaker_view, name="register"),
    path("<int:qtaker_id>/<int:question_id>/", views.quiz_question_view, name="question"),
    path("answer/<int:qtaker_id>/<int:answer_id>/", views.quiz_answer_view, name="answer"),
    path("result/<int:qtaker_id>/", views.quiz_result_view, name="result"),
]
