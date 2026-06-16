from datetime import date, time

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from payments.models import PointTransaction, UserPoints
from scheduling.models import Booking, Coach, FlexibleBooking

User = get_user_model()


class AdminPortalAccessTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            email="admin@example.com",
            username="adminuser",
            password="adminpass123",
        )
        self.student = User.objects.create_user(
            email="student@example.com",
            username="studentuser",
            password="testpass123",
            is_student=True,
        )

    def test_dashboard_requires_superuser(self):
        self.client.force_login(self.student)
        response = self.client.get(reverse("admin_portal:dashboard"))
        self.assertEqual(response.status_code, 302)

    def test_dashboard_renders_for_superuser(self):
        self.client.force_login(self.admin)
        response = self.client.get(reverse("admin_portal:dashboard"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "admin_portal/dashboard.html")
        self.assertContains(response, "Dashboard")


class AdminPortalBookingsTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            email="admin@example.com",
            username="adminuser",
            password="adminpass123",
        )
        self.coach = Coach.objects.create(name="Coach A", email="coacha@example.com")
        self.booking = Booking.objects.create(
            coach=self.coach,
            student_name="Student A",
            student_email="studenta@example.com",
            booking_date=date(2030, 12, 25),
            start_time=time(10, 0),
            end_time=time(11, 0),
            recurring_days=[1, 3],
            sessions_per_month=4,
            monthly_amount=40000,
            status="pending",
            payment_status="pending",
        )

    def test_bookings_list_renders(self):
        self.client.force_login(self.admin)
        response = self.client.get(reverse("admin_portal:bookings"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "admin_portal/bookings.html")
        self.assertContains(response, "Student A")
        self.assertContains(response, "Coach A")

    def test_bookings_filter_by_status(self):
        self.client.force_login(self.admin)
        response = self.client.get(reverse("admin_portal:bookings"), {"status": "confirmed"})
        self.assertEqual(response.status_code, 200)
        self.assertNotContains(response, "Student A")

    def test_bookings_filter_by_coach(self):
        other_coach = Coach.objects.create(name="Coach B", email="coachb@example.com")
        Booking.objects.create(
            coach=other_coach,
            student_name="Student B",
            student_email="studentb@example.com",
            booking_date=date(2030, 12, 25),
            start_time=time(12, 0),
            end_time=time(13, 0),
            recurring_days=[2],
            sessions_per_month=4,
            monthly_amount=30000,
        )
        self.client.force_login(self.admin)
        response = self.client.get(
            reverse("admin_portal:bookings"),
            {"coach": str(self.coach.id)},
        )
        self.assertContains(response, "Student A")
        self.assertNotContains(response, "Student B")

    def test_confirm_booking_action(self):
        self.client.force_login(self.admin)
        response = self.client.post(
            reverse("admin_portal:booking_action", args=[self.booking.id]),
            {"action": "confirm"},
        )
        self.assertEqual(response.status_code, 302)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "confirmed")
        self.assertEqual(self.booking.payment_status, "paid")
        self.assertIsNotNone(self.booking.payment_date)

    def test_reject_booking_action(self):
        self.client.force_login(self.admin)
        response = self.client.post(
            reverse("admin_portal:booking_action", args=[self.booking.id]),
            {"action": "reject"},
        )
        self.assertEqual(response.status_code, 302)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "rejected")

    def test_cancel_booking_action(self):
        self.client.force_login(self.admin)
        response = self.client.post(
            reverse("admin_portal:booking_action", args=[self.booking.id]),
            {"action": "cancel"},
        )
        self.assertEqual(response.status_code, 302)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "cancelled")


class AdminPortalCoachesTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            email="admin@example.com",
            username="adminuser",
            password="adminpass123",
        )
        self.coach = Coach.objects.create(
            name="Elite Coach",
            email="elite@example.com",
            specialization="Openings",
            hourly_rate=5000,
            points_cost=3,
            is_special=False,
            meeting_link="https://meet.example.com/old",
            photo_url="https://example.com/photo.jpg",
        )

    def test_coaches_list_renders(self):
        self.client.force_login(self.admin)
        response = self.client.get(reverse("admin_portal:coaches"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "admin_portal/coaches.html")
        self.assertContains(response, "Elite Coach")

    def test_coach_edit_view_renders(self):
        self.client.force_login(self.admin)
        response = self.client.get(reverse("admin_portal:coach_edit", args=[self.coach.id]))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "admin_portal/coach_edit.html")
        self.assertContains(response, "Edit Coach")

    def test_coach_edit_updates_profile(self):
        self.client.force_login(self.admin)
        response = self.client.post(
            reverse("admin_portal:coach_edit", args=[self.coach.id]),
            {
                "name": "Updated Coach",
                "email": "updated@example.com",
                "specialization": "Endgames",
                "rank_title": "Grandmaster",
                "hourly_rate": "7500",
                "points_cost": "5",
                "featured_order": "2",
                "is_special": "on",
                "is_admin": "on",
                "meeting_link": "https://meet.example.com/new",
                "photo_url": "https://example.com/new.jpg",
                "bio": "Updated bio",
            },
        )
        self.assertEqual(response.status_code, 302)
        self.coach.refresh_from_db()
        self.assertEqual(self.coach.name, "Updated Coach")
        self.assertEqual(self.coach.email, "updated@example.com")
        self.assertEqual(self.coach.specialization, "Endgames")
        self.assertEqual(self.coach.rank_title, "Grandmaster")
        self.assertEqual(self.coach.hourly_rate, 7500)
        self.assertEqual(self.coach.points_cost, 5)
        self.assertEqual(self.coach.featured_order, 2)
        self.assertTrue(self.coach.is_special)
        self.assertTrue(self.coach.is_admin)
        self.assertEqual(self.coach.meeting_link, "https://meet.example.com/new")
        self.assertEqual(self.coach.photo_url, "https://example.com/new.jpg")
        self.assertEqual(self.coach.bio, "Updated bio")


class AdminPortalStudentsTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            email="admin@example.com",
            username="adminuser",
            password="adminpass123",
        )
        self.student = User.objects.create_user(
            email="student@example.com",
            username="studentuser",
            password="testpass123",
            is_student=True,
            full_name="Test Student",
            phone="08012345678",
        )
        self.coach = Coach.objects.create(name="Coach A", email="coacha@example.com")
        UserPoints.objects.create(user=self.student, balance=12)
        self.booking = Booking.objects.create(
            coach=self.coach,
            student_name=self.student.full_name,
            student_email=self.student.email,
            booking_date=date(2030, 12, 25),
            start_time=time(10, 0),
            end_time=time(11, 0),
            recurring_days=[1],
            sessions_per_month=4,
            monthly_amount=40000,
            status="confirmed",
            payment_status="paid",
        )
        self.flexible = FlexibleBooking.objects.create(
            user=self.student,
            coach=self.coach,
            session_date=date(2030, 12, 26),
            start_time=time(12, 0),
            end_time=time(13, 0),
            day_of_week=4,
            points_used=3,
            status="confirmed",
        )
        PointTransaction.objects.create(
            user=self.student,
            type="purchase",
            amount=12,
            balance_after=12,
            status="completed",
        )

    def test_students_list_renders(self):
        self.client.force_login(self.admin)
        response = self.client.get(reverse("admin_portal:students"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "admin_portal/students.html")
        self.assertContains(response, "Test Student")

    def test_students_search(self):
        self.client.force_login(self.admin)
        response = self.client.get(reverse("admin_portal:students"), {"q": "student@example.com"})
        self.assertContains(response, "Test Student")

    def test_student_detail_renders(self):
        self.client.force_login(self.admin)
        response = self.client.get(reverse("admin_portal:student_detail", args=[self.student.id]))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "admin_portal/student_detail.html")
        self.assertContains(response, "Test Student")
        self.assertContains(response, "12")
        self.assertContains(response, "Coach A")
        self.assertContains(response, "Flexible Bookings")
        self.assertContains(response, "Points Transactions")


class AdminPortalShellTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            email="admin@example.com",
            username="adminuser",
            password="adminpass123",
        )

    def test_points_admin_uses_admin_portal_shell(self):
        self.client.force_login(self.admin)
        response = self.client.get(reverse("payments:points_admin"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "payments/points_admin.html")
        self.assertContains(response, "Admin Portal")
        self.assertContains(response, "Points")
