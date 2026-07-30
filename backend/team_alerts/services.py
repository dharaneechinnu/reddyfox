"""
FCM delivery for internal Chrome push alerts (staff only).

Design rule mirrors content/notifications.py: the TeamAlert row already
exists before this runs, and every failure here — a missing dependency, an
unconfigured service account, a rejected token, a network error — is caught
and recorded as a TeamAlertDelivery row rather than raised. A bad Firebase
credential must never crash an enquiry submission.
"""
import logging

from django.conf import settings
from django.utils import timezone

from .models import TeamAlert, TeamAlertDelivery, TeamPushSubscriber

logger = logging.getLogger(__name__)


def _rate_limit_cutoff():
    minutes = getattr(settings, 'TEAM_ALERT_RATE_LIMIT_MINUTES', 30)
    return timezone.now() - timezone.timedelta(minutes=minutes)


def _eligible_subscribers(alert):
    """Active staff subscribers for this send.

    Urgent priority (every auto-raised new-enquiry alert) is exempt from the
    per-staff-member rate limit — a fresh lead must never be missed. Normal
    priority (staff-authored broadcasts) skips anyone this alert would
    double up on within the rate-limit window. Returns (eligible, skipped).
    """
    active = list(TeamPushSubscriber.objects.filter(is_active=True))
    if alert.priority == TeamAlert.Priority.URGENT:
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
        logger.error('firebase-admin is not installed; cannot send team push alerts.')
        return None

    cred_path = getattr(settings, 'FIREBASE_CREDENTIALS_JSON', '')
    if not cred_path:
        logger.info('FIREBASE_CREDENTIALS_JSON not configured; skipping team push alert send.')
        return None

    if not firebase_admin._apps:
        try:
            firebase_admin.initialize_app(credentials.Certificate(cred_path))
        except Exception:
            logger.exception('Failed to initialise firebase-admin with FIREBASE_CREDENTIALS_JSON.')
            return None
    return messaging


def _record(alert, subscriber, status, **fields):
    TeamAlertDelivery.objects.update_or_create(
        alert=alert, subscriber=subscriber,
        defaults={'status': status, **fields},
    )


def _finish(alert, *, target_count, skipped_count, success_count, fail_count, status):
    alert.target_count = target_count
    alert.skipped_count = skipped_count
    alert.success_count = success_count
    alert.fail_count = fail_count
    alert.status = status
    alert.sent_at = timezone.now()
    alert.save(update_fields=[
        'target_count', 'skipped_count', 'success_count', 'fail_count', 'status', 'sent_at',
    ])
    logger.info(
        'TeamAlert #%s (%s): %s ok, %s failed, %s skipped',
        alert.pk, alert.priority, success_count, fail_count, skipped_count,
    )
    return alert


