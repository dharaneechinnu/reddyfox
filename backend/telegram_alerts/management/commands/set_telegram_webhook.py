"""Registers (or re-registers) our webhook URL with Telegram — one-time per environment, and
again any time TELEGRAM_WEBHOOK_SECRET, TELEGRAM_WEBHOOK_PATH_SECRET, or the domain changes.

Not something the app calls itself — a human runs this once after configuring the env vars.
"""
import json
import urllib.request

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Registers this deploy\'s webhook URL with Telegram via setWebhook.'

    def handle(self, *args, **options):
        token = settings.TELEGRAM_BOT_TOKEN
        if not token:
            raise CommandError('TELEGRAM_BOT_TOKEN is not set.')

        base_url = settings.ADMIN_BASE_URL.rstrip('/')
        if base_url.startswith('http://'):
            raise CommandError(
                f'ADMIN_BASE_URL ({base_url}) is not HTTPS — Telegram refuses non-HTTPS webhooks. '
                'This is fine locally (webhooks only matter in production); set it to the real '
                'https:// domain before running this against production.'
            )

        webhook_url = f'{base_url}/api/telegram/webhook/{settings.TELEGRAM_WEBHOOK_PATH_SECRET}/'
        payload = json.dumps({
            'url': webhook_url,
            'secret_token': settings.TELEGRAM_WEBHOOK_SECRET,
            'allowed_updates': ['message'],
        }).encode()

        req = urllib.request.Request(
            f'https://api.telegram.org/bot{token}/setWebhook',
            data=payload,
            headers={'Content-Type': 'application/json'},
            method='POST',
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = json.loads(resp.read().decode())

        if not body.get('ok'):
            raise CommandError(f'Telegram rejected the webhook registration: {body.get("description")}')

        self.stdout.write(self.style.SUCCESS(f'Webhook registered: {webhook_url}'))
