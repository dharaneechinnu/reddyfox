"""
Team notification for new leads (enquiries, quote requests, callbacks).

Design rule: the lead is ALWAYS saved to the database before this runs, and
every failure here is swallowed and logged. A wrong SMTP password must never
cost the business a lead — the row is still in /admin/ either way.

Recipients are per type, configured in the admin under Content -> Site settings,
falling back to ENQUIRY_NOTIFY_EMAILS so a blank field never means "nobody gets
told".
"""
import logging

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

logger = logging.getLogger(__name__)

SUBJECT_PREFIX = {
    'enquiry': 'Enquiry',
    'quote': 'Quote request',
    'callback': 'Callback request',
}


def _fmt(value, dp=2):
    return f'{value:,.{dp}f}' if value is not None else '—'


def _body(lead):
    lines = [
        f'A new {lead.get_kind_display().lower()} has come in from the website.',
        '',
        f'Name    : {lead.name}',
        f'Phone   : +91 {lead.phone}',
    ]

    if lead.kind == 'quote':
        lines += [
            '',
            '--- What to price ---',
            f'Service  : {lead.service or "(not specified)"}',
            f'Currency : {lead.from_currency or "(not specified)"}',
            f'Amount   : {_fmt(lead.amount)}',
            f'Needed by: {lead.needed_by or "(not specified)"}',
        ]
    elif lead.kind == 'callback':
        lines += [
            '',
            '--- What they were converting ---',
            f'Pair     : {lead.from_currency or "(not specified)"} -> {lead.to_currency or "(not specified)"}',
            f'Amount   : {_fmt(lead.amount)} {lead.from_currency or ""}'.rstrip(),
        ]
    else:
        lines.append(f'Service : {lead.service or "(not specified)"}')

    lines += ['', f'Received: {timezone.localtime(lead.created_at):%d %b %Y, %H:%M} IST']

    if lead.message:
        lines += ['', 'Message:', lead.message]

    lines += ['', '--- Reply in one tap ---']
    if lead.whatsapp_url:
        lines.append(f'WhatsApp: {lead.whatsapp_url}')
    if lead.tel_url:
        lines.append(f'Call    : {lead.tel_url}')

    base = getattr(settings, 'ADMIN_BASE_URL', '').rstrip('/')
    # Quote requests have no admin page (deliberately unregistered — see
    # content/admin.py), so there is nowhere to link for that kind. Reply
    # via the WhatsApp/call lines above instead.
    proxy = {'enquiry': 'enquiry', 'callback': 'callbackrequest'}.get(lead.kind)
    if base and proxy:
        lines += ['', f'Open in admin: {base}/admin/content/{proxy}/{lead.pk}/change/']
    return '\n'.join(lines)


def _subject(lead):
    label = SUBJECT_PREFIX.get(lead.kind, 'Lead')
    if lead.kind in ('quote', 'callback'):
        detail = f'{lead.from_currency or "?"} {_fmt(lead.amount)}'
    else:
        detail = lead.service or 'general'
    return f'[{label}] {lead.name} — {detail}'


def notify_team(lead):
    """Email the right team about a new lead. Returns True if sent.

    Never raises — callers can ignore the result.
    """
    from .models import SiteSetting

    try:
        recipients = SiteSetting.load().recipients_for(lead.kind)
    except Exception:
        logger.exception('Could not resolve notification recipients for lead #%s', lead.pk)
        recipients = list(getattr(settings, 'ENQUIRY_NOTIFY_EMAILS', []) or [])

    if not recipients:
        logger.info('Lead %s saved; no notification recipients configured, skipping alert.', lead.pk)
        return False

    try:
        send_mail(
            subject=_subject(lead),
            message=_body(lead),
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', None),
            recipient_list=list(recipients),
            fail_silently=False,
        )
    except Exception:
        # Logged, not raised: the lead is already safely stored.
        logger.exception('Failed to send alert for lead #%s', lead.pk)
        return False

    lead.notified_at = timezone.now()
    lead.save(update_fields=['notified_at'])
    logger.info('Lead %s (%s) alert sent to %s', lead.pk, lead.kind, ', '.join(recipients))
    return True
