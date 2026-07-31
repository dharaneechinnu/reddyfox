"""Shared Telegram update handling — the one place a `/start <token>` message turns into an
active TelegramSubscriber.

Used by two callers, deliberately kept identical between them (see docs/telegram-bot.md):
  - telegram_alerts/views.py::TelegramWebhookView, the production path (Telegram pushes updates
    to our webhook in real time).
  - telegram_alerts/management/commands/telegram_poll_dev.py, the local-dev path (long-polls
    getUpdates instead — no public HTTPS URL needed, so no tunnel needed to test this flow).

Both callers just parse a raw Telegram update dict and hand it to `handle_update()` — the actual
invite-claiming logic lives in exactly one place, so there's no risk of the two paths drifting
apart from each other.
"""
import logging

from django.conf import settings

from .models import TelegramInvite, TelegramSubscriber
from .services import _send_one

logger = logging.getLogger(__name__)

CONFIRMATION_TEXT = "You're all set — you'll now get lead alerts here."
EXPIRED_TEXT = 'This invite link has expired or already been used. Ask an admin for a new one.'


def _extract_start_token(update):
    """Pulls the token out of a /start <token> message, or None if this update isn't that."""
    message = update.get('message') or {}
    text = (message.get('text') or '').strip()
    if not text.startswith('/start'):
        return None
    parts = text.split(maxsplit=1)
    return parts[1].strip() if len(parts) > 1 else None


def _display_name(message):
    frm = message.get('from') or {}
    name = ' '.join(filter(None, [frm.get('first_name'), frm.get('last_name')]))
    return name or frm.get('username') or 'Unnamed'


def _reply(chat_id, text):
    token = settings.TELEGRAM_BOT_TOKEN
    if not token:
        return
    try:
        _send_one(token, chat_id, text)
    except Exception:
        # The invite is already claimed (or already rejected) by this point regardless — a
        # failed confirmation reply is a lesser problem, logged, never raised to the caller.
        logger.warning('Telegram: could not send confirmation reply to chat_id=%s.', chat_id)


def _claim_invite(token, chat_id, display_name):
    try:
        invite = TelegramInvite.objects.get(token=token)
    except TelegramInvite.DoesNotExist:
        logger.info('Telegram: unknown invite token used from chat_id=%s.', chat_id)
        _reply(chat_id, EXPIRED_TEXT)
        return

    if not invite.is_claimable:
        logger.info('Telegram: invite #%s no longer claimable (status=%s).', invite.pk, invite.status)
        _reply(chat_id, EXPIRED_TEXT)
        return

    subscriber, created = TelegramSubscriber.objects.get_or_create(
        chat_id=chat_id, defaults={'name': invite.label or display_name},
    )
    if not created:
        # This chat_id already has a row (e.g. re-scanning an old invite, or a manually-added
        # subscriber) — reuse it rather than violating the unique constraint on chat_id.
        subscriber.is_active = True
        subscriber.save(update_fields=['is_active'])

    invite.status = TelegramInvite.Status.CLAIMED
    invite.claimed_by = subscriber
    invite.save(update_fields=['status', 'claimed_by'])

    logger.info('Telegram invite #%s claimed by chat_id=%s -> subscriber #%s.', invite.pk, chat_id, subscriber.pk)
    _reply(chat_id, CONFIRMATION_TEXT)


def handle_update(update):
    """Processes one raw Telegram update dict. Never raises — the caller (webhook view or the
    dev poll command) doesn't need its own try/except around this."""
    try:
        token = _extract_start_token(update)
        if not token:
            return  # not a /start message — nothing for us to do

        message = update['message']
        chat_id = str(message['chat']['id'])
        _claim_invite(token, chat_id, _display_name(message))
    except Exception:
        logger.exception('Telegram: failed to handle update: %r', update)
