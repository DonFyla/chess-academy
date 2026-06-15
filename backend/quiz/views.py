from django.shortcuts import render, get_object_or_404, redirect
from django.contrib import messages
from django.urls import reverse
from .models import Questionnaire, Question, Qtaker, Options
from .forms import QtakerForm, AnswerForm


QUESTIONS_PER_SESSION = 5
PASS_PERCENTAGE = 60


def _build_session(qtaker, questionnaire):
    """Build a randomized question session for a qtaker if needed."""
    all_questions = Question.objects.filter(questionnaire=questionnaire)
    if not all_questions.exists():
        return None
    question_count = all_questions.count()
    questions_to_take = min(QUESTIONS_PER_SESSION, question_count)
    # Evaluate the sliced QuerySet to a list to avoid SQLite randomisation quirks
    randomized_questions = list(all_questions.order_by("?")[:questions_to_take])
    randomized_question_ids = [q.id for q in randomized_questions]
    qtaker.current_question_set = randomized_question_ids
    qtaker.current_score = 0
    qtaker.next_question_set = []
    qtaker.save(update_fields=["current_question_set", "current_score", "next_question_set"])
    return randomized_question_ids


def _text_answer_is_correct(question, answer_text):
    """Return True if the supplied text matches any of the question's correct options."""
    if not answer_text:
        return False
    cleaned = answer_text.strip().lower()
    correct_texts = (
        Options.objects.filter(question=question, correct=True)
        .values_list("text", flat=True)
    )
    return any(cleaned == text.strip().lower() for text in correct_texts)


def qtaker_view(request):
    if request.method == "POST":
        form = QtakerForm(request.POST)
        if form.is_valid():
            qtaker = form.save()
            skill = qtaker.skill
            try:
                questionnaire = Questionnaire.objects.get(title=skill)
            except Questionnaire.DoesNotExist:
                messages.error(
                    request, f"No questionnaire found for skill level: {skill}"
                )
                return render(request, "quiz/register.html", {"form": form})

            session = _build_session(qtaker, questionnaire)
            if not session:
                messages.error(
                    request, f"No questions found for skill level: {skill}"
                )
                return render(request, "quiz/register.html", {"form": form})

            first_question_id = session[0]
            return redirect("quiz:question", qtaker_id=qtaker.id, question_id=first_question_id)
    else:
        form = QtakerForm()

    return render(request, "quiz/register.html", {"form": form})


def quiz_question_view(request, qtaker_id, question_id):
    qtaker = get_object_or_404(Qtaker, id=qtaker_id)
    skill = qtaker.skill
    questionnaire = get_object_or_404(Questionnaire, title=skill)
    question = get_object_or_404(Question, id=question_id, questionnaire=questionnaire)

    # Handle session transition from a previously completed questionnaire
    current_set = qtaker.current_question_set or []
    next_set = qtaker.next_question_set or []

    if next_set and question.id in next_set:
        # Promote next_question_set to current_question_set
        qtaker.current_question_set = next_set
        qtaker.next_question_set = []
        qtaker.save(update_fields=["current_question_set", "next_question_set"])
        question_ids = next_set
    elif current_set and question.id in current_set:
        question_ids = current_set
    elif not current_set and not next_set:
        # No session exists yet — build one
        question_ids = _build_session(qtaker, questionnaire) or []
    else:
        messages.error(request, "This question is not part of your current session.")
        return redirect("quiz:register")

    if question.id not in question_ids:
        messages.error(request, "This question is not part of your current session.")
        return redirect("quiz:register")

    current_index = question_ids.index(question.id)
    next_question_id = (
        question_ids[current_index + 1]
        if current_index + 1 < len(question_ids)
        else None
    )

    if request.method == "POST":
        form = AnswerForm(request.POST, question=question)
        if form.is_valid():
            answer_value = form.cleaned_data["answer"]
            stored_answer_id = 0
            stored_text_answer = ""
            is_correct = False

            if question.question_type == "radio":
                chosen_opt = get_object_or_404(
                    Options, pk=int(answer_value), question=question
                )
                is_correct = chosen_opt.correct
                stored_answer_id = chosen_opt.id
            elif question.question_type == "text":
                is_correct = _text_answer_is_correct(question, answer_value)
                stored_text_answer = answer_value.strip()

            qtaker.last_answer_id = stored_answer_id
            qtaker.last_question_id = question.id
            qtaker.last_text_answer = stored_text_answer
            qtaker.save(
                update_fields=["last_answer_id", "last_question_id", "last_text_answer"]
            )

            # Scoring is applied when viewing the answer details page.
            return redirect(
                "quiz:answer",
                qtaker_id=qtaker.id,
                answer_id=stored_answer_id,
            )
    else:
        form = AnswerForm(question=question)

    context = {
        "qtaker": qtaker,
        "question": question,
        "form": form,
        "next_question_id": next_question_id,
        "progress": {
            "current": question_ids.index(question.id) + 1,
            "total": len(question_ids),
        },
    }
    return render(request, "quiz/question.html", context)


