from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from .models import Questionnaire, Question, Options, Qtaker

User = get_user_model()


class QuizTemplateTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser", password="testpass", email="test@example.com"
        )
        self.questionnaire = Questionnaire.objects.create(
            title="beginner",
            description="Beginner level quiz",
            created_by=self.user,
        )
        self.question = Question.objects.create(
            questionnaire=self.questionnaire,
            question="What is the most powerful piece in chess?",
            question_type="radio",
            placement=1,
            created_by=self.user,
        )
        self.correct_option = Options.objects.create(
            question=self.question, text="Queen", correct=True
        )
        self.wrong_option = Options.objects.create(
            question=self.question, text="Pawn", correct=False
        )

    def test_register_page_renders(self):
        response = self.client.get(reverse("quiz:register"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "quiz/register.html")

    def test_create_qtaker_redirects_to_first_question(self):
        data = {"name": "Test User", "age": 10, "email": "test@example.com", "skill": "beginner"}
        response = self.client.post(reverse("quiz:register"), data)
        self.assertEqual(response.status_code, 302)
        qtaker = Qtaker.objects.get(email="test@example.com")
        self.assertEqual(qtaker.current_question_set[0], self.question.id)

    def test_question_page_renders(self):
        qtaker = Qtaker.objects.create(
            name="Test User", age=10, email="test@example.com", skill="beginner"
        )
        qtaker.current_question_set = [self.question.id]
        qtaker.save()

        response = self.client.get(
            reverse("quiz:question", args=[qtaker.id, self.question.id])
        )
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "quiz/question.html")
        self.assertContains(response, "Queen")

    def test_submit_correct_answer(self):
        qtaker = Qtaker.objects.create(
            name="Test User", age=10, email="test@example.com", skill="beginner"
        )
        qtaker.current_question_set = [self.question.id]
        qtaker.save()

        response = self.client.post(
            reverse("quiz:question", args=[qtaker.id, self.question.id]),
            {"answer": str(self.correct_option.id)},
        )
        self.assertEqual(response.status_code, 302)
        qtaker.refresh_from_db()
        self.assertEqual(qtaker.last_answer_id, self.correct_option.id)

    def test_answer_page_renders_and_scores(self):
        qtaker = Qtaker.objects.create(
            name="Test User", age=10, email="test@example.com", skill="beginner"
        )
        qtaker.current_question_set = [self.question.id]
        qtaker.last_question_id = self.question.id
        qtaker.last_answer_id = self.correct_option.id
        qtaker.save()

        response = self.client.get(
            reverse("quiz:answer", args=[qtaker.id, self.correct_option.id])
        )
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "quiz/answer.html")
        qtaker.refresh_from_db()
        self.assertEqual(qtaker.current_score, 1)

    def test_result_page_renders(self):
        qtaker = Qtaker.objects.create(
            name="Test User", age=10, email="test@example.com", skill="beginner"
        )
        qtaker.current_question_set = [self.question.id]
        qtaker.current_score = 1
        qtaker.save()

        response = self.client.get(reverse("quiz:result", args=[qtaker.id]))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "quiz/result.html")
        qtaker.refresh_from_db()
        self.assertEqual(qtaker.test_result, 100.0)
