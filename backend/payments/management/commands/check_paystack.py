import requests
from django.core.management.base import BaseCommand
from django.conf import settings


class Command(BaseCommand):
    help = "Verify Paystack configuration and key validity."

    def handle(self, *args, **options):
        secret_key = settings.PAYSTACK_SECRET_KEY
        public_key = settings.PAYSTACK_PUBLIC_KEY

        if not secret_key:
            self.stdout.write(self.style.ERROR("PAYSTACK_SECRET_KEY is not set."))
            return

        if not public_key:
            self.stdout.write(self.style.WARNING("PAYSTACK_PUBLIC_KEY is not set."))

        self.stdout.write(f"Secret key loaded: {secret_key[:8]}...{secret_key[-4:]}")
        self.stdout.write(f"Public key loaded: {public_key[:8]}...{public_key[-4:]}")

        url = "https://api.paystack.co/bank"
        try:
            response = requests.get(
                url,
                headers={
                    "Authorization": f"Bearer {secret_key}",
                },
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()
            if data.get("status"):
                self.stdout.write(self.style.SUCCESS("Paystack secret key is valid."))
            else:
                self.stdout.write(self.style.ERROR(f"Paystack returned: {data.get('message')}"))
        except requests.HTTPError as e:
            self.stdout.write(self.style.ERROR(f"Paystack key is invalid or request failed: {e}"))
        except requests.RequestException as e:
            self.stdout.write(self.style.ERROR(f"Network error: {e}"))
