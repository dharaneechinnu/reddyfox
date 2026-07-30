from rest_framework import serializers

from .models import TeamPushSubscriber


class TeamPushSubscriberSerializer(serializers.ModelSerializer):
    # Declared explicitly to drop ModelSerializer's automatic UniqueValidator:
    # re-subscribing an existing token is the expected, idempotent case here
    # (see TeamSubscribeView.create's update_or_create), not a validation error.
    fcm_token = serializers.CharField()

    class Meta:
        model = TeamPushSubscriber
        fields = ['fcm_token', 'user_agent']

    def validate_fcm_token(self, value):
        value = value.strip()
        if len(value) < 20:
            raise serializers.ValidationError('This does not look like a valid FCM token.')
        return value
