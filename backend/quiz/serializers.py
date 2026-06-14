from rest_framework import serializers
from .models import Qtaker, Options, Question, Questionnaire


class QtakerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Qtaker
        fields = ["id", "name", "age", "email", "skill", "test_result"]
        read_only_fields = ["test_result", "date_taken"]
        extra_kwargs = {"email": {"required": False, "allow_blank": True}}


class QuestionnaireSerializer(serializers.ModelSerializer):
    class Meta:
        model = Questionnaire
        fields = ["id", "title", "description", "created_at", "created_by"]


class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = [
            "id",
            "questionnaire",
            "question",
            "placement",
            "created_at",
            "created_by",
        ]

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation["question"] = instance.question
        return representation


class OptionsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Options
        fields = ["id", "question", "text", "correct"]


class UserformSerializer(serializers.ModelSerializer):
    class Meta:
        model = Qtaker
        fields = ["name", "age", "email", "skill"]


class AnswerFormSerializer(serializers.Serializer):
    answer = serializers.CharField(trim_whitespace=True)

    def validate_answer(self, value):
        if not value:
            raise serializers.ValidationError("Answer cannot be empty.")
        return value
