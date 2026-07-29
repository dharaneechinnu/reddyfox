"""
FCM delivery for Chrome browser rate-alert push notifications.

Design rule mirrors content/notifications.py: the Notification row already
exists before this runs, and every failure here — a missing dependency, an
unconfigured service account, a rejected token, a network error — is caught
and recorded as a NotificationDelivery row rather than raised. A bad Firebase
credential must never crash a currency rate save in the admin.
"""
import logging

from django.conf import settings
from django.utils import timezone

from .models import Notification, NotificationDelivery, PushSubscriber

logger = logging.getLogger(__name__)


def _rate_limit_cutoff():
    minutes = getattr(settings, 'NOTIFICATION_RATE_LIMIT_MINUTES', 60)
    return timezone.now() - timezone.timedelta(minutes=minutes)


def _eligible_subscribers(notification):
    """Active subscribers for this send.

    Urgent priority is exempt from the per-customer rate limit ("urgent is
    free"); Normal priority skips anyone this alert would double up on within
    the rate-limit window. Returns (eligible, skipped) lists.
    """
    active = list(PushSubscriber.objects.filter(is_active=True))
    if notification.priority == Notification.Priority.URGENT:
        return active, []

    cutoff = _rate_limit_cutoff()
    eligible, skipped = [], []
    for subscriber in active:
        if subscriber.last_notified_at and subscriber.last_notified_at >= cutoff:
            skipped.append(subscriber)
        else:
            eligible.append(subscriber)
    return eligible, skipped


def _get_messaging():
    """Lazily configured firebase_admin.messaging module, or None.

    Returns None (after logging why) when firebase-admin isn't installed or
    no service account is configured, so the caller can record every send as
    a logged failure instead of raising.
    """
    try:
        import firebase_admin
        from firebase_admin import credentials, messaging
    except ImportError:
        logger.error('firebase-admin is not installed; cannot send push notifications.')
        return None

    cred_path = getattr(settings, 'FIREBASE_CREDENTIALS_JSON', '')
    if not cred_path:
        logger.info('FIREBASE_CREDENTIALS_JSON not configured; skipping push notification send.')
        return None

    if not firebase_admin._apps:
        try:
            firebase_admin.initialize_app(credentials.Certificate(cred_path))
        except Exception:
            logger.exception('Failed to initialise firebase-admin with FIREBASE_CREDENTIALS_JSON.')
            return None
    return messaging


def _record(notification, subscriber, status, **fields):
    NotificationDelivery.objects.update_or_create(
        notification=notification, subscriber=subscriber,
        defaults={'status': status, **fields},
    )


def _finish(notification, *, target_count, skipped_count, success_count, fail_count, status):
    notification.target_count = target_count
    notification.skipped_count = skipped_count
    notification.success_count = success_count
    notification.fail_count = fail_count
    notification.status = status
    notification.sent_at = timezone.now()
    notification.save(update_fields=[
        'target_count', 'skipped_count', 'success_count', 'fail_count', 'status', 'sent_at',
    ])
    logger.info(
        'Notification #%s (%s): %s ok, %s failed, %s skipped',
        notification.pk, notification.priority, success_count, fail_count, skipped_count,
    )
    return notification


