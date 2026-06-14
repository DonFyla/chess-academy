from .models import Question


def get_next_question(current_question):
    """Get the next question in the questionnaire"""
    try:
        next_question = (
            Question.objects.filter(
                questionnaire=current_question.questionnaire,
                placement__gt=current_question.placement,
            )
            .order_by("placement")
            .first()
        )
        return next_question
    except Question.DoesNotExist:
        return None
