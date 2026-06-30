import json
from datetime import date, time
from unittest.mock import patch
from django.core import mail
from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from .models import UserPoints, PointTransaction
from .points_service import add_points, use_points, get_balance

User = get_user_model()


def _mock_initialize_success(*args, **kwargs):
    return {
        "success": True,
        "authorization_url": "https://checkout.paystack.com/test-url",
        "reference": kwargs.get("reference", "PTS-TEST"),
        "message": "Transaction initialized",
    }


class BuyPointsViewTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="buyer@example.com",
            username="buyer",
            password="testpass123",
            full_name="Point Buyer",
        )

    def test_buy_points_page_requires_login(self):
        response = self.client.get(reverse("payments:buy_points"))
        self.assertEqual(response.status_code, 302)

    def test_buy_points_page_renders(self):
        self.client.force_login(self.user)
        response = self.client.get(reverse("payments:buy_points"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "payments/buy_points.html")
        self.assertContains(response, "Buy Points")

    @patch("payments.views.initialize_transaction", side_effect=_mock_initialize_success)
    def test_buy_points_package_creates_pending_transaction(self, mock_init):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("payments:buy_points"),
            {"action": "buy_package", "points": "8", "price": "72000"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Pay with Paystack")
        self.assertContains(response, "https://checkout.paystack.com/test-url")
        self.assertEqual(PointTransaction.objects.count(), 1)
        tx = PointTransaction.objects.first()
        self.assertEqual(tx.type, "purchase")
        self.assertEqual(tx.amount, 8)
        self.assertEqual(tx.status, "pending")

    @patch("payments.views.initialize_transaction", side_effect=_mock_initialize_success)
    def test_buy_points_custom_amount_creates_pending_transaction(self, mock_init):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("payments:buy_points"),
            {"action": "buy_custom", "custom_amount": "5"},
        )
        self.assertEqual(response.status_code, 200)
        tx = PointTransaction.objects.first()
        self.assertEqual(tx.amount, 5)


class PaystackCallbackTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="callback@example.com",
            username="callbackuser",
            password="testpass123",
        )
        self.tx = PointTransaction.objects.create(
            user=self.user,
            type="purchase",
            amount=4,
            balance_after=0,
            payment_reference="PTS-CALLBACK-123",
            description="Test purchase",
            status="pending",
        )

    @patch("payments.views.verify_transaction")
    def test_callback_credits_points_on_success(self, mock_verify):
        mock_verify.return_value = {
            "success": True,
            "status": "success",
            "reference": "PTS-CALLBACK-123",
        }
        self.client.force_login(self.user)
        response = self.client.get(
            reverse("payments:paystack_callback"),
            {"reference": "PTS-CALLBACK-123"},
        )
        self.assertEqual(response.status_code, 302)
        self.tx.refresh_from_db()
        self.assertEqual(self.tx.status, "completed")
        self.assertEqual(get_balance(self.user), 4)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject, "Your Points Purchase is Confirmed")

    @patch("payments.views.verify_transaction")
    def test_callback_shows_error_on_failure(self, mock_verify):
        mock_verify.return_value = {
            "success": True,
            "status": "failed",
            "reference": "PTS-CALLBACK-123",
        }
        self.client.force_login(self.user)
        response = self.client.get(
            reverse("payments:paystack_callback"),
            {"reference": "PTS-CALLBACK-123"},
        )
        self.assertEqual(response.status_code, 302)
        self.tx.refresh_from_db()
        self.assertEqual(self.tx.status, "pending")


class PaystackWebhookTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="webhook@example.com",
            username="webhookuser",
            password="testpass123",
        )
        self.tx = PointTransaction.objects.create(
            user=self.user,
            type="purchase",
            amount=6,
            balance_after=0,
            payment_reference="PTS-WEBHOOK-123",
            description="Test purchase",
            status="pending",
        )

    def _signature(self, payload_bytes):
        import hashlib
        import hmac
        from django.conf import settings
        return hmac.new(
            settings.PAYSTACK_SECRET_KEY.encode("utf-8"),
            payload_bytes,
            hashlib.sha512,
        ).hexdigest()

    def test_webhook_credits_points_on_charge_success(self):
        payload = {
            "event": "charge.success",
            "data": {
                "reference": "PTS-WEBHOOK-123",
                "status": "success",
            },
        }
        body = json.dumps(payload).encode("utf-8")
        response = self.client.post(
            reverse("payments:paystack_webhook"),
            data=body,
            content_type="application/json",
            HTTP_X_PAYSTACK_SIGNATURE=self._signature(body),
        )
        self.assertEqual(response.status_code, 200)
        self.tx.refresh_from_db()
        self.assertEqual(self.tx.status, "completed")
        self.assertEqual(get_balance(self.user), 6)

    def test_webhook_rejects_invalid_signature(self):
        payload = {
            "event": "charge.success",
            "data": {"reference": "PTS-WEBHOOK-123", "status": "success"},
        }
        body = json.dumps(payload).encode("utf-8")
        response = self.client.post(
            reverse("payments:paystack_webhook"),
            data=body,
            content_type="application/json",
            HTTP_X_PAYSTACK_SIGNATURE="invalid-signature",
        )
        self.assertEqual(response.status_code, 403)

    @patch("payments.webhook_views.verify_transaction")
    def test_webhook_confirms_booking_on_charge_success(self, mock_verify):
        from scheduling.models import Booking, Coach

        coach = Coach.objects.create(name="Webhook Coach", email="webhookcoach@example.com")
        booking = Booking.objects.create(
            coach=coach,
            student_name="Webhook Student",
            student_email="webhookstudent@example.com",
            booking_date=date(2030, 12, 25),
            start_time=time(11, 0),
            end_time=time(12, 0),
            recurring_days=[1],
            recurring_dates=[{"date": "2030-12-25", "start_time": "11:00", "end_time": "12:00"}],
            sessions_per_month=4,
            monthly_amount=40000,
            payment_reference="BK-WEBHOOK-123",
            payment_status="pending",
            status="pending",
        )
        mock_verify.return_value = {
            "success": True,
            "data": {
                "status": "success",
                "amount": 4000000,  # 40000 NGN in kobo
                "reference": "BK-WEBHOOK-123",
            },
        }

        payload = {
            "event": "charge.success",
            "data": {"reference": "BK-WEBHOOK-123", "status": "success"},
        }
        body = json.dumps(payload).encode("utf-8")
        response = self.client.post(
            reverse("payments:paystack_webhook"),
            data=body,
            content_type="application/json",
            HTTP_X_PAYSTACK_SIGNATURE=self._signature(body),
        )
        self.assertEqual(response.status_code, 200)
        booking.refresh_from_db()
        self.assertEqual(booking.status, "confirmed")
        self.assertEqual(booking.payment_status, "paid")
        self.assertIsNotNone(booking.payment_date)

    @patch("payments.webhook_views.verify_transaction")
    def test_webhook_confirms_special_booking_on_charge_success(self, mock_verify):
        from scheduling.models import SpecialBooking, Coach

        coach = Coach.objects.create(name="Special Webhook Coach", email="specialwebhookcoach@example.com")
        booking = SpecialBooking.objects.create(
            coach=coach,
            student_name="Webhook Student",
            student_email="webhookstudent@example.com",
            total_sessions=2,
            session_dates=[
                {"date": "2030-12-25", "start_time": "11:00", "end_time": "12:00"},
                {"date": "2030-12-26", "start_time": "11:00", "end_time": "12:00"},
            ],
            hourly_rate=15000,
            total_amount=30000,
            payment_reference="SP-WEBHOOK-123",
            payment_status="pending",
            status="pending_payment",
        )
        mock_verify.return_value = {
            "success": True,
            "data": {
                "status": "success",
                "amount": 3000000,  # 30000 NGN in kobo
                "reference": "SP-WEBHOOK-123",
            },
        }

        payload = {
            "event": "charge.success",
            "data": {"reference": "SP-WEBHOOK-123", "status": "success"},
        }
        body = json.dumps(payload).encode("utf-8")
        response = self.client.post(
            reverse("payments:paystack_webhook"),
            data=body,
            content_type="application/json",
            HTTP_X_PAYSTACK_SIGNATURE=self._signature(body),
        )
        self.assertEqual(response.status_code, 200)
        booking.refresh_from_db()
        self.assertEqual(booking.status, "confirmed")
        self.assertEqual(booking.payment_status, "paid")
        self.assertIsNotNone(booking.payment_date)


class SpecialBookingPaymentCallbackTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="specialcallback@example.com",
            username="specialcallbackuser",
            password="testpass123",
        )
        from scheduling.models import SpecialBooking, Coach
        self.coach = Coach.objects.create(name="Special Coach", email="specialcoach@example.com")
        self.booking = SpecialBooking.objects.create(
            coach=self.coach,
            student=self.user,
            student_name="Special Student",
            student_email="specialcallback@example.com",
            total_sessions=1,
            session_dates=[{"date": "2030-12-25", "start_time": "11:00", "end_time": "12:00"}],
            hourly_rate=15000,
            total_amount=15000,
            payment_reference="SP-CALLBACK-123",
            payment_status="pending",
            status="pending_payment",
        )

    @patch("payments.views.verify_transaction")
    def test_special_booking_callback_confirms_on_success(self, mock_verify):
        mock_verify.return_value = {
            "success": True,
            "status": "success",
            "reference": "SP-CALLBACK-123",
        }
        self.client.force_login(self.user)
        response = self.client.get(
            reverse("payments:special_booking_callback"),
            {"reference": "SP-CALLBACK-123"},
        )
        self.assertEqual(response.status_code, 302)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "confirmed")
        self.assertEqual(self.booking.payment_status, "paid")
        self.assertIsNotNone(self.booking.payment_date)
        self.assertEqual(len(mail.outbox), 2)
        subjects = [m.subject for m in mail.outbox]
        self.assertIn("Payment Received! Your Special Coaching is Confirmed", subjects)
        self.assertIn(f"Special Booking Confirmed - {self.booking.student_name}", subjects)

    @patch("payments.views.verify_transaction")
    def test_special_booking_callback_shows_error_on_failure(self, mock_verify):
        mock_verify.return_value = {
            "success": True,
            "status": "failed",
            "reference": "SP-CALLBACK-123",
        }
        self.client.force_login(self.user)
        response = self.client.get(
            reverse("payments:special_booking_callback"),
            {"reference": "SP-CALLBACK-123"},
        )
        self.assertEqual(response.status_code, 302)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "pending_payment")
        self.assertEqual(self.booking.payment_status, "pending")


class PointsServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="service@example.com",
            username="serviceuser",
            password="testpass123",
        )

    def test_add_points_increases_balance(self):
        add_points(self.user, 10, payment_reference="TEST-ADD")
        self.assertEqual(get_balance(self.user), 10)
        points = UserPoints.objects.get(user=self.user)
        self.assertEqual(points.total_purchased, 10)
        self.assertIsNotNone(points.expires_at)

    def test_use_points_decreases_balance(self):
        add_points(self.user, 10)
        use_points(self.user, 3, description="Used for booking")
        self.assertEqual(get_balance(self.user), 7)
        tx = PointTransaction.objects.filter(type="usage").first()
        self.assertEqual(tx.amount, -3)
        self.assertEqual(tx.balance_after, 7)

    def test_use_points_raises_when_insufficient(self):
        add_points(self.user, 2)
        with self.assertRaises(ValueError):
            use_points(self.user, 5)


class PointsAdminApproveTests(TestCase):
    def setUp(self):
        self.admin_user = User.objects.create_superuser(
            email="admin@example.com",
            username="adminuser",
            password="adminpass123",
        )
        self.student = User.objects.create_user(
            email="student@example.com",
            username="studentuser",
            password="testpass123",
        )
        self.tx = PointTransaction.objects.create(
            user=self.student,
            type="purchase",
            amount=8,
            balance_after=0,
            payment_reference="PTS-TEST-123",
            description="Test purchase",
            status="pending",
        )

    def test_admin_approve_purchase_credits_points(self):
        self.client.force_login(self.admin_user)
        response = self.client.post(
            "/admin/payments/pointtransaction/",
            {
                "action": "approve_purchases",
                "_selected_action": [str(self.tx.id)],
            },
        )
        self.assertEqual(response.status_code, 302)

        self.tx.refresh_from_db()
        self.assertEqual(self.tx.status, "completed")

        points = UserPoints.objects.get(user=self.student)
        self.assertEqual(points.balance, 8)
        self.assertEqual(points.total_purchased, 8)

    def test_admin_approve_skips_non_pending(self):
        self.tx.status = "completed"
        self.tx.save()
        self.client.force_login(self.admin_user)
        response = self.client.post(
            "/admin/payments/pointtransaction/",
            {
                "action": "approve_purchases",
                "_selected_action": [str(self.tx.id)],
            },
        )
        self.assertEqual(response.status_code, 302)
        self.assertFalse(UserPoints.objects.filter(user=self.student).exists())