def quiz_answer_view(request, qtaker_id, answer_id):
    qtaker = get_object_or_404(Qtaker, id=qtaker_id)
    answer_id_int = int(answer_id)

    if answer_id_int == 0:
        # Text answer
        if not qtaker.last_question_id:
            messages.error(request, "No question answer was recorded.")
            return redirect("quiz:register")
        question = get_object_or_404(Question, id=qtaker.last_question_id)
        user_answer_text = qtaker.last_text_answer
        is_correct = _text_answer_is_correct(question, user_answer_text)
        chosen_answer = {"id": 0, "text": user_answer_text, "correct": is_correct}
    else:
        chosen_answer_obj = get_object_or_404(Options, pk=answer_id_int)
        question = chosen_answer_obj.question
        is_correct = chosen_answer_obj.correct
        chosen_answer = {
            "id": chosen_answer_obj.id,
            "text": chosen_answer_obj.text,
            "correct": chosen_answer_obj.correct,
        }

    # Award score once per answer view
    if is_correct:
        qtaker.current_score += 1
        qtaker.save(update_fields=["current_score"])

    correct_answer = Options.objects.filter(question=question, correct=True).first()

    question_ids = qtaker.current_question_set or []
    next_question_id = None
    if question_ids and question.id in question_ids:
        idx = question_ids.index(question.id)
        next_question_id = (
            question_ids[idx + 1] if idx + 1 < len(question_ids) else None
        )

    context = {
        "qtaker": qtaker,
        "question": question,
        "chosen_answer": chosen_answer,
        "correct_answer": correct_answer,
        "is_correct": is_correct,
        "score": qtaker.current_score,
        "next_question_id": next_question_id,
        "progress": {
            "current": question_ids.index(question.id) + 1 if question.id in question_ids else 1,
            "total": len(question_ids) or 1,
        },
    }
    return render(request, "quiz/answer.html", context)


def quiz_result_view(request, qtaker_id):
    qtaker = get_object_or_404(Qtaker, id=qtaker_id)
    original_skill = qtaker.skill
    questionnaire = get_object_or_404(Questionnaire, title=original_skill)

    total_questions = (
        len(qtaker.current_question_set)
        if qtaker.current_question_set
        else Question.objects.filter(questionnaire=questionnaire).count()
    )

    percent = (
        (qtaker.current_score * 100 / total_questions)
        if total_questions > 0
        else 0
    )
    qtaker.test_result = percent
    passed = percent > PASS_PERCENTAGE
    next_skill = None
    next_questionnaire_data = None
    first_question_id = None

    if passed:
        next_skill = Qtaker.get_next_skill(original_skill)
        if next_skill:
            try:
                next_questionnaire = Questionnaire.objects.get(title=next_skill)
                all_questions = Question.objects.filter(questionnaire=next_questionnaire)
                if all_questions.exists():
                    question_count = all_questions.count()
                    questions_to_take = min(QUESTIONS_PER_SESSION, question_count)
                    randomized_questions = list(all_questions.order_by("?")[:questions_to_take])
                    randomized_question_ids = [q.id for q in randomized_questions]
                    qtaker.next_question_set = randomized_question_ids
                    qtaker.current_question_set = []
                    first_question = randomized_questions[0] if randomized_questions else None
                    first_question_id = first_question.id if first_question else None
                    next_questionnaire_data = {
                        "id": next_questionnaire.id,
                        "title": next_questionnaire.title,
                        "first_question_id": first_question_id,
                    }
            except Questionnaire.DoesNotExist:
                pass

    if passed and next_skill:
        qtaker.skill = next_skill

    score_for_template = qtaker.current_score
    qtaker.current_score = 0
    qtaker.save(
        update_fields=["test_result", "current_score", "next_question_set", "current_question_set", "skill"]
    )

    context = {
        "qtaker": qtaker,
        "score": score_for_template,
        "total_questions": total_questions,
        "percentage": percent,
        "passed": passed,
        "next_questionnaire": next_questionnaire_data,
    }
    return render(request, "quiz/result.html", context)
