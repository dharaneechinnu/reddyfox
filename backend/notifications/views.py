from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from .models import PushSubscriber
from .serializers import PushSubscriberSerializer


class NotificationSubscribeThrottle(AnonRateThrottle):
    """Separate throttle scope, same idea as EnquiryRateThrottle — a token
    replay storm can't eat into the rest of the site's rate limit budget."""
    scope = 'notification-subscribe'


class SubscribeView(generics.CreateAPIView):
    """Public endpoint the browser calls once it has an FCM token, to
    register (or re-confirm) this customer for rate alert push notifications.

    Idempotent on fcm_token: re-subscribing an existing, deactivated token
    reactivates it instead of erroring or creating a duplicate row.
    """

    serializer_class = PushSubscriberSerializer
    throttle_classes = [NotificationSubscribeThrottle]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        PushSubscriber.objects.update_or_create(
            fcm_token=serializer.validated_data['fcm_token'],
            defaults={
                'user_agent': serializer.validated_data.get('user_agent', '')[:255],
                'is_active': True,
                'failure_count': 0,
            },
        )
        return Response({'detail': 'Subscribed to rate alerts.'}, status=status.HTTP_201_CREATED)


class UnsubscribeView(APIView):
    """Public opt-out endpoint. Marks the token inactive rather than deleting
    it, so its delivery history stays intact in the admin."""

    throttle_classes = [NotificationSubscribeThrottle]

    def post(self, request, *args, **kwargs):
        token = (request.data.get('fcm_token') or '').strip()
        if not token:
            return Response({'detail': 'fcm_token is required.'}, status=status.HTTP_400_BAD_REQUEST)
        PushSubscriber.objects.filter(fcm_token=token).update(is_active=False)
        return Response({'detail': 'Unsubscribed.'})
