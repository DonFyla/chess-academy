import json
from datetime import date, time, timedelta
from unittest.mock import patch
from django.core import mail
from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import Coach, AvailabilitySlot, CoachBlockedDate, Booking, FlexibleBooking

User = get_user_model()


def _mock_initialize_success(*args, **kwargs):
    return {
        "success": True,
        "authorization_url": "https://checkout.paystack.com/test-booking-url",
        "reference": kwargs.get("reference", "BK-TEST"),
        "message": "Transaction initialized",
    }


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

    def test_coach_dashboard_shows_flexible_bookings(self):
        FlexibleBooking.objects.create(
            user=self.student_user,
            coach=self.coach,
            session_date=date(2030, 12, 25),
            start_time=time(11, 0),
            end_time=time(12, 0),
            day_of_week=3,
            points_used=2,
            status="confirmed",
            student_notes="Focus on openings",
        )
        self.client.force_login(self.coach_user)
        response = self.client.get(reverse("scheduling:coach_dashboard"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Points Bookings")
        self.assertContains(response, "Focus on openings")
        self.assertContains(response, "2 points")


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

    @patch("scheduling.views.initialize_transaction", side_effect=_mock_initialize_success)
    def test_student_can_submit_single_weekly_booking(self, mock_init):
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
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "scheduling/booking_payment.html")
        self.assertContains(response, "https://checkout.paystack.com/test-booking-url")
        self.assertEqual(Booking.objects.count(), 1)
        booking = Booking.objects.first()
        self.assertEqual(booking.coach, self.coach)
        self.assertEqual(booking.student_name, "Booking Student")
        self.assertEqual(booking.booking_mode, "single")
        self.assertEqual(booking.sessions_per_month, 4)
        self.assertEqual(booking.monthly_amount, 40000)
        self.assertEqual(booking.recurring_days, [1])
        self.assertEqual(len(booking.recurring_dates), 4)
        self.assertEqual(booking.payment_status, "pending")
        self.assertTrue(booking.payment_reference.startswith("BK-"))

    @patch("scheduling.views.initialize_transaction", side_effect=_mock_initialize_success)
    def test_student_can_submit_double_weekly_booking(self, mock_init):
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
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "scheduling/booking_payment.html")
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

    def test_recurring_slot_shows_as_booked_after_booking(self):
        from datetime import timedelta as _td

        today = date.today()
        days_ahead = 0 - today.weekday()  # next Monday
        if days_ahead <= 0:
            days_ahead += 7
        next_monday = today + _td(days=days_ahead)

        Booking.objects.create(
            coach=self.coach,
            student_name="First Student",
            student_email="first@example.com",
            booking_date=next_monday,
            start_time=time(11, 0),
            end_time=time(12, 0),
            recurring_days=[1],
            recurring_dates=[{"date": next_monday.isoformat(), "start_time": "11:00", "end_time": "12:00"}],
            sessions_per_month=4,
            monthly_amount=40000,
            status="pending",
        )

        self.client.force_login(self.student_user)
        response = self.client.get(reverse("scheduling:book_coach", args=[self.coach.id]))
        self.assertEqual(response.status_code, 200)

        booked = json.loads(response.context["booked_slots_recurring_json"])
        self.assertIn("1", booked)
        self.assertEqual(len(booked["1"]), 1)
        self.assertEqual(booked["1"][0]["start"], "11:00")
        self.assertEqual(booked["1"][0]["end"], "12:00")

    def test_double_recurring_slots_block_correct_days(self):
        from datetime import timedelta as _td

        today = date.today()
        monday_offset = 0 - today.weekday()
        if monday_offset <= 0:
            monday_offset += 7
        next_monday = today + _td(days=monday_offset)
        next_wednesday = next_monday + _td(days=2)

        Booking.objects.create(
            coach=self.coach,
            student_name="First Student",
            student_email="first@example.com",
            booking_date=next_monday,
            start_time=time(11, 0),
            end_time=time(12, 0),
            recurring_days=[1, 3],
            recurring_dates=[
                {"date": next_monday.isoformat(), "start_time": "11:00", "end_time": "12:00"},
                {"date": next_wednesday.isoformat(), "start_time": "14:00", "end_time": "15:00"},
            ],
            sessions_per_month=8,
            monthly_amount=76000,
            status="pending",
        )

        self.client.force_login(self.student_user)
        response = self.client.get(reverse("scheduling:book_coach", args=[self.coach.id]))
        booked = json.loads(response.context["booked_slots_recurring_json"])

        self.assertIn("1", booked)
        self.assertEqual(booked["1"], [{"start": "11:00", "end": "12:00"}])
        self.assertIn("3", booked)
        self.assertEqual(booked["3"], [{"start": "14:00", "end": "15:00"}])

    def test_points_calendar_hides_recurring_booked_slots(self):
        from datetime import timedelta as _td

        today = date.today()
        monday_offset = 0 - today.weekday()
        if monday_offset <= 0:
            monday_offset += 7
        next_monday = today + _td(days=monday_offset)

        # The coach only has one slot on Monday, and it's booked by a recurring booking
        Booking.objects.create(
            coach=self.coach,
            student_name="First Student",
            student_email="first@example.com",
            booking_date=next_monday,
            start_time=time(11, 0),
            end_time=time(12, 0),
            recurring_days=[1],
            recurring_dates=[{"date": next_monday.isoformat(), "start_time": "11:00", "end_time": "12:00"}],
            sessions_per_month=4,
            monthly_amount=40000,
            status="pending",
        )

        self.client.force_login(self.student_user)
        response = self.client.get(reverse("scheduling:book_coach", args=[self.coach.id]))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Fully Booked")

    @patch("scheduling.views.initialize_transaction", side_effect=_mock_initialize_success)
    def test_recurring_booking_sends_creation_emails(self, mock_init):
        self.client.force_login(self.student_user)
        self.coach.email = "coach@example.com"
        self.coach.save()
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
                "notes": "",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 2)
        subjects = [m.subject for m in mail.outbox]
        self.assertIn("Your Booking is Reserved! Complete Payment to Confirm", subjects)
        self.assertIn("New Booking - Booking Student (Pending Payment)", subjects)


