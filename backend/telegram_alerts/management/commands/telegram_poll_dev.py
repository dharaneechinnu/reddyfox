"""Local-dev transport for Telegram updates — long-polls getUpdates in a loop and feeds each one
into the exact same telegram_alerts.updates.handle_update() the production webhook uses.

Why this exists: webhooks need a public HTTPS URL, which `localhost` isn't, so testing the QR
invite-claim flow used to mean standing up an ngrok/cloudflared tunnel just to exercise business
logic that has nothing to do with tunnels. This command removes that step entirely for local
testing — no tunnel, no webhook registration, same code path Telegram would otherwise call.

Not for production — Render should register a real webhook via `set_telegram_webhook` instead of
running a permanently-open polling process. Run `set_telegram_webhook --delete` first if a
webhook was previously registered against this bot token, so Telegram doesn't try to push to a
dead URL while this is also polling (Telegram allows only one active transport at a time).
"""
import json
import time
import urllib.error
import urllib.request

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from telegram_alerts.updates import handle_update

POLL_TIMEOUT = 30  # seconds — how long Telegram holds the connection open waiting for an update
REQUEST_TIMEOUT = POLL_TIMEOUT + 10


class Command(BaseCommand):
    help = 'Long-polls Telegram for updates and processes them locally — no webhook/tunnel needed.'

    def handle(self, *args, **options):
        token = settings.TELEGRAM_BOT_TOKEN
        if not token:
            raise CommandError('TELEGRAM_BOT_TOKEN is not set.')

        self.stdout.write('Polling Telegram for updates locally — Ctrl+C to stop.')
        offset = 0
        while True:
            try:
                updates = self._get_updates(token, offset)
            except (urllib.error.URLError, TimeoutError, ValueError) as exc:
                self.stderr.write(self.style.WARNING(f'getUpdates failed, retrying: {exc}'))
                time.sleep(2)
                continue

            for update in updates:
                offset = max(offset, update['update_id'] + 1)
                handle_update(update)  # never raises — see updates.py

    def _get_updates(self, token, offset):
        payload = json.dumps({'timeout': POLL_TIMEOUT, 'offset': offset}).encode()
        req = urllib.request.Request(
            f'https://api.telegram.org/bot{token}/getUpdates',
            data=payload,
            headers={'Content-Type': 'application/json'},
            method='POST',
        )
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
            body = json.loads(resp.read().decode())
        if not body.get('ok'):
            raise ValueError(body.get('description', 'unknown Telegram API error'))
        return body['result']
