"""Telegram webhook — receives updates from Telegram in real time (registered via the
set_telegram_webhook management command), instead of an admin manually polling getUpdates.

The only thing this endpoint does is claim a QR invite: it looks for a `/start <token>` message,
matches it to a pending, unexpired TelegramInvite, and turns it into an active TelegramSubscriber.
Nothing else a customer or staff member sends the bot is acted on.

Security (see docs/telegram-bot.md "Production webhook"):
  - HTTPS only — Telegram refuses to call anything else; Render's default domain already is.
  - The URL path includes an unguessable secret segment (defense in depth, see config/urls.py).
  - Every request must carry the X-Telegram-Bot-Api-Secret-Token header matching
    TELEGRAM_WEBHOOK_SECRET — this, not the path, is the actual proof a call came from Telegram.
    Set via `set_telegram_webhook`'s secret_token parameter; Telegram echoes it on every call.

Same never-raises discipline as the rest of this app: a malformed body, an unknown or expired
token, or a send failure on the confirmation reply are all logged and handled cleanly. Telegram
retries a webhook that doesn't return 200 promptly, so every path here returns 200 — errors are
about *not creating a subscriber*, never about crashing the request.
"""
import json
import logging

from django.conf import settings
from django.http import HttpResponseForbidden, JsonResponse
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

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


@method_decorator(csrf_exempt, name='dispatch')
class TelegramWebhookView(View):
    """POST-only. GET exists only so a human hitting the URL in a browser gets a clean 405,
    not a confusing error."""

    def post(self, request, *args, **kwargs):
        if request.headers.get('X-Telegram-Bot-Api-Secret-Token', '') != settings.TELEGRAM_WEBHOOK_SECRET:
            logger.warning('Telegram webhook called with a missing/wrong secret token header.')
            return HttpResponseForbidden('Invalid secret token.')

        try:
            update = json.loads(request.body.decode())
        except (ValueError, UnicodeDecodeError):
            logger.warning('Telegram webhook received a non-JSON body.')
            return JsonResponse({'ok': True})  # 200 anyway — malformed input, not our failure to retry

        token = _extract_start_token(update)
        if not token:
            return JsonResponse({'ok': True})  # not a /start message — nothing for us to do

        message = update['message']
        chat_id = str(message['chat']['id'])
        self._claim_invite(token, chat_id, _display_name(message))
        return JsonResponse({'ok': True})

    def _claim_invite(self, token, chat_id, display_name):
        try:
            invite = TelegramInvite.objects.get(token=token)
        except TelegramInvite.DoesNotExist:
            logger.info('Telegram webhook: unknown invite token used from chat_id=%s.', chat_id)
            self._reply(chat_id, EXPIRED_TEXT)
            return

        if not invite.is_claimable:
            logger.info('Telegram webhook: invite #%s no longer claimable (status=%s).', invite.pk, invite.status)
            self._reply(chat_id, EXPIRED_TEXT)
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
        self._reply(chat_id, CONFIRMATION_TEXT)

    def _reply(self, chat_id, text):
        token = settings.TELEGRAM_BOT_TOKEN
        if not token:
            return
        try:
            _send_one(token, chat_id, text)
        except Exception:
            # The invite is already claimed (or already rejected) by this point regardless — a
            # failed confirmation reply is a lesser problem, logged, never raised back to Telegram.
            logger.warning('Telegram webhook: could not send confirmation reply to chat_id=%s.', chat_id)
