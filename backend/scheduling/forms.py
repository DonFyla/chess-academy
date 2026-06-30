import json
from django import forms
from .models import Booking, Coach, AvailabilitySlot, CoachBlockedDate, SpecialBooking


class CoachProfileForm(forms.ModelForm):
    achievements_text = forms.CharField(
        required=False,
        widget=forms.Textarea(attrs={"rows": 3}),
        label="Achievements",
        help_text="Enter achievements separated by commas or new lines.",
    )

    class Meta:
        model = Coach
        fields = [
            "name",
            "email",
            "bio",
            "specialization",
            "rank_title",
            "hourly_rate",
            "meeting_link",
            "photo",
            "photo_url",
            "is_special",
            "points_cost",
            "special_bio",
        ]
        widgets = {
            "bio": forms.Textarea(attrs={"rows": 4}),
            "special_bio": forms.Textarea(attrs={"rows": 3}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.pk:
            achievements = self.instance.achievements or []
            if isinstance(achievements, list):
                self.fields["achievements_text"].initial = "\n".join(achievements)
            else:
                self.fields["achievements_text"].initial = str(achievements)

    def clean_achievements_text(self):
        text = self.cleaned_data.get("achievements_text", "")
        if not text:
            return []
        items = [line.strip() for line in text.replace(",", "\n").split("\n")]
        return [item for item in items if item]

    def save(self, commit=True):
        instance = super().save(commit=False)
        instance.achievements = self.cleaned_data.get("achievements_text", [])
        if commit:
            instance.save()
        return instance


class AvailabilitySlotForm(forms.ModelForm):
    class Meta:
        model = AvailabilitySlot
        fields = ["day_of_week", "start_time", "end_time"]
        widgets = {
            "start_time": forms.TimeInput(attrs={"type": "time"}),
            "end_time": forms.TimeInput(attrs={"type": "time"}),
        }


class CoachBlockedDateForm(forms.ModelForm):
    is_full_day = forms.BooleanField(required=False, initial=True, label="Block entire day")

    class Meta:
        model = CoachBlockedDate
        fields = ["blocked_date", "start_time", "end_time", "reason"]
        widgets = {
            "blocked_date": forms.DateInput(attrs={"type": "date"}),
            "start_time": forms.TimeInput(attrs={"type": "time"}),
            "end_time": forms.TimeInput(attrs={"type": "time"}),
        }

    def clean(self):
        cleaned = super().clean()
        if cleaned.get("is_full_day"):
            cleaned["start_time"] = None
            cleaned["end_time"] = None
        return cleaned


class BookingForm(forms.ModelForm):
    BOOKING_MODE_CHOICES = [
        ("single", "Once a Week (4 sessions/month)"),
        ("double", "Twice a Week (8 sessions/month)"),
    ]

    DAY_CHOICES = [
        (0, "Sunday"),
        (1, "Monday"),
        (2, "Tuesday"),
        (3, "Wednesday"),
        (4, "Thursday"),
        (5, "Friday"),
        (6, "Saturday"),
    ]

    booking_mode = forms.ChoiceField(
        choices=BOOKING_MODE_CHOICES,
        widget=forms.RadioSelect,
        initial="single",
    )
    day_of_week_1 = forms.ChoiceField(choices=DAY_CHOICES, required=True, label="First weekly day")
    time_slot_1 = forms.CharField(widget=forms.HiddenInput(), required=True)
    day_of_week_2 = forms.ChoiceField(choices=DAY_CHOICES, required=False, label="Second weekly day")
    time_slot_2 = forms.CharField(widget=forms.HiddenInput(), required=False)

    class Meta:
        model = Booking
        fields = [
            "student_name",
            "student_email",
            "student_phone",
            "course_type",
            "notes",
        ]
        widgets = {
            "notes": forms.Textarea(attrs={"rows": 3}),
        }

    def clean(self):
        cleaned = super().clean()
        mode = cleaned.get("booking_mode", "single")

        day_1 = cleaned.get("day_of_week_1")
        slot_1 = cleaned.get("time_slot_1")
        if day_1 is None or not slot_1:
            raise forms.ValidationError("Please select a day and time for your first weekly session.")

        try:
            start_1, end_1 = slot_1.split("|")
            cleaned["start_time_1"] = forms.TimeField().clean(start_1)
            cleaned["end_time_1"] = forms.TimeField().clean(end_1)
        except ValueError:
            raise forms.ValidationError("Invalid time slot selected for the first session.")

        if mode == "double":
            day_2 = cleaned.get("day_of_week_2")
            slot_2 = cleaned.get("time_slot_2")
            if day_2 is None or not slot_2:
                raise forms.ValidationError("Please select a day and time for your second weekly session.")
            if int(day_1) == int(day_2):
                raise forms.ValidationError("Please choose two different days for twice-a-week booking.")
            try:
                start_2, end_2 = slot_2.split("|")
                cleaned["start_time_2"] = forms.TimeField().clean(start_2)
                cleaned["end_time_2"] = forms.TimeField().clean(end_2)
            except ValueError:
                raise forms.ValidationError("Invalid time slot selected for the second session.")

        return cleaned

    def save(self, coach, commit=True):
        from datetime import date as dt_date, timedelta
        from django.utils import timezone

        instance = super().save(commit=False)
        cleaned = self.cleaned_data
        mode = cleaned["booking_mode"]

        day_1 = int(cleaned["day_of_week_1"])
        start_1 = cleaned["start_time_1"]
        end_1 = cleaned["end_time_1"]

        recurring_days = [day_1]
        if mode == "double":
            day_2 = int(cleaned["day_of_week_2"])
            start_2 = cleaned["start_time_2"]
            end_2 = cleaned["end_time_2"]
            recurring_days.append(day_2)

        # Generate 4 weeks of recurring dates starting from the next occurrence of each day
        today = timezone.now().date()

        def generate_dates(day_index, start_t, end_t):
            dates = []
            # Find first upcoming occurrence of this weekday
            days_ahead = day_index - (today.weekday() + 1) % 7
            if days_ahead <= 0:
                days_ahead += 7
            first_date = today + timedelta(days=days_ahead)
            for week in range(4):
                session_date = first_date + timedelta(weeks=week)
                dates.append({
                    "date": session_date.isoformat(),
                    "start_time": start_t.strftime("%H:%M"),
                    "end_time": end_t.strftime("%H:%M"),
                })
            return dates

        recurring_dates = generate_dates(day_1, start_1, end_1)
        if mode == "double":
            recurring_dates.extend(generate_dates(day_2, start_2, end_2))

        recurring_dates.sort(key=lambda x: x["date"])

        price_per_session = coach.hourly_rate or 10000
        sessions_count = 8 if mode == "double" else 4
        total = price_per_session * sessions_count
        if mode == "double":
            total = int(total * 0.95)

        instance.coach = coach
        instance.booking_mode = mode
        instance.recurring_days = recurring_days
        instance.recurring_dates = recurring_dates
        instance.sessions_per_month = sessions_count
        instance.monthly_amount = total
        instance.booking_date = dt_date.fromisoformat(recurring_dates[0]["date"])
        instance.start_time = start_1
        instance.end_time = end_1
        instance.status = "pending"
        instance.payment_status = "pending"

        if commit:
            instance.save()
        return instance


class PointsBookingForm(forms.Form):
    selected_slots = forms.CharField(widget=forms.HiddenInput())
    student_name = forms.CharField(max_length=255)
    student_email = forms.EmailField()
    student_phone = forms.CharField(max_length=20, required=False)
    student_notes = forms.CharField(widget=forms.Textarea(attrs={"rows": 3}), required=False)

    def clean_selected_slots(self):
        raw = self.cleaned_data.get("selected_slots", "")
        if not raw:
            raise forms.ValidationError("Please select at least one time slot.")
        try:
            slots = json.loads(raw)
        except json.JSONDecodeError:
            raise forms.ValidationError("Invalid slot data.")
        if not isinstance(slots, list) or len(slots) == 0:
            raise forms.ValidationError("Please select at least one time slot.")
        return slots


class SpecialBookingForm(forms.Form):
    selected_slots = forms.CharField(widget=forms.HiddenInput())
    student_name = forms.CharField(max_length=255)
    student_email = forms.EmailField()
    student_phone = forms.CharField(max_length=20, required=False)
    admin_notes = forms.CharField(widget=forms.Textarea(attrs={"rows": 3}), required=False)

    def clean_selected_slots(self):
        raw = self.cleaned_data.get("selected_slots", "")
        if not raw:
            raise forms.ValidationError("Please select at least one session.")
        try:
            slots = json.loads(raw)
        except json.JSONDecodeError:
            raise forms.ValidationError("Invalid session data.")
        if not isinstance(slots, list) or len(slots) == 0:
            raise forms.ValidationError("Please select at least one session.")
        return slots