class PointsAdminPageTests(TestCase):
    def setUp(self):
        self.admin_user = User.objects.create_superuser(
            email="adminpage@example.com",
            username="adminpageuser",
            password="adminpass123",
        )
        self.student = User.objects.create_user(
            email="studentpage@example.com",
            username="studentpageuser",
            password="testpass123",
        )
        self.tx = PointTransaction.objects.create(
            user=self.student,
            type="purchase",
            amount=5,
            balance_after=0,
            payment_reference="PTS-PAGE-123",
            description="Test pending purchase",
            status="pending",
        )

    def test_points_admin_requires_superuser(self):
        self.client.force_login(self.student)
        response = self.client.get(reverse("payments:points_admin"))
        self.assertEqual(response.status_code, 302)

    def test_points_admin_renders_for_superuser(self):
        self.client.force_login(self.admin_user)
        response = self.client.get(reverse("payments:points_admin"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "payments/points_admin.html")
        self.assertContains(response, "PTS-PAGE-123")

    def test_points_admin_approves_pending_transaction(self):
        self.client.force_login(self.admin_user)
        response = self.client.post(
            reverse("payments:points_admin"),
            {"action": "approve_pending", "tx_id": str(self.tx.id)},
        )
        self.assertEqual(response.status_code, 302)
        self.tx.refresh_from_db()
        self.assertEqual(self.tx.status, "completed")
        points = UserPoints.objects.get(user=self.student)
        self.assertEqual(points.balance, 5)

    def test_points_admin_rejects_pending_transaction(self):
        self.client.force_login(self.admin_user)
        response = self.client.post(
            reverse("payments:points_admin"),
            {"action": "reject_pending", "tx_id": str(self.tx.id)},
        )
        self.assertEqual(response.status_code, 302)
        self.tx.refresh_from_db()
        self.assertEqual(self.tx.status, "rejected")

    def test_points_admin_awards_points(self):
        self.client.force_login(self.admin_user)
        response = self.client.post(
            reverse("payments:points_admin"),
            {
                "action": "award_points",
                "user_id": str(self.student.id),
                "amount": "10",
                "reason": "Manual bonus",
                "reference": "BONUS-1",
            },
        )
        self.assertEqual(response.status_code, 302)
        points = UserPoints.objects.get(user=self.student)
        self.assertEqual(points.balance, 10)
        tx = PointTransaction.objects.filter(type="purchase", amount=10).first()
        self.assertIsNotNone(tx)
        self.assertEqual(tx.status, "completed")

    def test_points_admin_search_finds_user(self):
        self.client.force_login(self.admin_user)
        response = self.client.get(
            reverse("payments:points_admin"),
            {"q": "studentpage@example.com"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "studentpage@example.com")


class PaystackServiceTests(TestCase):
    @patch("payments.paystack_service.requests.post")
    @patch("payments.paystack_service.settings.PAYSTACK_SECRET_KEY", "sk_test_123")
    def test_initialize_transaction_returns_url_on_success(self, mock_post):
        mock_post.return_value.json.return_value = {
            "status": True,
            "message": "Authorization URL created",
            "data": {
                "authorization_url": "https://checkout.paystack.com/test",
                "reference": "PTS-123",
            },
        }
        mock_post.return_value.raise_for_status = lambda: None

        from payments.paystack_service import initialize_transaction
        result = initialize_transaction("test@example.com", 100000, "PTS-123")
        self.assertTrue(result["success"])
        self.assertEqual(result["authorization_url"], "https://checkout.paystack.com/test")
        self.assertEqual(result["reference"], "PTS-123")

    @patch("payments.paystack_service.requests.post")
    @patch("payments.paystack_service.settings.PAYSTACK_SECRET_KEY", "sk_test_123")
    def test_initialize_transaction_returns_error_on_failure(self, mock_post):
        from requests import HTTPError
        mock_response = mock_post.return_value
        mock_response.raise_for_status.side_effect = HTTPError("401 Unauthorized")
        mock_response.json.return_value = {"message": "Invalid key"}

        from payments.paystack_service import initialize_transaction
        result = initialize_transaction("test@example.com", 100000, "PTS-123")
        self.assertFalse(result["success"])
        self.assertIn("Invalid key", result["message"])

    @patch("payments.paystack_service.requests.get")
    @patch("payments.paystack_service.settings.PAYSTACK_SECRET_KEY", "sk_test_123")
    def test_verify_transaction_returns_status_on_success(self, mock_get):
        mock_get.return_value.json.return_value = {
            "status": True,
            "message": "Verification successful",
            "data": {
                "status": "success",
                "amount": 100000,
                "reference": "PTS-123",
                "customer": {"email": "test@example.com"},
            },
        }
        mock_get.return_value.raise_for_status = lambda: None

        from payments.paystack_service import verify_transaction
        result = verify_transaction("PTS-123")
        self.assertTrue(result["success"])
        self.assertEqual(result["status"], "success")
