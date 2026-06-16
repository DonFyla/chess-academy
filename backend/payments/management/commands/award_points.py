from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from payments.models import PointTransaction
from payments.points_service import add_points

User = get_user_model()


class Command(BaseCommand):
    help = "Award points to a user and record it as a bonus transaction."

    def add_arguments(self, parser):
        parser.add_argument("email", type=str, help="Email of the user to award points to")
        parser.add_argument("amount", type=int, help="Number of points to award")
        parser.add_argument(
            "--reason",
            type=str,
            default="Manual award",
            help="Optional reason/description for the award",
        )
        parser.add_argument(
            "--reference",
            type=str,
            default="",
            help="Optional payment/reference code",
        )

    def handle(self, *args, **options):
        email = options["email"]
        amount = options["amount"]
        reason = options["reason"]
        reference = options["reference"]

        if amount <= 0:
            raise CommandError("Amount must be a positive integer.")

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise CommandError(f"User with email '{email}' not found.")

        points = add_points(
            user,
            amount,
            description=reason,
            payment_reference=reference,
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"Awarded {amount} points to {email}. New balance: {points.balance}"
            )
        )
