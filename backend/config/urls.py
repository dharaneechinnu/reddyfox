"""
URL configuration for config project.

  /admin/   Django admin — everything staff edit: currency rates, converter
            settings, testimonials, FAQs, FAQ categories.
  /api/     Read-only JSON consumed by the React frontend.
  /media/   Staff-uploaded photos (content.models.SiteImage). Served by
            Django itself at any traffic level this single-shop site sees —
            see the MEDIA_ROOT/MEDIA_URL comment in settings.py for why
            that's a deliberate choice, not an oversight, and what it
            requires from the Render deploy (a persistent disk).
"""
from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from django.views.static import serve

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('rates.urls')),
    path('api/', include('content.urls')),
    path('api/', include('feature_flags.urls')),
    path('api/', include('telegram_alerts.urls')),
    path('api/', include('theming.urls')),
    path(
        f"{settings.MEDIA_URL.lstrip('/')}<path:path>",
        serve,
        {'document_root': settings.MEDIA_ROOT},
    ),
]
