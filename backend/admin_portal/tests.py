from datetime import date, datetime, time, timedelta

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from payments.models import PointTransaction, UserPoints
from scheduling.models import AvailabilitySlot, Booking, Coach, FlexibleBooking, SpecialBooking, CoachBlockedDate

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

    def test_admin_base_has_back_to_home_link(self):
        self.client.force_login(self.admin)
        response = self.client.get(reverse("admin_portal:dashboard"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Back to Home")
        self.assertContains(response, reverse("home"))


class AdminPortalDashboardStatsTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            email="admin@example.com",
            username="adminuser",
            password="adminpass123",
        )
        self.coach = Coach.objects.create(name="Coach A", email="coacha@example.com")
        self.student = User.objects.create_user(
            email="student@example.com",
            username="studentuser",
            password="testpass123",
            is_student=True,
        )
        today = timezone.now().date()
        self.week_start = today - timedelta(days=today.weekday())
        self.week_end = self.week_start + timedelta(days=6)
        self.next_week = self.week_end + timedelta(days=1)

    def _get_confirmed_classes_count(self):
        self.client.force_login(self.admin)
        response = self.client.get(reverse("admin_portal:dashboard"))
        return response.context["confirmed_bookings_this_week"]

    def test_recurring_confirmed_sessions_this_week_counted(self):
        Booking.objects.create(
            coach=self.coach,
            student_name="Student A",
            student_email="studenta@example.com",
            booking_date=date(2030, 12, 25),
            start_time=time(10, 0),
            end_time=time(11, 0),
            recurring_days=[1, 3],
            sessions_per_month=4,
            monthly_amount=40000,
            status="confirmed",
            payment_status="paid",
            recurring_dates=[
                {"date": self.week_start.isoformat(), "start_time": "10:00", "end_time": "11:00"},
                {"date": self.next_week.isoformat(), "start_time": "10:00", "end_time": "11:00"},
            ],
        )
        self.assertEqual(self._get_confirmed_classes_count(), 1)

    def test_pending_recurring_sessions_not_counted(self):
        Booking.objects.create(
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
            recurring_dates=[
                {"date": self.week_start.isoformat(), "start_time": "10:00", "end_time": "11:00"},
            ],
        )
        self.assertEqual(self._get_confirmed_classes_count(), 0)

    def test_flexible_confirmed_sessions_this_week_counted(self):
        FlexibleBooking.objects.create(
            user=self.student,
            coach=self.coach,
            session_date=self.week_start,
            start_time=time(10, 0),
            end_time=time(11, 0),
            day_of_week=1,
            points_used=1,
            status="confirmed",
        )
        FlexibleBooking.objects.create(
            user=self.student,
            coach=self.coach,
            session_date=self.next_week,
            start_time=time(10, 0),
            end_time=time(11, 0),
            day_of_week=1,
            points_used=1,
            status="confirmed",
        )
        self.assertEqual(self._get_confirmed_classes_count(), 1)

    def test_cancelled_flexible_sessions_not_counted(self):
        FlexibleBooking.objects.create(
            user=self.student,
            coach=self.coach,
            session_date=self.week_start,
            start_time=time(10, 0),
            end_time=time(11, 0),
            day_of_week=1,
            points_used=1,
            status="cancelled",
        )
        self.assertEqual(self._get_confirmed_classes_count(), 0)

    def test_special_confirmed_sessions_this_week_counted(self):
        SpecialBooking.objects.create(
            coach=self.coach,
            student=self.student,
            student_name="Student A",
            student_email="studenta@example.com",
            total_sessions=2,
            sessions_completed=0,
            session_dates=[
                {"date": self.week_start.isoformat(), "start_time": "10:00", "end_time": "11:00"},
                {"date": self.next_week.isoformat(), "start_time": "10:00", "end_time": "11:00"},
            ],
            hourly_rate=10000,
            total_amount=20000,
            status="confirmed",
        )
        self.assertEqual(self._get_confirmed_classes_count(), 1)

    def test_pending_payment_special_sessions_not_counted(self):
        SpecialBooking.objects.create(
            coach=self.coach,
            student=self.student,
            student_name="Student A",
            student_email="studenta@example.com",
            total_sessions=1,
            sessions_completed=0,
            session_dates=[
                {"date": self.week_start.isoformat(), "start_time": "10:00", "end_time": "11:00"},
            ],
            hourly_rate=10000,
            total_amount=10000,
            status="pending_payment",
        )
        self.assertEqual(self._get_confirmed_classes_count(), 0)

    def test_multiple_session_types_summed(self):
        Booking.objects.create(
            coach=self.coach,
            student_name="Student A",
            student_email="studenta@example.com",
            booking_date=date(2030, 12, 25),
            start_time=time(10, 0),
            end_time=time(11, 0),
            recurring_days=[1],
            sessions_per_month=4,
            monthly_amount=40000,
            status="confirmed",
            payment_status="paid",
            recurring_dates=[
                {"date": self.week_start.isoformat(), "start_time": "10:00", "end_time": "11:00"},
                {"date": (self.week_start + timedelta(days=2)).isoformat(), "start_time": "10:00", "end_time": "11:00"},
            ],
        )
        FlexibleBooking.objects.create(
            user=self.student,
            coach=self.coach,
            session_date=self.week_start + timedelta(days=1),
            start_time=time(12, 0),
            end_time=time(13, 0),
            day_of_week=2,
            points_used=1,
            status="confirmed",
        )
        SpecialBooking.objects.create(
            coach=self.coach,
            student=self.student,
            student_name="Student B",
            student_email="studentb@example.com",
            total_sessions=1,
            sessions_completed=0,
            session_dates=[
                {"date": (self.week_start + timedelta(days=3)).isoformat(), "start_time": "14:00", "end_time": "15:00"},
            ],
            hourly_rate=10000,
            total_amount=10000,
            status="confirmed",
        )
        self.assertEqual(self._get_confirmed_classes_count(), 4)


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
        self.assertEqual(len(mail.outbox), 2)
        subjects = [m.subject for m in mail.outbox]
        self.assertIn("Payment Received! Your Lessons Are Confirmed", subjects)
        self.assertIn("Booking Confirmed - Student A", subjects)

    def test_reject_booking_action(self):
        self.client.force_login(self.admin)
        response = self.client.post(
            reverse("admin_portal:booking_action", args=[self.booking.id]),
            {"action": "reject"},
        )
        self.assertEqual(response.status_code, 302)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "rejected")
        self.assertEqual(len(mail.outbox), 2)
        subjects = [m.subject for m in mail.outbox]
        self.assertIn("Your Booking Has Been Cancelled", subjects)
        self.assertIn("Booking Cancelled - Student A", subjects)

    def test_cancel_booking_action(self):
        self.client.force_login(self.admin)
        response = self.client.post(
            reverse("admin_portal:booking_action", args=[self.booking.id]),
            {"action": "cancel"},
        )
        self.assertEqual(response.status_code, 302)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "cancelled")
        self.assertEqual(len(mail.outbox), 2)
        subjects = [m.subject for m in mail.outbox]
        self.assertIn("Your Booking Has Been Cancelled", subjects)
        self.assertIn("Booking Cancelled - Student A", subjects)


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

    def test_coach_edit_can_add_blocked_date(self):
        self.client.force_login(self.admin)
        response = self.client.post(
            reverse("admin_portal:coach_edit", args=[self.coach.id]),
            {
                "action": "add_blocked_date",
                "blocked_date": "2030-12-25",
                "start_time": "10:00",
                "end_time": "12:00",
                "reason": "Holiday",
            },
        )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(CoachBlockedDate.objects.filter(coach=self.coach).count(), 1)
        block = CoachBlockedDate.objects.first()
        self.assertEqual(block.blocked_date, date(2030, 12, 25))
        self.assertEqual(block.reason, "Holiday")

    def test_coach_edit_can_delete_blocked_date(self):
        block = CoachBlockedDate.objects.create(
            coach=self.coach,
            blocked_date=date(2030, 12, 25),
        )
        self.client.force_login(self.admin)
        response = self.client.post(
            reverse("admin_portal:coach_edit", args=[self.coach.id]),
            {
                "action": "delete_blocked_date",
                "block_id": str(block.id),
            },
        )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(CoachBlockedDate.objects.filter(coach=self.coach).count(), 0)


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


