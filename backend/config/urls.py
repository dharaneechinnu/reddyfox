"""
URL configuration for config project.

  /admin/   Django admin — everything staff edit: currency rates, converter
            settings, testimonials, FAQs, FAQ categories and rate-alert
            push notifications.
  /api/     Read-only JSON consumed by the React frontend.
"""
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('rates.urls')),
    path('api/', include('content.urls')),
    path('api/', include('notifications.urls')),
    path('api/', include('feature_flags.urls')),
]
