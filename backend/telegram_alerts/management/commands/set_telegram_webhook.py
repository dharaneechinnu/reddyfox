"""Registers (or removes) our webhook URL with Telegram — one-time per environment, and again
any time TELEGRAM_WEBHOOK_SECRET or the domain changes.

Not something the app calls itself — a human runs this once after configuring the env vars.
`--delete` unregisters it, e.g. before switching a local checkout over to telegram_poll_dev.
"""
import json
import urllib.request

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Registers this deploy\'s webhook URL with Telegram via setWebhook (or removes it with --delete).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--delete', action='store_true',
            help='Unregister the webhook instead of setting it — do this before using '
                 'telegram_poll_dev locally, so Telegram isn\'t trying to push updates to a '
                 'webhook URL nothing is listening on.',
        )

    def handle(self, *args, **options):
        token = settings.TELEGRAM_BOT_TOKEN
        if not token:
            raise CommandError('TELEGRAM_BOT_TOKEN is not set.')

        if options['delete']:
            body = self._call(token, 'deleteWebhook', {})
            if not body.get('ok'):
                raise CommandError(f'Telegram rejected the deleteWebhook call: {body.get("description")}')
            self.stdout.write(self.style.SUCCESS('Webhook removed.'))
            return

        base_url = settings.ADMIN_BASE_URL.rstrip('/')
        if base_url.startswith('http://'):
            raise CommandError(
                f'ADMIN_BASE_URL ({base_url}) is not HTTPS — Telegram refuses non-HTTPS webhooks. '
                'This is fine locally (use telegram_poll_dev there instead of a webhook); set '
                'ADMIN_BASE_URL to the real https:// domain before running this against production.'
            )

        webhook_url = f'{base_url}/api/telegram/webhook/{settings.TELEGRAM_WEBHOOK_SECRET}/'
        body = self._call(token, 'setWebhook', {
            'url': webhook_url,
            'secret_token': settings.TELEGRAM_WEBHOOK_SECRET,
            'allowed_updates': ['message'],
        })

        if not body.get('ok'):
            raise CommandError(f'Telegram rejected the webhook registration: {body.get("description")}')

        self.stdout.write(self.style.SUCCESS(f'Webhook registered: {webhook_url}'))

    def _call(self, token, method, payload):
        req = urllib.request.Request(
            f'https://api.telegram.org/bot{token}/{method}',
            data=json.dumps(payload).encode(),
            headers={'Content-Type': 'application/json'},
            method='POST',
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode())
