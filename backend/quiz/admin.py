from django.contrib import admin
from django.utils.safestring import mark_safe
from .models import Qtaker, Question, Questionnaire, Options


@admin.register(Qtaker)
class QtakerAdmin(admin.ModelAdmin):
    list_display = ["name", "age", "email", "skill", "test_result", "date_taken"]


class AnswerInline(admin.TabularInline):
    model = Options


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = [
        "questionnaire",
        "question_preview",
        "placement",
        "created_at",
        "updated_at",
        "created_by",
    ]
    inlines = [AnswerInline]

    def question_preview(self, obj):
        return mark_safe(obj.question)

    question_preview.short_description = "Question"


@admin.register(Questionnaire)
class QuestionnaireAdmin(admin.ModelAdmin):
    list_display = ["title", "description", "created_at", "created_by"]
