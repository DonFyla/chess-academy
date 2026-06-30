import logging
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


def _send_email(subject, to_emails, template_name, context, from_email=None):
    """Render an HTML email template and send to the given recipients."""
    if not to_emails:
        return

    # Normalize to list
    if isinstance(to_emails, str):
        to_emails = [to_emails]
    to_emails = [e for e in to_emails if e]
    if not to_emails:
        return

    from_email = from_email or settings.DEFAULT_FROM_EMAIL
    context.setdefault("site_url", "https://www.themovingtrain.org")

    try:
        html_body = render_to_string(template_name, context)
        text_body = strip_tags(html_body)
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=from_email,
            to=to_emails,
        )
        msg.attach_alternative(html_body, "text/html")
        msg.send()
    except Exception:
        logger.exception("Failed to send email: %s", subject)


def send_recurring_booking_created(booking):
    """Notify student and coach when a recurring booking is created (pending payment)."""
    context = {
        "booking": booking,
        "student": booking.student_name,
        "coach": booking.coach,
    }

    _send_email(
        subject="Your Booking is Reserved! Complete Payment to Confirm",
        to_emails=booking.student_email,
        template_name="emails/booking/recurring_created_student.html",
        context=context,
    )

    if booking.coach.email:
        _send_email(
            subject=f"New Booking - {booking.student_name} (Pending Payment)",
            to_emails=booking.coach.email,
            template_name="emails/booking/recurring_created_coach.html",
            context=context,
        )


def send_recurring_booking_confirmed(booking):
    """Notify student and coach when a recurring booking is paid/confirmed."""
    context = {
        "booking": booking,
        "student": booking.student_name,
        "coach": booking.coach,
    }

    _send_email(
        subject="Payment Received! Your Lessons Are Confirmed",
        to_emails=booking.student_email,
        template_name="emails/booking/recurring_confirmed_student.html",
        context=context,
    )

    if booking.coach.email:
        _send_email(
            subject=f"Booking Confirmed - {booking.student_name}",
            to_emails=booking.coach.email,
            template_name="emails/booking/recurring_confirmed_coach.html",
            context=context,
        )


def send_recurring_booking_cancelled(booking):
    """Notify student and coach when a recurring booking is cancelled or rejected."""
    context = {
        "booking": booking,
        "student": booking.student_name,
        "coach": booking.coach,
    }

    _send_email(
        subject="Your Booking Has Been Cancelled",
        to_emails=booking.student_email,
        template_name="emails/booking/recurring_cancelled_student.html",
        context=context,
    )

    if booking.coach.email:
        _send_email(
            subject=f"Booking Cancelled - {booking.student_name}",
            to_emails=booking.coach.email,
            template_name="emails/booking/recurring_cancelled_coach.html",
            context=context,
        )


def send_flexible_booking_created(booking):
    """Notify student and coach when a points-based flexible booking is created."""
    context = {
        "booking": booking,
        "student": booking.user,
        "coach": booking.coach,
    }

    _send_email(
        subject="Your Session Has Been Booked",
        to_emails=booking.user.email,
        template_name="emails/booking/flexible_created_student.html",
        context=context,
    )

    if booking.coach.email:
        _send_email(
            subject=f"New Session Booking - {booking.user.full_name or booking.user.email}",
            to_emails=booking.coach.email,
            template_name="emails/booking/flexible_created_coach.html",
            context=context,
        )


def send_special_booking_created(booking):
    """Notify student and coach when a special booking is created (pending payment)."""
    context = {
        "booking": booking,
        "student": booking.student_name,
        "coach": booking.coach,
    }

    _send_email(
        subject="Your Special Coaching Booking is Reserved! Complete Payment to Confirm",
        to_emails=booking.student_email,
        template_name="emails/booking/special_created_student.html",
        context=context,
    )

    if booking.coach.email:
        _send_email(
            subject=f"New Special Booking - {booking.student_name} (Pending Payment)",
            to_emails=booking.coach.email,
            template_name="emails/booking/special_created_coach.html",
            context=context,
        )


def send_special_booking_confirmed(booking):
    """Notify student and coach when a special booking is paid/confirmed."""
    context = {
        "booking": booking,
        "student": booking.student_name,
        "coach": booking.coach,
    }

    _send_email(
        subject="Payment Received! Your Special Coaching is Confirmed",
        to_emails=booking.student_email,
        template_name="emails/booking/special_confirmed_student.html",
        context=context,
    )

    if booking.coach.email:
        _send_email(
            subject=f"Special Booking Confirmed - {booking.student_name}",
            to_emails=booking.coach.email,
            template_name="emails/booking/special_confirmed_coach.html",
            context=context,
        )


def send_special_booking_cancelled(booking):
    """Notify student and coach when a special booking is cancelled."""
    context = {
        "booking": booking,
        "student": booking.student_name,
        "coach": booking.coach,
    }

    _send_email(
        subject="Your Special Coaching Booking Has Been Cancelled",
        to_emails=booking.student_email,
        template_name="emails/booking/special_cancelled_student.html",
        context=context,
    )

    if booking.coach.email:
        _send_email(
            subject=f"Special Booking Cancelled - {booking.student_name}",
            to_emails=booking.coach.email,
            template_name="emails/booking/special_cancelled_coach.html",
            context=context,
        )
