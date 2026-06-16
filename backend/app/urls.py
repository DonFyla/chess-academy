"""
URL configuration for app project.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),
    path("ckeditor/", include("ckeditor_uploader.urls")),
    path("", include("web.urls")),
    path("accounts/", include("accounts.urls")),
    path("quiz/", include("quiz.urls")),
    path("scheduling/", include("scheduling.urls")),
    path("payments/", include("payments.urls")),
    path("admin-portal/", include("admin_portal.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
