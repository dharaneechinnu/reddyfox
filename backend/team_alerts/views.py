import json

from django.conf import settings
from django.contrib.admin.views.decorators import staff_member_required
from django.http import HttpResponse
from django.shortcuts import render
from django.utils.decorators import method_decorator
from django.views import View
from rest_framework import generics, status
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import TeamPushSubscriber
from .serializers import TeamPushSubscriberSerializer


class TeamSubscribeView(generics.CreateAPIView):
    """Staff-only endpoint the admin's "Enable push alerts" page calls once
    it has an FCM token, to register (or re-confirm) this browser for
    internal push alerts.

    Idempotent on fcm_token: re-subscribing an existing, deactivated token
    reactivates it instead of erroring or creating a duplicate row.
    """

    serializer_class = TeamPushSubscriberSerializer
    permission_classes = [IsAdminUser]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        TeamPushSubscriber.objects.update_or_create(
            fcm_token=serializer.validated_data['fcm_token'],
            defaults={
                'user': request.user,
                'user_agent': serializer.validated_data.get('user_agent', '')[:255],
                'is_active': True,
                'failure_count': 0,
            },
        )
        return Response({'detail': 'Subscribed to team push alerts.'}, status=status.HTTP_201_CREATED)


class TeamUnsubscribeView(APIView):
    """Staff-only opt-out. Scoped to the requesting user's own token, so one
    staff member can't deactivate another's subscription. Marks the token
    inactive rather than deleting it, so its delivery history stays intact."""

    permission_classes = [IsAdminUser]

    def post(self, request, *args, **kwargs):
        token = (request.data.get('fcm_token') or '').strip()
        if not token:
            return Response({'detail': 'fcm_token is required.'}, status=status.HTTP_400_BAD_REQUEST)
        TeamPushSubscriber.objects.filter(fcm_token=token, user=request.user).update(is_active=False)
        return Response({'detail': 'Unsubscribed.'})


@method_decorator(staff_member_required, name='dispatch')
class EnableAlertsPageView(View):
    """Staff-only page, linked from the admin header, where a team member
    turns on push alerts for the browser they're using right now."""

    def get(self, request, *args, **kwargs):
        firebase_config = {
            'apiKey': getattr(settings, 'FIREBASE_WEB_API_KEY', ''),
            'authDomain': getattr(settings, 'FIREBASE_WEB_AUTH_DOMAIN', ''),
            'projectId': getattr(settings, 'FIREBASE_WEB_PROJECT_ID', ''),
            'storageBucket': getattr(settings, 'FIREBASE_WEB_STORAGE_BUCKET', ''),
            'messagingSenderId': getattr(settings, 'FIREBASE_WEB_MESSAGING_SENDER_ID', ''),
            'appId': getattr(settings, 'FIREBASE_WEB_APP_ID', ''),
        }
        context = {
            'title': 'Enable push alerts',
            'is_configured': bool(firebase_config['apiKey']),
            'firebase_config_json': json.dumps(firebase_config),
            'vapid_key_json': json.dumps(getattr(settings, 'FIREBASE_WEB_VAPID_KEY', '')),
            'subscribe_url': '/api/team-alerts/subscribe/',
            'unsubscribe_url': '/api/team-alerts/unsubscribe/',
        }
        return render(request, 'team_alerts/enable.html', context)


def service_worker(request):
    """Background push handler, served from the site root so its default
    scope covers /admin/. Not a Django template — the Firebase config values
    are safely embedded via json.dumps, and this view needs no auth since
    they're public client identifiers, not secrets."""
    firebase_config = {
        'apiKey': getattr(settings, 'FIREBASE_WEB_API_KEY', ''),
        'authDomain': getattr(settings, 'FIREBASE_WEB_AUTH_DOMAIN', ''),
        'projectId': getattr(settings, 'FIREBASE_WEB_PROJECT_ID', ''),
        'storageBucket': getattr(settings, 'FIREBASE_WEB_STORAGE_BUCKET', ''),
        'messagingSenderId': getattr(settings, 'FIREBASE_WEB_MESSAGING_SENDER_ID', ''),
        'appId': getattr(settings, 'FIREBASE_WEB_APP_ID', ''),
    }
    script = f"""\
importScripts('https://www.gstatic.com/firebasejs/12.16.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging-compat.js');

firebase.initializeApp({json.dumps(firebase_config)});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {{
  const {{ title, body }} = payload.notification || {{}};
  self.registration.showNotification(title || 'Reddy Forex — team alert', {{
    body: body || '',
  }});
}});
"""
    return HttpResponse(script, content_type='application/javascript')
