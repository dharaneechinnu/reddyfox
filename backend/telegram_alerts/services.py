"""Telegram alert for new leads — sent alongside content.notifications.notify_team(), never
instead of it.

Design rule mirrors notifications/services.py (the Chrome push equivalent): the lead already
exists in the database before this runs, and every failure here — no token configured, no
subscribers, a network error, a rejected chat_id — is caught and recorded rather than raised. A
bad or missing bot token must never cost a lead.

Kept dependency-free (stdlib urllib, same as fx_providers) rather than adding `requests` or a
Telegram SDK for what is a handful of sends a day.
"""
import json
import logging
import urllib.error
import urllib.request
from decimal import Decimal

from django.conf import settings

from alert_routing.services import is_telegram_enabled_for
from content.models import Lead

from .models import TelegramDelivery, TelegramSubscriber

logger = logging.getLogger(__name__)

TIMEOUT = 10
TELEGRAM_API_URL = 'https://api.telegram.org/bot{token}/sendMessage'


def _fmt(value, dp=2):
    # lead.amount round-trips as Decimal once the lead has been through the DRF serializer (the
    # real path, via BaseLeadCreateView), but a value assigned before the first save/refresh can
    # still be a plain str — cast via Decimal(str(...)) rather than assume, same defensive pattern
    # used for Currency.sell_rate in rates/admin.py.
    if value is None:
        return '—'
    return f'{Decimal(str(value)):,.{dp}f}'


def format_message(lead):
    """Short, chat-friendly version of content.notifications._body() — the full email body is
    too long for a phone notification, so this keeps only what a dealer needs to call back."""
    # A service request's own name is more use in a phone notification than the
    # generic kind: the dealer reads "New Money Transfer" on the lock screen and
    # already knows whether it is theirs.
    heading = lead.service if (lead.kind == Lead.Kind.SERVICE and lead.service) else lead.get_kind_display()
    lines = [
        f'New {heading}',
        '',
        f'Name : {lead.name}',
        f'Phone: +91 {lead.phone}',
    ]
    if lead.kind == Lead.Kind.SERVICE:
        # The answers to that form's own questions — the whole reason six
        # different pop-ups exist rather than one. Sent in full: this is what
        # the dealer needs in hand before they dial, and a service form asks at
        # most a handful of questions (capped in content/validators.py).
        pairs = lead.detail_pairs
        if pairs:
            width = max(len(label) for label, _ in pairs)
            lines += [''] + [f'{label.ljust(width)}: {value}' for label, value in pairs]
        if lead.needed_by:
            lines += ['', f'Needed by: {lead.needed_by}']
    if lead.kind == Lead.Kind.QUOTE:
        # Mirrors content/notifications.py's "What to price" block — a quote request's
        # currency/amount is already covered by the "Converting:" line below, but the service
        # and deadline aren't shown anywhere else in this shorter message.
        lines += [
            '',
            f'Service  : {lead.service or "(not specified)"}',
            f'Needed by: {lead.needed_by or "(not specified)"}',
        ]
    if lead.kind == Lead.Kind.SERVICE:
        # No "→" pair here: a service request names one currency and an amount,
        # and there is no second side to convert to. Rendering it as a pair
        # would print "USD → ?" on every single one.
        if lead.from_currency or lead.amount is not None:
            lines += ['', f'Wants: {_fmt(lead.amount)} {lead.from_currency or ""}'.rstrip()]
    elif lead.from_currency or lead.to_currency or lead.amount:
        pair = f'{lead.from_currency or "?"} → {lead.to_currency or "?"}'
        lines += ['', f'Converting: {_fmt(lead.amount)} {pair}']
    if lead.message:
        # The contact form is now nothing but a question, so for an enquiry this
        # line IS the lead — omitting it left the desk with a name and a phone
        # number and no idea what was being asked. Trimmed rather than sent
        # whole: the model allows 5000 characters and Telegram caps a message at
        # 4096, so an over-long one would fail the send outright.
        text = lead.message if len(lead.message) <= 700 else lead.message[:700].rstrip() + '…'
        lines += ['', 'Message:', text]
    if lead.tel_url:
        lines += ['', f'Call: {lead.tel_url}']
    return '\n'.join(lines)


def _send_one(token, chat_id, text):
    payload = json.dumps({'chat_id': chat_id, 'text': text}).encode()
    req = urllib.request.Request(
        TELEGRAM_API_URL.format(token=token),
        data=payload,
        headers={'Content-Type': 'application/json'},
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        body = json.loads(resp.read().decode())
    if not body.get('ok'):
        raise RuntimeError(body.get('description', 'unknown Telegram API error'))


def notify_team_telegram(lead):
    """Send a new-lead alert to every active TelegramSubscriber. Never raises.

    Returns the number of successful sends (0 if not configured, no subscribers, this lead's
    kind is switched off in the alert_routing checklist, or every send failed — callers don't
    need to distinguish those cases, the delivery log does).
    """
    if not is_telegram_enabled_for(lead.kind):
        logger.info(
            'Telegram alert skipped for lead #%s: %s is disabled in the alert routing checklist.',
            lead.pk, lead.kind,
        )
        return 0

    token = getattr(settings, 'TELEGRAM_BOT_TOKEN', '')
    if not token:
        logger.info('TELEGRAM_BOT_TOKEN not configured; skipping Telegram alert for lead #%s.', lead.pk)
        return 0

    subscribers = list(TelegramSubscriber.objects.filter(is_active=True))
    if not subscribers:
        logger.info('No active Telegram subscribers; skipping Telegram alert for lead #%s.', lead.pk)
        return 0

    text = format_message(lead)
    success_count = 0
    for subscriber in subscribers:
        try:
            _send_one(token, subscriber.chat_id, text)
        except (urllib.error.URLError, TimeoutError, RuntimeError, ValueError) as exc:
            logger.warning(
                'Telegram alert failed for lead #%s -> subscriber #%s (%s): %s',
                lead.pk, subscriber.pk, subscriber.name, exc,
            )
            TelegramDelivery.objects.update_or_create(
                lead=lead, subscriber=subscriber,
                defaults={'status': TelegramDelivery.Status.FAILED, 'error_message': str(exc)[:500]},
            )
        else:
            success_count += 1
            TelegramDelivery.objects.update_or_create(
                lead=lead, subscriber=subscriber,
                defaults={'status': TelegramDelivery.Status.SUCCESS, 'error_message': ''},
            )

    logger.info(
        'Telegram alert for lead #%s: %s/%s subscribers reached.',
        lead.pk, success_count, len(subscribers),
    )
    return success_count
