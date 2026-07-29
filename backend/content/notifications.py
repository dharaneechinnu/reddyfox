"""
Team notification for new enquiries.

Design rule: the enquiry is ALWAYS saved to the database before this runs, and
every failure here is swallowed and logged. A wrong SMTP password must never
cost the business a lead — the row is still in /admin/ either way.
"""
import logging

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

logger = logging.getLogger(__name__)


def _body(enquiry):
    lines = [
        'A new enquiry has come in from the website.',
        '',
        f'Name    : {enquiry.name}',
        f'Phone   : +91 {enquiry.phone}',
        f'Email   : {enquiry.email}',
        f'Service : {enquiry.service or "(not specified)"}',
        f'Received: {timezone.localtime(enquiry.created_at):%d %b %Y, %H:%M} IST',
        '',
        'Message:',
        enquiry.message,
        '',
        '--- Reply in one tap ---',
    ]
    if enquiry.whatsapp_url:
        lines.append(f'WhatsApp: {enquiry.whatsapp_url}')
    if enquiry.tel_url:
        lines.append(f'Call    : {enquiry.tel_url}')
    lines.append(f'Email   : mailto:{enquiry.email}')

    base = getattr(settings, 'ADMIN_BASE_URL', '').rstrip('/')
    if base:
        lines += ['', f'Open in admin: {base}/admin/content/enquiry/{enquiry.pk}/change/']
    return '\n'.join(lines)


def notify_team(enquiry):
    """Email the team about a new enquiry. Returns True if sent.

    Never raises — callers can ignore the result.
    """
    recipients = getattr(settings, 'ENQUIRY_NOTIFY_EMAILS', None)
    if not recipients:
        logger.info('Enquiry %s saved; no ENQUIRY_NOTIFY_EMAILS configured, skipping alert.', enquiry.pk)
        return False

    subject = f'[Website enquiry] {enquiry.name} — {enquiry.service or "general"}'
    try:
        send_mail(
            subject=subject,
            message=_body(enquiry),
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', None),
            recipient_list=list(recipients),
            fail_silently=False,
        )
    except Exception:
        # Logged, not raised: the enquiry is already safely stored.
        logger.exception('Failed to send enquiry alert for #%s', enquiry.pk)
        return False

    enquiry.notified_at = timezone.now()
    enquiry.save(update_fields=['notified_at'])
    logger.info('Enquiry %s alert sent to %s', enquiry.pk, ', '.join(recipients))
    return True