class BookingPaymentTests(TestCase):
    def setUp(self):
        self.coach_user = User.objects.create_user(
            email="paymentcoach@example.com",
            username="paymentcoach",
            password="testpass123",
            full_name="Payment Coach",
            is_coach=True,
            is_student=False,
        )
        self.coach = Coach.objects.create(
            user=self.coach_user,
            name="Payment Coach",
            email="paymentcoach@example.com",
            hourly_rate=10000,
        )
        self.student_user = User.objects.create_user(
            email="paymentstudent@example.com",
            username="paymentstudent",
            password="testpass123",
            full_name="Payment Student",
        )
        self.booking = Booking.objects.create(
            coach=self.coach,
            student_name="Payment Student",
            student_email="paymentstudent@example.com",
            booking_date=date(2030, 12, 25),
            start_time=time(11, 0),
            end_time=time(12, 0),
            recurring_days=[1],
            recurring_dates=[{"date": "2030-12-25", "start_time": "11:00", "end_time": "12:00"}],
            sessions_per_month=4,
            monthly_amount=40000,
            payment_reference="BK-CALLBACK-123",
            payment_status="pending",
            status="pending",
        )

    @patch("payments.views.verify_transaction")
    def test_booking_callback_confirms_booking_on_success(self, mock_verify):
        mock_verify.return_value = {
            "success": True,
            "status": "success",
            "reference": "BK-CALLBACK-123",
        }
        self.client.force_login(self.student_user)
        response = self.client.get(
            reverse("payments:booking_callback"),
            {"reference": "BK-CALLBACK-123"},
        )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, reverse("scheduling:booking_confirmation", args=[self.booking.id]))
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "confirmed")
        self.assertEqual(self.booking.payment_status, "paid")
        self.assertIsNotNone(self.booking.payment_date)

    @patch("payments.views.verify_transaction")
    def test_booking_callback_shows_error_on_failure(self, mock_verify):
        mock_verify.return_value = {
            "success": True,
            "status": "failed",
            "reference": "BK-CALLBACK-123",
        }
        self.client.force_login(self.student_user)
        response = self.client.get(
            reverse("payments:booking_callback"),
            {"reference": "BK-CALLBACK-123"},
        )
        self.assertEqual(response.status_code, 302)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "pending")
        self.assertEqual(self.booking.payment_status, "pending")


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

    def test_coach_can_confirm_paid_booking(self):
        self.booking.payment_status = "paid"
        self.booking.save()
        self.client.force_login(self.coach_user)
        response = self.client.post(
            reverse("scheduling:coach_dashboard"),
            {"action": "confirm_booking", "booking_id": str(self.booking.id)},
        )
        self.assertEqual(response.status_code, 302)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "confirmed")

    def test_coach_cannot_confirm_unpaid_booking(self):
        self.assertEqual(self.booking.payment_status, "pending")
        self.client.force_login(self.coach_user)
        response = self.client.post(
            reverse("scheduling:coach_dashboard"),
            {"action": "confirm_booking", "booking_id": str(self.booking.id)},
        )
        self.assertEqual(response.status_code, 302)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "pending")

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


