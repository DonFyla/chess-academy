from django import forms
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from .models import User


class CustomUserCreationForm(UserCreationForm):
    ROLE_CHOICES = [
        ("student", "Student"),
        ("coach", "Coach"),
    ]
    role = forms.ChoiceField(
        choices=ROLE_CHOICES,
        initial="student",
        widget=forms.RadioSelect,
        label="I am signing up as a",
    )

    class Meta:
        model = User
        fields = ("email", "username", "full_name", "phone", "role")

    def save(self, commit=True):
        user = super().save(commit=False)
        role = self.cleaned_data.get("role", "student")
        if role == "coach":
            user.is_coach = True
            user.is_student = False
        else:
            user.is_coach = False
            user.is_student = True
        if commit:
            user.save()
        return user


class CustomUserChangeForm(UserChangeForm):
    class Meta:
        model = User
        fields = ("email", "username", "full_name", "phone", "is_coach", "is_student")
