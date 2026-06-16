from datetime import date, time, timedelta
from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import Coach, AvailabilitySlot, CoachBlockedDate, Booking

User = get_user_model()


class CoachDashboardTests(TestCase):
    def setUp(self):
        self.coach_user = User.objects.create_user(
            email="coach@example.com",
            username="coachuser",
            password="testpass123",
            full_name="Coach User",
            is_coach=True,
            is_student=False,
        )
        self.coach = Coach.objects.create(
            user=self.coach_user,
            name="Coach User",
            email="coach@example.com",
            specialization="Advanced Tactics",
        )
        self.student_user = User.objects.create_user(
            email="student@example.com",
            username="studentuser",
            password="testpass123",
        )

    def test_coach_dashboard_requires_login(self):
        response = self.client.get(reverse("scheduling:coach_dashboard"))
        self.assertEqual(response.status_code, 302)

    def test_coach_dashboard_rejects_student(self):
        self.client.force_login(self.student_user)
        response = self.client.get(reverse("scheduling:coach_dashboard"))
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, reverse("accounts:dashboard"))

    def test_coach_dashboard_renders_for_coach(self):
        self.client.force_login(self.coach_user)
        response = self.client.get(reverse("scheduling:coach_dashboard"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "scheduling/coach_dashboard.html")
        self.assertContains(response, "Coach User")
        self.assertContains(response, "Advanced Tactics")

    def test_coach_dashboard_creates_missing_profile(self):
        coach_without_profile = User.objects.create_user(
            email="noprofile@example.com",
            username="noprofile",
            password="testpass123",
            full_name="No Profile Coach",
            is_coach=True,
            is_student=False,
        )
        self.assertFalse(Coach.objects.filter(user=coach_without_profile).exists())
        self.client.force_login(coach_without_profile)
        response = self.client.get(reverse("scheduling:coach_dashboard"))
        self.assertEqual(response.status_code, 200)
        self.assertTrue(Coach.objects.filter(user=coach_without_profile).exists())
        coach = Coach.objects.get(user=coach_without_profile)
        self.assertEqual(coach.name, "No Profile Coach")

    def test_coach_can_update_profile(self):
        self.client.force_login(self.coach_user)
        response = self.client.post(
            reverse("scheduling:coach_dashboard"),
            {
                "action": "update_profile",
                "name": "Updated Coach",
                "bio": "New bio",
                "specialization": "Endgames",
                "email": "updated@example.com",
                "rank_title": "FM",
                "hourly_rate": 15000,
                "meeting_link": "https://meet.example.com",
                "photo_url": "https://example.com/photo.jpg",
            },
        )
        self.assertEqual(response.status_code, 302)
        self.coach.refresh_from_db()
        self.assertEqual(self.coach.name, "Updated Coach")
        self.assertEqual(self.coach.bio, "New bio")
        self.assertEqual(self.coach.hourly_rate, 15000)

    def test_coach_can_upload_profile_photo(self):
        from io import BytesIO
        from django.core.files.uploadedfile import SimpleUploadedFile
        from PIL import Image

        self.client.force_login(self.coach_user)
        image = BytesIO()
        Image.new("RGB", (100, 100), color="red").save(image, format="JPEG")
        image.seek(0)
        response = self.client.post(
            reverse("scheduling:coach_dashboard"),
            {
                "action": "update_profile",
                "name": "Updated Coach",
                "photo": SimpleUploadedFile("photo.jpg", image.read(), content_type="image/jpeg"),
            },
        )
        self.assertEqual(response.status_code, 302)
        self.coach.refresh_from_db()
        self.assertTrue(self.coach.photo)
        self.assertIn("photo", self.coach.photo.name)

    def test_coach_can_add_and_delete_availability(self):
        self.client.force_login(self.coach_user)
        response = self.client.post(
            reverse("scheduling:coach_dashboard"),
            {
                "action": "add_availability",
                "day_of_week": 1,
                "start_time": "10:00",
                "end_time": "12:00",
            },
        )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(AvailabilitySlot.objects.filter(coach=self.coach).count(), 1)

        slot = AvailabilitySlot.objects.first()
        response = self.client.post(
            reverse("scheduling:coach_dashboard"),
            {
                "action": "delete_availability",
                "slot_id": str(slot.id),
            },
        )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(AvailabilitySlot.objects.filter(coach=self.coach).count(), 0)

    def test_coach_can_add_and_delete_blocked_date(self):
        self.client.force_login(self.coach_user)
        response = self.client.post(
            reverse("scheduling:coach_dashboard"),
            {
                "action": "add_blocked_date",
                "blocked_date": "2030-12-25",
                "reason": "Holiday",
            },
        )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(CoachBlockedDate.objects.filter(coach=self.coach).count(), 1)

        block = CoachBlockedDate.objects.first()
        response = self.client.post(
            reverse("scheduling:coach_dashboard"),
            {
                "action": "delete_blocked_date",
                "block_id": str(block.id),
            },
        )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(CoachBlockedDate.objects.filter(coach=self.coach).count(), 0)


class EffectiveAvailabilityTests(TestCase):
    def setUp(self):
        self.coach_user = User.objects.create_user(
            email="availabilitycoach@example.com",
            username="availabilitycoach",
            password="testpass123",
            full_name="Availability Coach",
            is_coach=True,
            is_student=False,
        )
        self.coach = Coach.objects.create(
            user=self.coach_user,
            name="Availability Coach",
            email="availabilitycoach@example.com",
        )

    def test_weekly_slot_without_blocks(self):
        monday = date(2030, 12, 23)  # Monday
        AvailabilitySlot.objects.create(
            coach=self.coach,
            day_of_week=1,
            start_time=time(11, 0),
            end_time=time(12, 0),
        )
        slots = self.coach.get_available_slots_for_date(monday)
        self.assertEqual(slots, [(time(11, 0), time(12, 0))])

    def test_weekly_slot_partially_blocked(self):
        monday = date(2030, 12, 23)  # Monday
        AvailabilitySlot.objects.create(
            coach=self.coach,
            day_of_week=1,
            start_time=time(9, 0),
            end_time=time(17, 0),
        )
        CoachBlockedDate.objects.create(
            coach=self.coach,
            blocked_date=monday,
            start_time=time(8, 0),
            end_time=time(13, 0),
        )
        slots = self.coach.get_available_slots_for_date(monday)
        self.assertEqual(slots, [(time(13, 0), time(17, 0))])

    def test_weekly_slot_fully_blocked_by_time_range(self):
        monday = date(2030, 12, 23)  # Monday
        AvailabilitySlot.objects.create(
            coach=self.coach,
            day_of_week=1,
            start_time=time(11, 0),
            end_time=time(12, 0),
        )
        CoachBlockedDate.objects.create(
            coach=self.coach,
            blocked_date=monday,
            start_time=time(10, 0),
            end_time=time(13, 0),
        )
        slots = self.coach.get_available_slots_for_date(monday)
        self.assertEqual(slots, [])

    def test_weekly_slot_blocked_by_full_day(self):
        monday = date(2030, 12, 23)  # Monday
        AvailabilitySlot.objects.create(
            coach=self.coach,
            day_of_week=1,
            start_time=time(11, 0),
            end_time=time(12, 0),
        )
        CoachBlockedDate.objects.create(
            coach=self.coach,
            blocked_date=monday,
        )
        slots = self.coach.get_available_slots_for_date(monday)
        self.assertEqual(slots, [])

    def test_block_splits_slot_into_two(self):
        monday = date(2030, 12, 23)  # Monday
        AvailabilitySlot.objects.create(
            coach=self.coach,
            day_of_week=1,
            start_time=time(9, 0),
            end_time=time(17, 0),
        )
        CoachBlockedDate.objects.create(
            coach=self.coach,
            blocked_date=monday,
            start_time=time(11, 0),
            end_time=time(12, 0),
        )
        slots = self.coach.get_available_slots_for_date(monday)
        self.assertEqual(slots, [
            (time(9, 0), time(11, 0)),
            (time(12, 0), time(17, 0)),
        ])

    def test_unrelated_blocked_date_ignored(self):
        monday = date(2030, 12, 23)  # Monday
        tuesday = date(2030, 12, 24)  # Tuesday
        AvailabilitySlot.objects.create(
            coach=self.coach,
            day_of_week=1,
            start_time=time(11, 0),
            end_time=time(12, 0),
        )
        CoachBlockedDate.objects.create(
            coach=self.coach,
            blocked_date=tuesday,
            start_time=time(8, 0),
            end_time=time(13, 0),
        )
        slots = self.coach.get_available_slots_for_date(monday)
        self.assertEqual(slots, [(time(11, 0), time(12, 0))])


class BookingFlowTests(TestCase):
    def setUp(self):
        self.coach_user = User.objects.create_user(
            email="bookingcoach@example.com",
            username="bookingcoach",
            password="testpass123",
            full_name="Booking Coach",
            is_coach=True,
            is_student=False,
        )
        self.coach = Coach.objects.create(
            user=self.coach_user,
            name="Booking Coach",
            email="bookingcoach@example.com",
            hourly_rate=10000,
        )
        self.student_user = User.objects.create_user(
            email="bookingstudent@example.com",
            username="bookingstudent",
            password="testpass123",
            full_name="Booking Student",
            phone="+2348012345678",
        )
        AvailabilitySlot.objects.create(
            coach=self.coach,
            day_of_week=1,  # Monday
            start_time=time(11, 0),
            end_time=time(12, 0),
        )
        AvailabilitySlot.objects.create(
            coach=self.coach,
            day_of_week=3,  # Wednesday
            start_time=time(14, 0),
            end_time=time(15, 0),
        )

    def test_booking_page_requires_login(self):
        response = self.client.get(reverse("scheduling:book_coach", args=[self.coach.id]))
        self.assertEqual(response.status_code, 302)

    def test_booking_page_renders(self):
        self.client.force_login(self.student_user)
        response = self.client.get(reverse("scheduling:book_coach", args=[self.coach.id]))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "scheduling/book_coach.html")
        self.assertContains(response, self.coach.name)

    def test_student_can_submit_single_weekly_booking(self):
        self.client.force_login(self.student_user)
        response = self.client.post(
            reverse("scheduling:book_coach", args=[self.coach.id]),
            {
                "booking_mode": "single",
                "day_of_week_1": "1",
                "time_slot_1": "11:00|12:00",
                "student_name": "Booking Student",
                "student_email": "bookingstudent@example.com",
                "student_phone": "+2348012345678",
                "course_type": "beginner",
                "notes": "Looking forward to it",
            },
        )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(Booking.objects.count(), 1)
        booking = Booking.objects.first()
        self.assertEqual(booking.coach, self.coach)
        self.assertEqual(booking.student_name, "Booking Student")
        self.assertEqual(booking.booking_mode, "single")
        self.assertEqual(booking.sessions_per_month, 4)
        self.assertEqual(booking.monthly_amount, 40000)
        self.assertEqual(booking.recurring_days, [1])
        self.assertEqual(len(booking.recurring_dates), 4)

    def test_student_can_submit_double_weekly_booking(self):
        self.client.force_login(self.student_user)
        response = self.client.post(
            reverse("scheduling:book_coach", args=[self.coach.id]),
            {
                "booking_mode": "double",
                "day_of_week_1": "1",
                "time_slot_1": "11:00|12:00",
                "day_of_week_2": "3",
                "time_slot_2": "14:00|15:00",
                "student_name": "Booking Student",
                "student_email": "bookingstudent@example.com",
                "student_phone": "+2348012345678",
                "course_type": "beginner",
                "notes": "",
            },
        )
        self.assertEqual(response.status_code, 302)
        booking = Booking.objects.first()
        self.assertEqual(booking.booking_mode, "double")
        self.assertEqual(booking.sessions_per_month, 8)
        self.assertEqual(booking.monthly_amount, 76000)  # 5% discount
        self.assertEqual(sorted(booking.recurring_days), [1, 3])
        self.assertEqual(len(booking.recurring_dates), 8)

    def test_booking_rejects_same_day_for_double(self):
        self.client.force_login(self.student_user)
        response = self.client.post(
            reverse("scheduling:book_coach", args=[self.coach.id]),
            {
                "booking_mode": "double",
                "day_of_week_1": "1",
                "time_slot_1": "11:00|12:00",
                "day_of_week_2": "1",
                "time_slot_2": "14:00|15:00",
                "student_name": "Booking Student",
                "student_email": "bookingstudent@example.com",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Booking.objects.count(), 0)

    def test_booking_confirmation_page(self):
        self.client.force_login(self.student_user)
        booking = Booking.objects.create(
            coach=self.coach,
            student_name="Booking Student",
            student_email="bookingstudent@example.com",
            booking_date=date(2030, 12, 25),
            start_time=time(11, 0),
            end_time=time(12, 0),
            recurring_days=[1],
            recurring_dates=[{"date": "2030-12-25", "start_time": "11:00", "end_time": "12:00"}],
            sessions_per_month=4,
            monthly_amount=40000,
        )
        response = self.client.get(reverse("scheduling:booking_confirmation", args=[booking.id]))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "scheduling/booking_confirmation.html")
        self.assertContains(response, self.coach.name)


