"""Prints Telegram's current webhook registration for this bot — what URL it has on file, and
any delivery errors Telegram has recorded. Useful after a domain change, or a suspiciously quiet
week with no alerts arriving.
"""
import json
import urllib.request

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Prints Telegram\'s current webhook registration (getWebhookInfo) for this bot.'

    def handle(self, *args, **options):
        token = settings.TELEGRAM_BOT_TOKEN
        if not token:
            raise CommandError('TELEGRAM_BOT_TOKEN is not set.')

        req = urllib.request.Request(f'https://api.telegram.org/bot{token}/getWebhookInfo')
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = json.loads(resp.read().decode())

        if not body.get('ok'):
            raise CommandError(f'Telegram error: {body.get("description")}')

        info = body['result']
        self.stdout.write(f'URL                  : {info.get("url") or "(none registered)"}')
        self.stdout.write(f'Pending updates      : {info.get("pending_update_count", 0)}')
        if info.get('last_error_message'):
            self.stdout.write(self.style.ERROR(
                f'Last error           : {info["last_error_message"]} '
                f'(at {info.get("last_error_date")})'
            ))
        else:
            self.stdout.write(self.style.SUCCESS('Last error           : none'))
