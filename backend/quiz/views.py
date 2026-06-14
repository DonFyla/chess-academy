from django.shortcuts import render, get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Questionnaire, Question, Qtaker, Options
from .serializers import AnswerFormSerializer, QtakerSerializer
from .utils import get_next_question


@api_view(["GET", "POST"])
def QtakerView(request):
    if request.method == "POST":
        serializer = QtakerSerializer(data=request.data)
        if serializer.is_valid():
            qtaker = serializer.save()
            skill = qtaker.skill

            try:
                questionnaire = Questionnaire.objects.get(title=skill)
                all_questions = Question.objects.filter(questionnaire=questionnaire)

                QUESTIONS_PER_SESSION = 5

                if all_questions.exists():
                    question_count = all_questions.count()
                    questions_to_take = min(QUESTIONS_PER_SESSION, question_count)

                    randomized_questions = all_questions.order_by("?")[:questions_to_take]
                    randomized_question_ids = list(
                        randomized_questions.values_list("id", flat=True)
                    )

                    qtaker.current_question_set = randomized_question_ids
                    qtaker.save()

                    first_question_id = (
                        randomized_question_ids[0] if randomized_question_ids else None
                    )
                    first_question = (
                        Question.objects.get(id=first_question_id)
                        if first_question_id
                        else None
                    )

                    response_data = {
                        "qtaker_id": qtaker.id,
                        "message": "User created successfully",
                        "skill": skill,
                        "total_questions_in_session": len(randomized_question_ids),
                    }

                    if first_question:
                        response_data["question_id"] = first_question.id

                    return Response(response_data, status=status.HTTP_201_CREATED)
                else:
                    return Response(
                        {"error": f"No questions found for skill level: {skill}"},
                        status=status.HTTP_404_NOT_FOUND,
                    )

            except Questionnaire.DoesNotExist:
                return Response(
                    {"error": f"No questionnaire found for skill level: {skill}"},
                    status=status.HTTP_404_NOT_FOUND,
                )
        else:
            return Response(
                {"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
            )
    else:
        serializer = QtakerSerializer()
        skills = [choice[0] for choice in Qtaker.chess_level]
        return Response(
            {
                "form": serializer.data,
                "available_skills": skills,
                "message": "GET request successful",
            }
        )


@api_view(["GET", "POST"])
def quiz(request, Qtakerid, question_id):
    qtaker = get_object_or_404(Qtaker, id=Qtakerid)
    skill = qtaker.skill

    try:
        questionnaire = Questionnaire.objects.get(title=skill)
    except Questionnaire.DoesNotExist:
        return Response(
            {"error": f"No questionnaire for skill {skill}"},
            status=status.HTTP_404_NOT_FOUND,
        )

    if getattr(qtaker, "next_question_set", None):
        qtaker.current_question_set = qtaker.next_question_set
        qtaker.next_question_set = []
        qtaker.save()
        question_ids = qtaker.current_question_set
        current_question = Question.objects.get(id=question_ids[0])

    elif getattr(qtaker, "current_question_set", None):
        question_ids = qtaker.current_question_set
        if question_id:
            try:
                current_question = Question.objects.get(id=question_id)
                if current_question.id not in question_ids:
                    return Response(
                        {
                            "error": f"Question {question_id} not found in current session"
                        },
                        status=status.HTTP_404_NOT_FOUND,
                    )
            except (Question.DoesNotExist, ValueError):
                return Response(
                    {"error": f"Question {question_id} not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )
        else:
            current_question = Question.objects.get(id=question_ids[0])
    else:
        all_questions = Question.objects.filter(questionnaire=questionnaire)
        QUESTIONS_PER_SESSION = 5
        if all_questions.exists():
            question_count = all_questions.count()
            questions_to_take = min(QUESTIONS_PER_SESSION, question_count)
            randomized_questions = all_questions.order_by("?")[:questions_to_take]
            randomized_question_ids = list(
                randomized_questions.values_list("id", flat=True)
            )
            qtaker.current_question_set = randomized_question_ids
            qtaker.save()
            current_question = randomized_questions.first()
        else:
            return Response(
                {"error": f"No questions for skill {skill}"},
                status=status.HTTP_404_NOT_FOUND,
            )
    question = current_question

    question_ids = qtaker.current_question_set
    current_index = question_ids.index(current_question.id)
    next_question_id = (
        question_ids[current_index + 1]
        if current_index + 1 < len(question_ids)
        else None
    )

    if request.method == "POST":
        serializer = AnswerFormSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        answer_str = serializer.validated_data["answer"]

        stored_answer_id = 0
        stored_text_answer = ""
        is_correct = False
        correct_opt = None

        if question.question_type == "radio":
            chosen_opt = get_object_or_404(
                Options, pk=answer_str, question=question
            )
            is_correct = chosen_opt.correct
            stored_answer_id = chosen_opt.id
            correct_opt = Options.objects.get(question=question, correct=True)
        elif question.question_type == "text":
            correct_opt = get_object_or_404(
                Options, question=question, correct=True
            )
            is_correct = (
                answer_str.strip().lower() == correct_opt.text.strip().lower()
            )
            stored_answer_id = 0
            stored_text_answer = answer_str.strip()
        else:
            return Response({"error": "Unknown question type"}, status=400)

        qtaker.last_answer_id = stored_answer_id
        qtaker.last_question_id = question.id
        qtaker.last_text_answer = stored_text_answer
        qtaker.save()

        base = {
            "is_correct": is_correct,
            "message": "Answer recorded",
            "next_question_id": next_question_id or 0,
            "current_score": qtaker.current_score,
            "last_answer_id": stored_answer_id,
        }
        if question.question_type == "radio":
            base.update(
                {
                    "chosen_answer": {
                        "id": chosen_opt.id,
                        "text": chosen_opt.text,
                        "correct": chosen_opt.correct,
                    },
                    "correct_answer": {
                        "id": correct_opt.id,
                        "text": correct_opt.text,
                        "correct": correct_opt.correct,
                    },
                }
            )
        else:
            base.update(
                {
                    "chosen_answer": answer_str.strip(),
                    "correct_answer": correct_opt.text.strip(),
                }
            )
        return Response(base, status=200)

    question_data = {
        "id": current_question.id,
        "text": current_question.question,
        "placement": current_question.placement,
        "question_type": current_question.question_type,
    }
    if current_question.question_type == "radio":
        question_data["options"] = list(
            Options.objects.filter(question=current_question).values(
                "id", "text", "correct"
            )
        )

    return Response(
        {
            "qtaker": {
                "id": qtaker.id,
                "name": qtaker.name,
                "skill": qtaker.skill,
                "age": qtaker.age,
                "current_score": qtaker.current_score,
                "last_answer_id": getattr(qtaker, "last_answer_id", 0),
            },
            "question": question_data,
            "questionnaire": {
                "id": questionnaire.id,
                "title": questionnaire.title,
            },
            "next_question": {"id": next_question_id} if next_question_id else None,
        }
    )


@api_view(["GET"])
def view_answer(request, Qtakerid, id):
    qtaker = get_object_or_404(Qtaker, id=Qtakerid)
    id_int = int(id)

    if id_int == 0:
        if not getattr(qtaker, "last_question_id", None):
            return Response({"error": "No question ID stored"}, 400)
        question = get_object_or_404(Question, id=qtaker.last_question_id)

        correct_opt = Options.objects.filter(question=question, correct=True).first()
        if not correct_opt:
            return Response(
                {"error": f"No correct answer for question {question.id}"}, 400
            )

        user_answer_text = qtaker.last_text_answer
        is_correct = (
            user_answer_text.strip().lower() == correct_opt.text.strip().lower()
        )
        answer = user_answer_text
        answer_data = {
            "id": 0,
            "text": user_answer_text,
            "correct": is_correct,
        }

    else:
        answer = get_object_or_404(Options, pk=id_int)
        question = answer.question
        is_correct = answer.correct
        answer_data = {
            "id": answer.id,
            "text": answer.text,
            "correct": answer.correct,
        }

    if is_correct:
        qtaker.current_score += 1
        qtaker.save()

    if getattr(qtaker, "current_question_set", None):
        q_ids = qtaker.current_question_set
        try:
            idx = q_ids.index(question.id)
            next_qid = q_ids[idx + 1] if idx + 1 < len(q_ids) else None
            next_q = Question.objects.get(id=next_qid) if next_qid else None
        except (ValueError, Question.DoesNotExist):
            next_q = None
    else:
        next_q = None

    correct_answer = Options.objects.filter(question=question, correct=True).first()

    return Response(
        {
            "qtaker": {
                "id": qtaker.id,
                "name": qtaker.name,
                "skill": qtaker.skill,
            },
            "answer": answer_data,
            "correct_answer": {
                "id": correct_answer.id if correct_answer else None,
                "text": correct_answer.text if correct_answer else None,
            },
            "question": {
                "id": question.id,
                "text": question.question,
            },
            "next_question": {
                "id": next_q.id if next_q else None,
                "text": next_q.question if next_q else None,
            },
            "score": qtaker.current_score,
            "is_correct": is_correct,
        }
    )


@api_view(["GET"])
def result(request, Qtakerid):
    qtaker = get_object_or_404(Qtaker, id=Qtakerid)
    original_skill = qtaker.skill

    try:
        questionnaire = Questionnaire.objects.get(title=original_skill)

        if getattr(qtaker, "current_question_set", None):
            total_questions_in_session = len(qtaker.current_question_set)
        else:
            total_questions_in_session = Question.objects.filter(
                questionnaire=questionnaire
            ).count()

        percent = (
            (qtaker.current_score * 100 / total_questions_in_session)
            if total_questions_in_session > 0
            else 0
        )
        qtaker.test_result = percent

        passed = percent > 60
        next_skill = None
        next_questionnaire_data = None
        first_question_id = None

        if passed:
            next_skill = Qtaker.get_next_skill(original_skill)

            if next_skill:
                try:
                    next_questionnaire = Questionnaire.objects.get(title=next_skill)
                    all_questions = Question.objects.filter(
                        questionnaire=next_questionnaire
                    )

                    if all_questions.exists():
                        QUESTIONS_PER_SESSION = 5
                        question_count = all_questions.count()
                        questions_to_take = min(QUESTIONS_PER_SESSION, question_count)

                        randomized_questions = all_questions.order_by("?")[
                            :questions_to_take
                        ]
                        randomized_question_ids = list(
                            randomized_questions.values_list("id", flat=True)
                        )

                        qtaker.next_question_set = randomized_question_ids
                        first_question = randomized_questions.first()
                        first_question_id = first_question.id if first_question else None

                        next_questionnaire_data = {
                            "id": next_questionnaire.id,
                            "title": next_questionnaire.title,
                            "first_question_id": first_question_id,
                        }
                except Questionnaire.DoesNotExist:
                    next_questionnaire_data = None

        response_data = {
            "current_skill": original_skill,
            "current_questionnaire": {
                "id": questionnaire.id,
                "title": questionnaire.title,
            },
            "qtaker": QtakerSerializer(qtaker).data,
            "score": qtaker.current_score,
            "total_questions": total_questions_in_session,
            "percentage": percent,
            "passed": passed,
            "next_skill": next_skill,
            "next_questionnaire": next_questionnaire_data,
        }

        if passed and next_skill:
            qtaker.skill = next_skill

        qtaker.current_score = 0
        qtaker.save()

        return Response(response_data)

    except Questionnaire.DoesNotExist:
        return Response(
            {"error": f"No questionnaire found for skill level: {original_skill}"},
            status=status.HTTP_404_NOT_FOUND,
        )
