from django.db import models


class TelegramSubscriber(models.Model):
    """A staff member's Telegram chat, approved to receive new-lead alerts.

    Onboarding today is manual (v1): the staff member sends any message to the bot, which logs
    their chat_id (see docs/telegram-bot.md); an admin looks that up and creates this row. There
    is no separate "pending" state — creating the row here *is* the approval. `is_active` is the
    ongoing on/off switch: untick it any time to stop alerting someone without losing their
    record, no code change or redeploy needed.
    """

    name = models.CharField(max_length=100, help_text="Staff member's name, for your own reference.")
    chat_id = models.CharField(
        max_length=32, unique=True,
        help_text='Telegram chat ID. Have the staff member message the bot once, then find their '
                   'chat_id via the bot\'s recent updates — see docs/telegram-bot.md for the exact steps.',
    )
    is_active = models.BooleanField(
        default=True,
        help_text='Untick to stop sending this person alerts, without deleting their record.',
    )
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f'{self.name} ({self.chat_id})' + ('' if self.is_active else ' — inactive')


class TelegramDelivery(models.Model):
    """One send attempt of a lead alert to one subscriber — the audit trail, same shape as
    notifications.NotificationDelivery (the Chrome push equivalent)."""

    class Status(models.TextChoices):
        SUCCESS = 'success', 'Success'
        FAILED = 'failed', 'Failed'

    lead = models.ForeignKey('content.Lead', on_delete=models.CASCADE, related_name='telegram_deliveries')
    subscriber = models.ForeignKey(TelegramSubscriber, on_delete=models.CASCADE, related_name='deliveries')
    status = models.CharField(max_length=10, choices=Status.choices, db_index=True)
    error_message = models.CharField(max_length=500, blank=True)
    attempted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-attempted_at']
        verbose_name_plural = 'telegram deliveries'
        constraints = [
            models.UniqueConstraint(fields=['lead', 'subscriber'], name='unique_telegram_delivery_per_subscriber'),
        ]
        indexes = [models.Index(fields=['status', '-attempted_at'])]

    def __str__(self):
        return f'Lead #{self.lead_id} → {self.subscriber_id}: {self.status}'