class CoachBookingManagementTests(TestCase):
    def setUp(self):
        self.coach_user = User.objects.create_user(
            email="managecoach@example.com",
            username="managecoach",
            password="testpass123",
            full_name="Manage Coach",
            is_coach=True,
            is_student=False,
        )
        self.coach = Coach.objects.create(
            user=self.coach_user,
            name="Manage Coach",
            email="managecoach@example.com",
        )
        self.booking = Booking.objects.create(
            coach=self.coach,
            student_name="Student",
            student_email="student@example.com",
            booking_date=date(2030, 12, 25),
            start_time=time(11, 0),
            end_time=time(12, 0),
            status="pending",
        )

    def test_coach_can_confirm_booking(self):
        self.client.force_login(self.coach_user)
        response = self.client.post(
            reverse("scheduling:coach_dashboard"),
            {"action": "confirm_booking", "booking_id": str(self.booking.id)},
        )
        self.assertEqual(response.status_code, 302)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "confirmed")

    def test_coach_can_reject_booking(self):
        self.client.force_login(self.coach_user)
        response = self.client.post(
            reverse("scheduling:coach_dashboard"),
            {"action": "reject_booking", "booking_id": str(self.booking.id)},
        )
        self.assertEqual(response.status_code, 302)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "rejected")

    def test_other_coach_cannot_confirm_booking(self):
        other_user = User.objects.create_user(
            email="othercoach@example.com",
            username="othercoach",
            password="testpass123",
            full_name="Other Coach",
            is_coach=True,
            is_student=False,
        )
        Coach.objects.create(user=other_user, name="Other Coach", email="othercoach@example.com")
        self.client.force_login(other_user)
        response = self.client.post(
            reverse("scheduling:coach_dashboard"),
            {"action": "confirm_booking", "booking_id": str(self.booking.id)},
        )
        self.assertEqual(response.status_code, 302)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "pending")