class AdminPortalScheduleTests(TestCase):
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
        )
        self.coach = Coach.objects.create(name="Coach A", email="coacha@example.com")

    def test_schedule_renders_current_week(self):
        from django.utils import timezone
        today = timezone.now().date()
        Booking.objects.create(
            coach=self.coach,
            student_name="Weekly Student",
            student_email="weekly@example.com",
            booking_date=today,
            start_time=time(10, 0),
            end_time=time(11, 0),
            recurring_days=[today.weekday()],
            recurring_dates=[{"date": today.isoformat(), "start_time": "10:00", "end_time": "11:00"}],
            sessions_per_month=4,
            monthly_amount=40000,
            status="confirmed",
            payment_status="paid",
        )
        self.client.force_login(self.admin)
        response = self.client.get(reverse("admin_portal:schedule"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "admin_portal/schedule.html")
        self.assertContains(response, "Weekly Student")
        self.assertContains(response, "Recurring")

    def test_schedule_includes_flexible_and_special_bookings(self):
        from django.utils import timezone
        today = timezone.now().date()
        FlexibleBooking.objects.create(
            user=self.student,
            coach=self.coach,
            session_date=today,
            start_time=time(14, 0),
            end_time=time(15, 0),
            day_of_week=today.weekday(),
            points_used=3,
            status="confirmed",
        )
        SpecialBooking.objects.create(
            coach=self.coach,
            student=self.student,
            student_name="Special Student",
            student_email="special@example.com",
            total_sessions=1,
            session_dates=[today.isoformat()],
            hourly_rate=5000,
            total_amount=5000,
            status="confirmed",
        )
        self.client.force_login(self.admin)
        response = self.client.get(reverse("admin_portal:schedule"))
        self.assertContains(response, "Flexible")
        self.assertContains(response, "Special")
        self.assertContains(response, "Special Student")

    def test_schedule_week_navigation(self):
        self.client.force_login(self.admin)
        response = self.client.get(reverse("admin_portal:schedule"), {"week": "2"})
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Next →")
        self.assertContains(response, "← Previous")


class AdminPortalBookingActionLogicTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            email="admin@example.com",
            username="adminuser",
            password="adminpass123",
        )
        self.coach = Coach.objects.create(name="Coach A", email="coacha@example.com")

    def test_pending_unpaid_booking_shows_confirm_reject_cancel(self):
        booking = Booking.objects.create(
            coach=self.coach,
            student_name="Pending Student",
            student_email="pending@example.com",
            booking_date=date(2030, 12, 25),
            start_time=time(10, 0),
            end_time=time(11, 0),
            recurring_days=[1],
            sessions_per_month=4,
            monthly_amount=40000,
            status="pending",
            payment_status="pending",
        )
        self.client.force_login(self.admin)
        response = self.client.get(reverse("admin_portal:bookings"))
        self.assertContains(response, f"bookings/{booking.id}/action")
        # Confirm, Reject and Cancel buttons should all be present
        self.assertContains(response, ">Confirm<")
        self.assertContains(response, ">Reject<")
        self.assertContains(response, ">Cancel<")

    def test_paid_booking_only_shows_cancel(self):
        booking = Booking.objects.create(
            coach=self.coach,
            student_name="Paid Student",
            student_email="paid@example.com",
            booking_date=date(2030, 12, 25),
            start_time=time(10, 0),
            end_time=time(11, 0),
            recurring_days=[1],
            sessions_per_month=4,
            monthly_amount=40000,
            status="confirmed",
            payment_status="paid",
        )
        self.client.force_login(self.admin)
        response = self.client.get(reverse("admin_portal:bookings"))
        content = response.content.decode()
        # Action cell for this booking
        action_cell = content.split(str(booking.id))[1].split("</tr>")[0]
        self.assertNotIn(">Confirm<", action_cell)
        self.assertNotIn(">Reject<", action_cell)
        self.assertIn(">Cancel<", action_cell)


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


class AdminPortalScheduleDashboardTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            email="admin@example.com",
            username="adminuser",
            password="adminpass123",
        )
        self.coach = Coach.objects.create(name="Coach A", email="coacha@example.com")
        self.student = User.objects.create_user(
            email="student@example.com",
            username="studentuser",
            password="testpass123",
            is_student=True,
        )

    def test_schedule_dashboard_renders(self):
        self.client.force_login(self.admin)
        response = self.client.get(reverse("admin_portal:schedule_dashboard"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "admin_portal/schedule_dashboard.html")

    def test_confirm_pending_booking(self):
        booking = Booking.objects.create(
            coach=self.coach,
            student_name="Pending Student",
            student_email="pending@example.com",
            booking_date=date(2030, 12, 25),
            start_time=time(10, 0),
            end_time=time(11, 0),
            recurring_days=[1],
            sessions_per_month=4,
            monthly_amount=40000,
            status="pending",
            payment_status="pending",
        )
        self.client.force_login(self.admin)
        response = self.client.post(
            reverse("admin_portal:schedule_dashboard"),
            {"action": "confirm_booking", "booking_id": str(booking.id)},
        )
        self.assertEqual(response.status_code, 302)
        booking.refresh_from_db()
        self.assertEqual(booking.status, "confirmed")
        self.assertEqual(booking.payment_status, "paid")
        self.assertIsNotNone(booking.payment_date)

    def test_confirm_special_booking(self):
        special = SpecialBooking.objects.create(
            coach=self.coach,
            student=self.student,
            student_name="Special Student",
            student_email="special@example.com",
            total_sessions=2,
            session_dates=[
                {"date": "2030-12-25", "start_time": "10:00", "end_time": "11:00"},
                {"date": "2030-12-26", "start_time": "10:00", "end_time": "11:00"},
            ],
            hourly_rate=20000,
            total_amount=40000,
            status="pending_payment",
        )
        self.client.force_login(self.admin)
        response = self.client.post(
            reverse("admin_portal:schedule_dashboard"),
            {"action": "confirm_special", "booking_id": str(special.id)},
        )
        self.assertEqual(response.status_code, 302)
        special.refresh_from_db()
        self.assertEqual(special.status, "confirmed")
        self.assertIsNotNone(special.payment_date)

    def test_admin_add_delete_availability(self):
        self.client.force_login(self.admin)
        response = self.client.post(
            f"{reverse('admin_portal:schedule_dashboard')}?coach={self.coach.id}",
            {
                "action": "add_availability",
                "coach_id": str(self.coach.id),
                "day_of_week": "1",
                "start_time": "09:00",
                "end_time": "10:00",
            },
        )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(AvailabilitySlot.objects.filter(coach=self.coach).count(), 1)
        slot = AvailabilitySlot.objects.first()

        response = self.client.post(
            f"{reverse('admin_portal:schedule_dashboard')}?coach={self.coach.id}",
            {
                "action": "delete_availability",
                "coach_id": str(self.coach.id),
                "slot_id": str(slot.id),
            },
        )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(AvailabilitySlot.objects.filter(coach=self.coach).count(), 0)

    def test_admin_add_delete_blocked_date(self):
        self.client.force_login(self.admin)
        response = self.client.post(
            f"{reverse('admin_portal:schedule_dashboard')}?coach={self.coach.id}",
            {
                "action": "add_block",
                "coach_id": str(self.coach.id),
                "blocked_date": "2030-12-25",
                "reason": "Holiday",
            },
        )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(CoachBlockedDate.objects.filter(coach=self.coach).count(), 1)
        block = CoachBlockedDate.objects.first()

        response = self.client.post(
            f"{reverse('admin_portal:schedule_dashboard')}?coach={self.coach.id}",
            {
                "action": "delete_block",
                "coach_id": str(self.coach.id),
                "block_id": str(block.id),
            },
        )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(CoachBlockedDate.objects.filter(coach=self.coach).count(), 0)
