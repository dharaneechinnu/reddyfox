from django.urls import path

from .views import SubscribeView, UnsubscribeView

urlpatterns = [
    path('notifications/subscribe/', SubscribeView.as_view(), name='notification-subscribe'),
    path('notifications/unsubscribe/', UnsubscribeView.as_view(), name='notification-unsubscribe'),
]
