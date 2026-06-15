from django.db import models
from django.conf import settings
from ckeditor.fields import RichTextField
from ckeditor_uploader.fields import RichTextUploadingField


class Questionnaire(models.Model):
    title = models.CharField(max_length=255, unique=True)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    def __str__(self):
        return self.title


class Qtaker(models.Model):
    chess_level = (
        ("beginner", "Beginner"),
        ("intermediate", "Intermediate"),
        ("expert", "Expert"),
    )
    name = models.CharField(null=False, max_length=100)
    age = models.IntegerField(blank=False, null=False)
    email = models.EmailField(null=True)
    current_question_set = models.JSONField(null=True, blank=True, default=None)
    next_question_set = models.JSONField(null=True, blank=True, default=None)
    date_taken = models.DateTimeField(auto_now_add=True, verbose_name="Event Date and Time")
    skill = models.CharField(choices=chess_level, default="beginner", max_length=100)
    test_result = models.FloatField(null=True)
    current_score = models.IntegerField(default=0)
    last_answer_id = models.PositiveIntegerField(null=True, blank=True)
    last_question_id = models.PositiveIntegerField(null=True, blank=True)
    last_text_answer = models.CharField(max_length=2000, blank=True, default="")

    def __str__(self):
        return self.name

    @classmethod
    def get_next_skill(cls, current_skill):
        skills = [choice[0] for choice in cls.chess_level]
        try:
            current_index = skills.index(current_skill)
            if current_index + 1 < len(skills):
                return skills[current_index + 1]
            else:
                return None
        except (IndexError, ValueError):
            return None


class Question(models.Model):
    QUESTION_TYPES = [
        ("text", "Text Answer"),
        ("radio", "Single Choice(checkbox)"),
    ]

    questionnaire = models.ForeignKey(Questionnaire, on_delete=models.CASCADE)
    question_type = models.CharField(
        choices=QUESTION_TYPES, max_length=20, default="radio"
    )
    question = RichTextUploadingField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    placement = models.PositiveIntegerField()

    def __str__(self):
        return f"{str(self.questionnaire)} - Q{self.placement} {self.question}"


class Options(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    text = models.TextField()
    correct = models.BooleanField()

    def __str__(self):
        return self.text
