import secrets

from django.conf import settings
from django.db import models
from django.utils import timezone


def _generate_token():
    # url-safe, unguessable — this is the only thing the QR code / deep link carries, so it must
    # never be predictable. 16 bytes -> ~22 url-safe characters.
    return secrets.token_urlsafe(16)


def _default_expiry():
    hours = getattr(settings, 'TELEGRAM_INVITE_EXPIRY_HOURS', 24)
    return timezone.now() + timezone.timedelta(hours=hours)


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


class TelegramInvite(models.Model):
    """A one-time, expiring QR/deep-link invite an admin generates for one staff member.

    This is the v2 onboarding path (see docs/telegram-bot.md): an admin creates one of these
    (label only — everything else is generated), gets back a QR code encoding a Telegram deep
    link `https://t.me/<bot>?start=<token>`. The staff member scans it, taps Start, and the
    production webhook (telegram_alerts/views.py) turns that into a TelegramSubscriber row
    automatically — no manual chat_id lookup.

    The admin still creates the invite in the first place, so this doesn't loosen the
    authorization model at all (see TelegramSubscriber's docstring) — it only replaces the
    *identity-proving* step with something faster than grepping `getUpdates`.
    """

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending — not yet scanned'
        CLAIMED = 'claimed', 'Claimed'
        EXPIRED = 'expired', 'Expired'
        REVOKED = 'revoked', 'Revoked'

    token = models.CharField(max_length=64, unique=True, default=_generate_token, editable=False)
    label = models.CharField(max_length=100, help_text="Who this invite is for, e.g. \"Ravi — counter\". Becomes the subscriber's name once claimed.")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING, db_index=True)
    expires_at = models.DateTimeField(default=_default_expiry)
    claimed_by = models.OneToOneField(
        TelegramSubscriber, null=True, blank=True, on_delete=models.SET_NULL, related_name='claimed_invite',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.label} ({self.get_status_display()})'

    @property
    def is_expired(self):
        return self.status == self.Status.PENDING and timezone.now() > self.expires_at

    @property
    def is_claimable(self):
        """The one check the webhook actually relies on — a fresh call each time, never cached,
        so a token that expires mid-request is never accidentally claimed."""
        return self.status == self.Status.PENDING and timezone.now() <= self.expires_at

    @property
    def deep_link(self):
        bot_username = getattr(settings, 'TELEGRAM_BOT_USERNAME', '')
        if not bot_username:
            return None
        return f'https://t.me/{bot_username}?start={self.token}'


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
