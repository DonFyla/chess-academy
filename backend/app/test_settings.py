from .settings import *  # noqa: F401,F403

# Use local-memory cache for tests so Redis is not required.
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}

ALLOWED_HOSTS = ["*"]
