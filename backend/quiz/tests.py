from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from .models import Questionnaire, Question, Options, Qtaker

User = get_user_model()


class QuizAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser", password="testpass"
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

    def test_create_qtaker(self):
        url = "/questionnaire/api/qtaker/"
        data = {"name": "Test User", "age": 10, "email": "test@example.com", "skill": "beginner"}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("qtaker_id", response.data)

    def test_get_question(self):
        qtaker = Qtaker.objects.create(
            name="Test User", age=10, email="test@example.com", skill="beginner"
        )
        qtaker.current_question_set = [self.question.id]
        qtaker.save()

        url = f"/questionnaire/api/quiz/{qtaker.id}/{self.question.id}/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["question"]["id"], self.question.id)

    def test_submit_answer(self):
        qtaker = Qtaker.objects.create(
            name="Test User", age=10, email="test@example.com", skill="beginner"
        )
        qtaker.current_question_set = [self.question.id]
        qtaker.save()

        url = f"/questionnaire/api/quiz/{qtaker.id}/{self.question.id}/"
        data = {"answer": str(self.correct_option.id)}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_correct"])
