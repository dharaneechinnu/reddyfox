"""
URL configuration for config project.

  /admin/                        Django admin — everything staff edit:
                                  currency rates, converter settings,
                                  testimonials, FAQs, FAQ categories and
                                  leads (enquiries/quotes/rate locks).
  /admin/team-alerts/enable/     Staff-only page to turn on Chrome push
                                  alerts for the current browser.
  /api/                          Read-only JSON consumed by the React
                                  frontend, plus the lead-capture and
                                  team-alerts-subscribe endpoints.
  /firebase-messaging-sw.js      Background push service worker for the
                                  team alerts feature, served at the site
                                  root so its scope covers /admin/.

Note: the team-alerts admin page must be registered *before*
`admin/site.urls` — Django's resolver only descends into admin.site.urls
once the `admin/` prefix matches, so anything under `admin/` not listed
here first would 404 inside the admin's own URLconf instead of falling
through.
"""
from django.contrib import admin
from django.urls import include, path

from team_alerts.views import EnableAlertsPageView, service_worker

urlpatterns = [
    path('firebase-messaging-sw.js', service_worker, name='team-alerts-sw'),
    path('admin/team-alerts/enable/', EnableAlertsPageView.as_view(), name='team-alerts-enable'),
    path('admin/', admin.site.urls),
    path('api/', include('rates.urls')),
    path('api/', include('content.urls')),
    path('api/', include('team_alerts.urls')),
]
