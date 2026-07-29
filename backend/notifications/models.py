from django.db import models
from django.db.models import Case, Value, When


class PushSubscriber(models.Model):
    """A browser that opted in to Chrome push notifications for rate alerts.

    One row per FCM registration token. Re-subscribing an existing token
    (e.g. the customer revisits the site) just refreshes it — see
    notifications.views.SubscribeView.
    """

    fcm_token = models.TextField(unique=True, help_text='FCM registration token issued to the customer’s browser.')
    user_agent = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(
        default=True, db_index=True,
        help_text='Turned off automatically once FCM reports this token as no longer registered.',
    )
    failure_count = models.PositiveIntegerField(default=0, help_text='Consecutive failed sends. Reset on the next success.')
    created_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField(auto_now=True, help_text='Updated every time the browser re-registers this token.')
    last_notified_at = models.DateTimeField(
        null=True, blank=True,
        help_text='Used for the per-customer rate limit on Normal priority alerts. Urgent alerts ignore it.',
    )

    class Meta:
        ordering = ['-last_seen_at']

    def __str__(self):
        return f'{self.masked_token} ({"active" if self.is_active else "inactive"})'

    @property
    def masked_token(self):
        if len(self.fcm_token) <= 20:
            return self.fcm_token
        return f'{self.fcm_token[:10]}…{self.fcm_token[-6:]}'


class Notification(models.Model):
    """One rate-alert broadcast — either raised automatically when a
    currency's buy/sell rate changes (see notifications/signals.py) or
    created by staff in the admin and sent with the 'Send now' action.
    """

    class Priority(models.TextChoices):
        NORMAL = 'normal', 'Normal'
        URGENT = 'urgent', 'Urgent'

    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        SENT = 'sent', 'Sent'
        FAILED = 'failed', 'Failed'

    title = models.CharField(max_length=120)
    body = models.CharField(max_length=255)
    currency = models.ForeignKey(
        'rates.Currency', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='rate_alerts', help_text='Set automatically for rate-change alerts. Optional otherwise.',
    )
    priority = models.CharField(
        max_length=10, choices=Priority.choices, default=Priority.NORMAL, db_index=True,
        help_text='Urgent alerts bypass the per-customer rate limit and are sent at high FCM/webpush priority.',
    )
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT, db_index=True)
    created_by = models.ForeignKey(
        'auth.User', null=True, blank=True, on_delete=models.SET_NULL,
        help_text='Blank for alerts generated automatically from a rate change.',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    # Tallies updated by notifications.services.send_notification — the
    # at-a-glance success/fail counters shown in the admin list.
    target_count = models.PositiveIntegerField(default=0, help_text='Subscribers this alert was attempted against.')
    success_count = models.PositiveIntegerField(default=0)
    fail_count = models.PositiveIntegerField(default=0)
    skipped_count = models.PositiveIntegerField(
        default=0, help_text='Subscribers skipped by the per-customer rate limit (Normal priority only).',
    )

    class Meta:
        ordering = [
            Case(When(priority='urgent', then=Value(0)), default=Value(1), output_field=models.IntegerField()),
            '-created_at',
        ]

    def __str__(self):
        return f'[{self.get_priority_display()}] {self.title}'


class NotificationDelivery(models.Model):
    """One send attempt of a Notification to one PushSubscriber — the
    per-customer audit trail of success/fail/skip that the team reviews in
    the Django admin.
    """

    class Status(models.TextChoices):
        SUCCESS = 'success', 'Success'
        FAILED = 'failed', 'Failed'
        SKIPPED = 'skipped', 'Skipped (rate limit)'

    notification = models.ForeignKey(Notification, on_delete=models.CASCADE, related_name='deliveries')
    subscriber = models.ForeignKey(PushSubscriber, on_delete=models.CASCADE, related_name='deliveries')
    status = models.CharField(max_length=10, choices=Status.choices, db_index=True)
    fcm_message_id = models.CharField(max_length=255, blank=True)
    error_message = models.CharField(max_length=500, blank=True)
    attempted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-attempted_at']
        verbose_name_plural = 'notification deliveries'
        constraints = [
            models.UniqueConstraint(fields=['notification', 'subscriber'], name='unique_delivery_per_subscriber'),
        ]
        indexes = [models.Index(fields=['status', '-attempted_at'])]

    def __str__(self):
        return f'#{self.notification_id} → subscriber #{self.subscriber_id}: {self.status}'