def send_team_alert(alert):
    """Send `alert` to every eligible staff subscriber over FCM.

    Never raises. Always updates the alert's counters/status and writes one
    TeamAlertDelivery row per subscriber, so every success, failure and
    rate-limit skip is visible in the Django admin.
    """
    eligible, skipped = _eligible_subscribers(alert)
    for subscriber in skipped:
        _record(alert, subscriber, TeamAlertDelivery.Status.SKIPPED,
                error_message='Rate-limited (Normal priority, recently notified).')

    if not eligible:
        status = TeamAlert.Status.SENT if skipped else TeamAlert.Status.FAILED
        return _finish(alert, target_count=0, skipped_count=len(skipped),
                        success_count=0, fail_count=0, status=status)

    messaging = _get_messaging()
    if messaging is None:
        for subscriber in eligible:
            _record(alert, subscriber, TeamAlertDelivery.Status.FAILED,
                    error_message='FCM is not configured on this server.')
        return _finish(alert, target_count=len(eligible), skipped_count=len(skipped),
                        success_count=0, fail_count=len(eligible), status=TeamAlert.Status.FAILED)

    is_urgent = alert.priority == TeamAlert.Priority.URGENT
    messages = [
        messaging.Message(
            notification=messaging.Notification(title=alert.title, body=alert.body),
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
        logger.exception('FCM send_each failed for TeamAlert #%s', alert.pk)
        for subscriber in eligible:
            _record(alert, subscriber, TeamAlertDelivery.Status.FAILED,
                    error_message='FCM request failed — see server logs.')
        return _finish(alert, target_count=len(eligible), skipped_count=len(skipped),
                        success_count=0, fail_count=len(eligible), status=TeamAlert.Status.FAILED)

    now = timezone.now()
    success = fail = 0
    for subscriber, response in zip(eligible, responses):
        if response.success:
            success += 1
            _record(alert, subscriber, TeamAlertDelivery.Status.SUCCESS,
                    fcm_message_id=response.message_id or '')
            subscriber.last_notified_at = now
            subscriber.failure_count = 0
            subscriber.save(update_fields=['last_notified_at', 'failure_count'])
        else:
            fail += 1
            error = str(response.exception) if response.exception else 'Unknown FCM error.'
            _record(alert, subscriber, TeamAlertDelivery.Status.FAILED, error_message=error[:500])
            subscriber.failure_count += 1
            update_fields = ['failure_count']
            # A dead/unregistered token wastes every future send — retire it.
            if subscriber.failure_count >= 3 or 'registration-token-not-registered' in error.lower():
                subscriber.is_active = False
                update_fields.append('is_active')
            subscriber.save(update_fields=update_fields)

    status = TeamAlert.Status.SENT if success else TeamAlert.Status.FAILED
    return _finish(alert, target_count=len(eligible), skipped_count=len(skipped),
                    success_count=success, fail_count=fail, status=status)


# TeamAlert.title / .body column widths. Titles embed a customer-supplied
# name (Lead.name is itself 120 chars), so an untruncated title can overflow
# the column — and because these run from a post_save signal, that would take
# the customer's lead down with it.
TITLE_MAX = 120
BODY_MAX = 255


def _fmt_amount(value, dp=2):
    """Format a money/rate value for an alert body.

    Casts first: these are called from a post_save signal where the instance
    may still hold whatever the caller assigned (e.g. the string '500') rather
    than the Decimal the column will eventually contain, and '%f' formatting a
    str raises.
    """
    if value is None:
        return '—'
    try:
        return f'{float(value):,.{dp}f}'
    except (TypeError, ValueError):
        return str(value)


def _never_raises(fn):
    """A notification helper must never break the save that triggered it.

    `send_team_alert` already swallows delivery failures, but the code that
    builds an alert from customer-supplied data runs before it — and these
    helpers are called from post_save signals, so an exception here would roll
    back the customer's lead. Same rule as content/notifications.py: the lead
    is already saved; a broken alert is logged, never raised.
    """
    def wrapper(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except Exception:
            logger.exception('Failed to raise a team alert via %s', fn.__name__)
            return None
    wrapper.__name__ = fn.__name__
    wrapper.__doc__ = fn.__doc__
    return wrapper


@_never_raises
def notify_new_enquiry(enquiry):
    """Create and send an Urgent push alert to the team for a brand-new
    enquiry. Always Urgent and always bypasses the rate limit — a fresh lead
    is exactly the kind of thing this feature exists to never miss. This is
    in addition to, not instead of, the existing email alert in
    content/notifications.py.
    """
    alert = TeamAlert.objects.create(
        title=f'New enquiry — {enquiry.name}'[:TITLE_MAX],
        body=f'{enquiry.service or "General enquiry"} · +91 {enquiry.phone}'[:BODY_MAX],
        lead=enquiry,
        priority=TeamAlert.Priority.URGENT,
    )
    return send_team_alert(alert)


@_never_raises
def notify_new_rate_lock(lock):
    """Urgent push alert for a brand-new rate lock.

    Rate locks are the most time-critical thing the desk receives: the
    customer has been promised a specific rate that expires (see
    SiteSetting.rate_lock_hours), so the alert leads with the figures the
    dealer needs to honour or dispute it, and how long they have.
    """
    parts = [f'{lock.from_currency}->{lock.to_currency}', _fmt_amount(lock.amount)]
    if lock.quoted_rate is not None:
        parts.append(f'@ {_fmt_amount(lock.quoted_rate, 4)}')
    if lock.expires_in:
        parts.append(f'· {lock.expires_in}')

    alert = TeamAlert.objects.create(
        title=f'Rate lock — {lock.name}'[:TITLE_MAX],
        body=' '.join(parts)[:BODY_MAX],
        lead=lock,
        priority=TeamAlert.Priority.URGENT,
    )
    return send_team_alert(alert)
