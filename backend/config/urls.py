"""
URL configuration for config project.

  /admin/   Django admin — everything staff edit: currency rates, converter
            settings, testimonials, FAQs, FAQ categories.
  /api/     Read-only JSON consumed by the React frontend.
"""
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('rates.urls')),
    path('api/', include('content.urls')),
    path('api/', include('feature_flags.urls')),
    path('api/', include('telegram_alerts.urls')),
]