class PointsBookingFlowTests(TestCase):
    def setUp(self):
        self.coach_user = User.objects.create_user(
            email="pointscoach@example.com",
            username="pointscoach",
            password="testpass123",
            full_name="Points Coach",
            is_coach=True,
            is_student=False,
        )
        self.coach = Coach.objects.create(
            user=self.coach_user,
            name="Points Coach",
            email="pointscoach@example.com",
            hourly_rate=10000,
            points_cost=2,
            meeting_link="https://meet.example.com/points",
        )
        self.student_user = User.objects.create_user(
            email="pointsstudent@example.com",
            username="pointsstudent",
            password="testpass123",
            full_name="Points Student",
        )
        from payments.points_service import add_points
        add_points(self.student_user, 10, description="Test top-up", payment_reference="TEST")

        AvailabilitySlot.objects.create(
            coach=self.coach,
            day_of_week=1,
            start_time=time(11, 0),
            end_time=time(12, 0),
        )
        AvailabilitySlot.objects.create(
            coach=self.coach,
            day_of_week=3,
            start_time=time(14, 0),
            end_time=time(15, 0),
        )

    def _future_monday(self):
        from datetime import timedelta as _td
        today = date.today()
        days_ahead = 0 - today.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        return today + _td(days=days_ahead)

    def test_booking_page_has_points_tab(self):
        self.client.force_login(self.student_user)
        response = self.client.get(reverse("scheduling:book_coach", args=[self.coach.id]))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Book with Points")
        self.assertContains(response, "Book Recurring Classes")

    def test_points_booking_creates_flexible_bookings(self):
        from payments.models import UserPoints, PointTransaction
        from scheduling.models import FlexibleBooking

        monday = self._future_monday()
        slots_payload = [
            {
                "date": monday.isoformat(),
                "day_of_week": 1,
                "start_time": "11:00",
                "end_time": "12:00",
            }
        ]

        self.client.force_login(self.student_user)
        response = self.client.post(
            reverse("scheduling:book_coach", args=[self.coach.id]),
            {
                "booking_type": "points",
                "selected_slots": json.dumps(slots_payload),
                "student_name": "Points Student",
                "student_email": "pointsstudent@example.com",
                "student_phone": "+2348012345678",
                "student_notes": "Please focus on openings",
            },
        )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(FlexibleBooking.objects.count(), 1)
        flex = FlexibleBooking.objects.first()
        self.assertEqual(flex.user, self.student_user)
        self.assertEqual(flex.coach, self.coach)
        self.assertEqual(flex.points_used, 2)
        self.assertEqual(flex.session_date, monday)
        self.assertEqual(flex.start_time, time(11, 0))
        self.assertEqual(flex.end_time, time(12, 0))
        self.assertEqual(flex.status, "confirmed")

        points = UserPoints.objects.get(user=self.student_user)
        self.assertEqual(points.balance, 8)

        tx = PointTransaction.objects.filter(user=self.student_user, type="usage").first()
        self.assertIsNotNone(tx)
        self.assertEqual(tx.amount, -2)
        self.assertEqual(tx.balance_after, 8)

        self.assertEqual(len(mail.outbox), 2)
        subjects = [m.subject for m in mail.outbox]
        self.assertIn("Your Session Has Been Booked", subjects)
        self.assertIn("New Session Booking - Points Student", subjects)

    def test_points_booking_rejects_insufficient_balance(self):
        from scheduling.models import FlexibleBooking
        from payments.points_service import get_or_create_user_points

        points = get_or_create_user_points(self.student_user)
        points.balance = 1
        points.save()

        monday = self._future_monday()
        slots_payload = [
            {
                "date": monday.isoformat(),
                "day_of_week": 1,
                "start_time": "11:00",
                "end_time": "12:00",
            }
        ]

        self.client.force_login(self.student_user)
        response = self.client.post(
            reverse("scheduling:book_coach", args=[self.coach.id]),
            {
                "booking_type": "points",
                "selected_slots": json.dumps(slots_payload),
                "student_name": "Points Student",
                "student_email": "pointsstudent@example.com",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(FlexibleBooking.objects.count(), 0)

    def test_points_booking_rejects_empty_slots(self):
        from scheduling.models import FlexibleBooking

        self.client.force_login(self.student_user)
        response = self.client.post(
            reverse("scheduling:book_coach", args=[self.coach.id]),
            {
                "booking_type": "points",
                "selected_slots": "",
                "student_name": "Points Student",
                "student_email": "pointsstudent@example.com",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(FlexibleBooking.objects.count(), 0)

    def test_flexible_booking_confirmation_page(self):
        from scheduling.models import FlexibleBooking
        flex = FlexibleBooking.objects.create(
            user=self.student_user,
            coach=self.coach,
            session_date=date(2030, 12, 25),
            start_time=time(11, 0),
            end_time=time(12, 0),
            day_of_week=3,
            points_used=2,
        )
        self.client.force_login(self.student_user)
        response = self.client.get(reverse("scheduling:flexible_booking_confirmation", args=[flex.id]))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "scheduling/flexible_booking_confirmation.html")
        self.assertContains(response, self.coach.name)


class SpecialBookingFlowTests(TestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            email="student@example.com",
            username="studentuser",
            password="testpass123",
            full_name="Test Student",
        )
        self.special_coach = Coach.objects.create(
            name="Elite Coach",
            email="elite@example.com",
            is_special=True,
            hourly_rate=15000,
        )
        AvailabilitySlot.objects.create(
            coach=self.special_coach,
            day_of_week=2,  # Tuesday
            start_time=time(14, 0),
            end_time=time(15, 0),
        )
        self.normal_coach = Coach.objects.create(
            name="Regular Coach",
            email="regular@example.com",
            is_special=False,
        )

    def test_special_tab_shown_for_special_coach(self):
        self.client.force_login(self.student)
        response = self.client.get(reverse("scheduling:book_coach", args=[self.special_coach.id]))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Pay to Book")

    def test_special_tab_hidden_for_normal_coach(self):
        self.client.force_login(self.student)
        response = self.client.get(reverse("scheduling:book_coach", args=[self.normal_coach.id]))
        self.assertEqual(response.status_code, 200)
        self.assertNotContains(response, "Pay to Book")

    @patch("scheduling.views.initialize_transaction", side_effect=_mock_initialize_success)
    def test_special_booking_creation_redirects_to_payment(self, mock_init):
        self.client.force_login(self.student)
        from scheduling.models import SpecialBooking
        today = timezone.now().date()
        # Find next Tuesday
        days_until_tuesday = (1 - today.weekday()) % 7
        next_tuesday = today + timedelta(days=days_until_tuesday if days_until_tuesday else 7)
        selected_slots = json.dumps([
            {
                "date": next_tuesday.isoformat(),
                "day_of_week": 2,
                "start_time": "14:00",
                "end_time": "15:00",
            }
        ])

        response = self.client.post(
            reverse("scheduling:book_coach", args=[self.special_coach.id]),
            {
                "booking_type": "special",
                "selected_slots": selected_slots,
                "student_name": "Test Student",
                "student_email": "student@example.com",
                "student_phone": "08012345678",
            },
        )

        self.assertEqual(SpecialBooking.objects.count(), 1)
        booking = SpecialBooking.objects.first()
        self.assertEqual(booking.total_sessions, 1)
        self.assertEqual(booking.total_amount, 15000)
        self.assertEqual(booking.status, "pending_payment")
        self.assertEqual(booking.payment_status, "pending")
        self.assertTrue(booking.payment_reference.startswith("SP-"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "scheduling/special_booking_payment.html")
        self.assertContains(response, "https://checkout.paystack.com/test-booking-url")
        self.assertEqual(len(mail.outbox), 2)
        subjects = [m.subject for m in mail.outbox]
        self.assertIn("Your Special Coaching Booking is Reserved! Complete Payment to Confirm", subjects)
        self.assertIn("New Special Booking - Test Student (Pending Payment)", subjects)

    @patch("scheduling.views.initialize_transaction", side_effect=_mock_initialize_success)
    def test_special_booking_creation_multiple_sessions(self, mock_init):
        self.client.force_login(self.student)
        from scheduling.models import SpecialBooking
        today = timezone.now().date()
        days_until_tuesday = (1 - today.weekday()) % 7
        next_tuesday = today + timedelta(days=days_until_tuesday if days_until_tuesday else 7)
        next_thursday = next_tuesday + timedelta(days=2)
        selected_slots = json.dumps([
            {
                "date": next_tuesday.isoformat(),
                "day_of_week": 2,
                "start_time": "14:00",
                "end_time": "15:00",
            },
            {
                "date": next_thursday.isoformat(),
                "day_of_week": 4,
                "start_time": "14:00",
                "end_time": "15:00",
            }
        ])

        response = self.client.post(
            reverse("scheduling:book_coach", args=[self.special_coach.id]),
            {
                "booking_type": "special",
                "selected_slots": selected_slots,
                "student_name": "Test Student",
                "student_email": "student@example.com",
                "student_phone": "08012345678",
            },
        )

        self.assertEqual(SpecialBooking.objects.count(), 1)
        booking = SpecialBooking.objects.first()
        self.assertEqual(booking.total_sessions, 2)
        self.assertEqual(booking.total_amount, 30000)
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "scheduling/special_booking_payment.html")

    @patch("scheduling.views.initialize_transaction", side_effect=_mock_initialize_success)
    def test_special_booking_discount_tier_10_percent(self, mock_init):
        self.client.force_login(self.student)
        from scheduling.models import SpecialBooking
        today = timezone.now().date()
        days_until_tuesday = (1 - today.weekday()) % 7
        next_tuesday = today + timedelta(days=days_until_tuesday if days_until_tuesday else 7)

        # Create 8 individual sessions across 4 weeks on Tuesday and Thursday
        selected_slots = []
        for week in range(4):
            tuesday = next_tuesday + timedelta(weeks=week)
            thursday = tuesday + timedelta(days=2)
            selected_slots.append({
                "date": tuesday.isoformat(),
                "day_of_week": 2,
                "start_time": "14:00",
                "end_time": "15:00",
            })
            selected_slots.append({
                "date": thursday.isoformat(),
                "day_of_week": 4,
                "start_time": "14:00",
                "end_time": "15:00",
            })

        response = self.client.post(
            reverse("scheduling:book_coach", args=[self.special_coach.id]),
            {
                "booking_type": "special",
                "selected_slots": json.dumps(selected_slots),
                "student_name": "Test Student",
                "student_email": "student@example.com",
                "student_phone": "08012345678",
            },
        )

        self.assertEqual(SpecialBooking.objects.count(), 1)
        booking = SpecialBooking.objects.first()
        self.assertEqual(booking.total_sessions, 8)
        # 8 * 15000 = 120000, 10% discount = 108000
        self.assertEqual(booking.total_amount, 108000)
        self.assertEqual(response.status_code, 200)

    @patch("scheduling.views.initialize_transaction", side_effect=_mock_initialize_success)
    def test_special_booking_discount_tier_15_percent(self, mock_init):
        self.client.force_login(self.student)
        from scheduling.models import SpecialBooking
        today = timezone.now().date()
        days_until_tuesday = (1 - today.weekday()) % 7
        next_tuesday = today + timedelta(days=days_until_tuesday if days_until_tuesday else 7)

        # Create 12 individual sessions across 4 weeks on Tuesday, Wednesday, Thursday
        selected_slots = []
        for week in range(4):
            tuesday = next_tuesday + timedelta(weeks=week)
            wednesday = tuesday + timedelta(days=1)
            thursday = tuesday + timedelta(days=2)
            selected_slots.append({
                "date": tuesday.isoformat(),
                "day_of_week": 2,
                "start_time": "14:00",
                "end_time": "15:00",
            })
            selected_slots.append({
                "date": wednesday.isoformat(),
                "day_of_week": 3,
                "start_time": "14:00",
                "end_time": "15:00",
            })
            selected_slots.append({
                "date": thursday.isoformat(),
                "day_of_week": 4,
                "start_time": "14:00",
                "end_time": "15:00",
            })

        response = self.client.post(
            reverse("scheduling:book_coach", args=[self.special_coach.id]),
            {
                "booking_type": "special",
                "selected_slots": json.dumps(selected_slots),
                "student_name": "Test Student",
                "student_email": "student@example.com",
                "student_phone": "08012345678",
            },
        )

        self.assertEqual(SpecialBooking.objects.count(), 1)
        booking = SpecialBooking.objects.first()
        self.assertEqual(booking.total_sessions, 12)
        # 12 * 15000 = 180000, 15% discount = 153000
        self.assertEqual(booking.total_amount, 153000)
        self.assertEqual(response.status_code, 200)
