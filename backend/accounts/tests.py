from datetime import date, time

from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from scheduling.models import Coach, Student

User = get_user_model()


class AccountsViewsTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="testpass123",
            full_name="Test User",
        )

    def test_login_page_renders(self):
        response = self.client.get(reverse("accounts:login"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "accounts/login.html")

    def test_login_redirects_student_to_dashboard(self):
        response = self.client.post(
            reverse("accounts:login"),
            {"username": "test@example.com", "password": "testpass123"},
        )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, reverse("accounts:dashboard"))

    def test_login_redirects_coach_to_scheduling_dashboard(self):
        coach_user = User.objects.create_user(
            email="coachlogin@example.com",
            username="coachlogin",
            password="testpass123",
            full_name="Coach Login",
            is_coach=True,
            is_student=False,
        )
        Coach.objects.create(user=coach_user, name="Coach Login", email="coachlogin@example.com")
        response = self.client.post(
            reverse("accounts:login"),
            {"username": "coachlogin@example.com", "password": "testpass123"},
        )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, reverse("scheduling:coach_dashboard"))

    def test_signup_page_renders(self):
        response = self.client.get(reverse("accounts:signup"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "accounts/signup.html")

    def test_signup_creates_student_and_redirects_to_dashboard(self):
        response = self.client.post(
            reverse("accounts:signup"),
            {
                "email": "new@example.com",
                "username": "newuser",
                "full_name": "New User",
                "phone": "",
                "role": "student",
                "password1": "StrongPass123!",
                "password2": "StrongPass123!",
            },
        )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, reverse("accounts:dashboard"))
        user = User.objects.get(email="new@example.com")
        self.assertTrue(user.is_student)
        self.assertFalse(user.is_coach)
        self.assertTrue(Student.objects.filter(user=user).exists())

    def test_signup_creates_coach_and_redirects_to_scheduling_dashboard(self):
        response = self.client.post(
            reverse("accounts:signup"),
            {
                "email": "coachsignup@example.com",
                "username": "coachsignup",
                "full_name": "Coach Signup",
                "phone": "",
                "role": "coach",
                "password1": "StrongPass123!",
                "password2": "StrongPass123!",
            },
        )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, reverse("scheduling:coach_dashboard"))
        user = User.objects.get(email="coachsignup@example.com")
        self.assertTrue(user.is_coach)
        self.assertFalse(user.is_student)
        self.assertTrue(Coach.objects.filter(user=user).exists())
        coach = Coach.objects.get(user=user)
        self.assertEqual(coach.name, "Coach Signup")
        self.assertEqual(coach.email, "coachsignup@example.com")

    def test_dashboard_requires_login(self):
        response = self.client.get(reverse("accounts:dashboard"))
        self.assertEqual(response.status_code, 302)
        self.assertIn(reverse("accounts:login"), response.url)

    def test_dashboard_renders_student_template(self):
        self.client.force_login(self.user)
        response = self.client.get(reverse("accounts:dashboard"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "accounts/dashboard_student.html")
        self.assertContains(response, "Test User")

    def test_dashboard_redirects_coach_to_scheduling_dashboard(self):
        coach_user = User.objects.create_user(
            email="coachdash@example.com",
            username="coachdash",
            password="testpass123",
            full_name="Coach Dash",
            is_coach=True,
            is_student=False,
        )
        Coach.objects.create(user=coach_user, name="Coach Dash", email="coachdash@example.com")
        self.client.force_login(coach_user)
        response = self.client.get(reverse("accounts:dashboard"))
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, reverse("scheduling:coach_dashboard"))


class StudentDashboardBookingsTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="testpass123",
            full_name="Test User",
        )
        self.coach = Coach.objects.create(name="Coach", email="coach@example.com")

    def test_dashboard_shows_recurring_booking_in_upcoming_sessions(self):
        from scheduling.models import Booking

        Booking.objects.create(
            coach=self.coach,
            student_name=self.user.full_name,
            student_email=self.user.email,
            booking_date=date(2030, 12, 25),
            start_time=time(11, 0),
            end_time=time(12, 0),
            status="confirmed",
            recurring_days=[1],
            recurring_dates=[{"date": "2030-12-25", "start_time": "11:00", "end_time": "12:00"}],
            sessions_per_month=4,
            monthly_amount=40000,
        )
        self.client.force_login(self.user)
        response = self.client.get(reverse("accounts:dashboard"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Upcoming Sessions")
        self.assertContains(response, "Recurring")
        self.assertContains(response, "Coach")

    def test_dashboard_excludes_past_recurring_sessions(self):
        from scheduling.models import Booking

        Booking.objects.create(
            coach=self.coach,
            student_name=self.user.full_name,
            student_email=self.user.email,
            booking_date=date(2020, 1, 1),
            start_time=time(11, 0),
            end_time=time(12, 0),
            status="confirmed",
            recurring_days=[1],
            recurring_dates=[{"date": "2020-01-01", "start_time": "11:00", "end_time": "12:00"}],
            sessions_per_month=4,
            monthly_amount=40000,
        )
        self.client.force_login(self.user)
        response = self.client.get(reverse("accounts:dashboard"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "No upcoming sessions")

    def test_dashboard_excludes_pending_recurring_bookings(self):
        from scheduling.models import Booking

        Booking.objects.create(
            coach=self.coach,
            student_name=self.user.full_name,
            student_email=self.user.email,
            booking_date=date(2030, 12, 25),
            start_time=time(11, 0),
            end_time=time(12, 0),
            status="pending",
            recurring_days=[1],
            recurring_dates=[{"date": "2030-12-25", "start_time": "11:00", "end_time": "12:00"}],
            sessions_per_month=4,
            monthly_amount=40000,
        )
        self.client.force_login(self.user)
        response = self.client.get(reverse("accounts:dashboard"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "No upcoming sessions")

    def test_dashboard_excludes_rejected_recurring_bookings(self):
        from scheduling.models import Booking

        Booking.objects.create(
            coach=self.coach,
            student_name=self.user.full_name,
            student_email=self.user.email,
            booking_date=date(2030, 12, 25),
            start_time=time(11, 0),
            end_time=time(12, 0),
            status="rejected",
            recurring_days=[1],
            recurring_dates=[{"date": "2030-12-25", "start_time": "11:00", "end_time": "12:00"}],
            sessions_per_month=4,
            monthly_amount=40000,
        )
        self.client.force_login(self.user)
        response = self.client.get(reverse("accounts:dashboard"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "No upcoming sessions")

    def test_dashboard_upcoming_sessions_sorted_by_date(self):
        from scheduling.models import Booking, FlexibleBooking

        FlexibleBooking.objects.create(
            user=self.user,
            coach=self.coach,
            session_date=date(2030, 12, 20),
            start_time=time(10, 0),
            end_time=time(11, 0),
            day_of_week=3,
            points_used=2,
            status="confirmed",
        )
        Booking.objects.create(
            coach=self.coach,
            student_name=self.user.full_name,
            student_email=self.user.email,
            booking_date=date(2030, 12, 22),
            start_time=time(11, 0),
            end_time=time(12, 0),
            status="confirmed",
            recurring_days=[1],
            recurring_dates=[{"date": "2030-12-22", "start_time": "11:00", "end_time": "12:00"}],
            sessions_per_month=4,
            monthly_amount=40000,
        )
        self.client.force_login(self.user)
        response = self.client.get(reverse("accounts:dashboard"))
        content = response.content.decode()
        first = content.index("Dec 20, 2030")
        second = content.index("Dec 22, 2030")
        self.assertLess(first, second)


class StudentDashboardPointsTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="pointsdash@example.com",
            username="pointsdash",
            password="testpass123",
            full_name="Points Student",
        )

    def test_dashboard_shows_points_balance_and_buy_link(self):
        from payments.points_service import add_points
        add_points(self.user, 7, payment_reference="TEST-DASH")

        self.client.force_login(self.user)
        response = self.client.get(reverse("accounts:dashboard"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Points Balance")
        self.assertContains(response, "7")
        self.assertContains(response, reverse("payments:buy_points"))

    def test_dashboard_shows_flexible_bookings(self):
        from scheduling.models import FlexibleBooking

        coach = Coach.objects.create(name="Flex Coach", email="flex@example.com")
        FlexibleBooking.objects.create(
            user=self.user,
            coach=coach,
            session_date=date(2030, 12, 25),
            start_time=time(11, 0),
            end_time=time(12, 0),
            day_of_week=3,
            points_used=2,
            status="confirmed",
        )
        self.client.force_login(self.user)
        response = self.client.get(reverse("accounts:dashboard"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Flex Coach")
        self.assertContains(response, "Points History")
