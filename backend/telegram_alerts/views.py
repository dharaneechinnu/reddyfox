"""Telegram webhook — receives updates from Telegram in real time (registered via the
set_telegram_webhook management command), instead of an admin manually polling getUpdates.

Update handling itself lives in telegram_alerts/updates.py::handle_update(), shared with the
local-dev long-poll command (telegram_poll_dev) so both paths run identical logic. This view's
only job is: verify the request is really from Telegram, parse the body, hand it off.

Security (see docs/telegram-bot.md "Production webhook"):
  - HTTPS only — Telegram refuses to call anything else; Render's default domain already is.
  - One secret, TELEGRAM_WEBHOOK_SECRET, does double duty: it's both the URL's path segment
    (config/urls.py) and the value Telegram must echo back as the
    X-Telegram-Bot-Api-Secret-Token header (set via `set_telegram_webhook`'s secret_token
    parameter). A request has to get both right — knowing the URL alone isn't enough.

Same never-raises discipline as the rest of this app: a malformed body, an unknown or expired
token, or a send failure on the confirmation reply are all logged and handled cleanly (inside
handle_update itself). Telegram retries a webhook that doesn't return 200 promptly, so every
path here returns 200 once past the secret check — errors are about *not creating a
subscriber*, never about crashing the request.
"""
import json
import logging

from django.conf import settings
from django.http import HttpResponseForbidden, JsonResponse
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

from .updates import handle_update

logger = logging.getLogger(__name__)


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

        handle_update(update)
        return JsonResponse({'ok': True})
