from django.urls import path

from .views import TeamSubscribeView, TeamUnsubscribeView

urlpatterns = [
    path('team-alerts/subscribe/', TeamSubscribeView.as_view(), name='team-alerts-subscribe'),
    path('team-alerts/unsubscribe/', TeamUnsubscribeView.as_view(), name='team-alerts-unsubscribe'),
]