def send_notification(notification):
    """Send `notification` to every eligible subscriber over FCM.

    Never raises. Always updates the notification's counters/status and
    writes one NotificationDelivery row per subscriber, so every success,
    failure and rate-limit skip is visible in the Django admin.
    """
    eligible, skipped = _eligible_subscribers(notification)
    for subscriber in skipped:
        _record(notification, subscriber, NotificationDelivery.Status.SKIPPED,
                error_message='Rate-limited (Normal priority, recently notified).')

    if not eligible:
        status = Notification.Status.SENT if skipped else Notification.Status.FAILED
        return _finish(notification, target_count=0, skipped_count=len(skipped),
                        success_count=0, fail_count=0, status=status)

    messaging = _get_messaging()
    if messaging is None:
        for subscriber in eligible:
            _record(notification, subscriber, NotificationDelivery.Status.FAILED,
                    error_message='FCM is not configured on this server.')
        return _finish(notification, target_count=len(eligible), skipped_count=len(skipped),
                        success_count=0, fail_count=len(eligible), status=Notification.Status.FAILED)

    is_urgent = notification.priority == Notification.Priority.URGENT
    messages = [
        messaging.Message(
            notification=messaging.Notification(title=notification.title, body=notification.body),
            token=subscriber.fcm_token,
            webpush=messaging.WebpushConfig(
                headers={'Urgency': 'high' if is_urgent else 'normal'},
            ),
            android=messaging.AndroidConfig(priority='high' if is_urgent else 'normal'),
        )
        for subscriber in eligible
    ]

    try:
        batch_response = messaging.send_each(messages)
        responses = batch_response.responses
    except Exception:
        logger.exception('FCM send_each failed for notification #%s', notification.pk)
        for subscriber in eligible:
            _record(notification, subscriber, NotificationDelivery.Status.FAILED,
                    error_message='FCM request failed — see server logs.')
        return _finish(notification, target_count=len(eligible), skipped_count=len(skipped),
                        success_count=0, fail_count=len(eligible), status=Notification.Status.FAILED)

    now = timezone.now()
    success = fail = 0
    for subscriber, response in zip(eligible, responses):
        if response.success:
            success += 1
            _record(notification, subscriber, NotificationDelivery.Status.SUCCESS,
                    fcm_message_id=response.message_id or '')
            subscriber.last_notified_at = now
            subscriber.failure_count = 0
            subscriber.save(update_fields=['last_notified_at', 'failure_count'])
        else:
            fail += 1
            error = str(response.exception) if response.exception else 'Unknown FCM error.'
            _record(notification, subscriber, NotificationDelivery.Status.FAILED, error_message=error[:500])
            subscriber.failure_count += 1
            update_fields = ['failure_count']
            # A dead/unregistered token wastes every future send — retire it.
            if subscriber.failure_count >= 3 or 'registration-token-not-registered' in error.lower():
                subscriber.is_active = False
                update_fields.append('is_active')
            subscriber.save(update_fields=update_fields)

    status = Notification.Status.SENT if success else Notification.Status.FAILED
    return _finish(notification, target_count=len(eligible), skipped_count=len(skipped),
                    success_count=success, fail_count=fail, status=status)


def notify_rate_change(currency, previous_buy, previous_sell):
    """Create and send a push notification for a currency rate change.

    Priority is Urgent when either buy or sell moved by at least
    RATE_ALERT_URGENT_THRESHOLD_PCT percent — those alerts skip the
    per-customer rate limit entirely. Smaller moves are Normal priority and
    respect it, so customers aren't spammed on every minor tick.
    """
    def pct_change(old, new):
        # Cast defensively: `new` is often a plain assignment on the model
        # instance (e.g. `currency.buy_rate = '83.50'` before .save()), which
        # Django does not coerce to Decimal until it round-trips the DB.
        old, new = float(old), float(new)
        if not old:
            return 0.0
        return abs((new - old) / old) * 100

    threshold = getattr(settings, 'RATE_ALERT_URGENT_THRESHOLD_PCT', 1.0)
    biggest_move = max(pct_change(previous_buy, currency.buy_rate), pct_change(previous_sell, currency.sell_rate))
    priority = Notification.Priority.URGENT if biggest_move >= threshold else Notification.Priority.NORMAL
    direction = 'up' if float(currency.sell_rate) >= float(previous_sell) else 'down'

    notification = Notification.objects.create(
        title=f'{currency.code} rate {"alert" if priority == Notification.Priority.URGENT else "update"}',
        body=f'{currency.code} is now buy ₹{currency.buy_rate} / sell ₹{currency.sell_rate} ({direction} {biggest_move:.2f}%).',
        currency=currency,
        priority=priority,
    )
    return send_notification(notification)
