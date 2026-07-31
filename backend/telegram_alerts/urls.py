from django.conf import settings
from django.urls import path

from .views import TelegramWebhookView

# The path itself carries an unguessable secret segment (defense in depth) — the real security
# boundary is the X-Telegram-Bot-Api-Secret-Token header check inside the view, but a predictable
# URL like /telegram/webhook/ is one less thing worth exposing to random scanners.
urlpatterns = [
    path(
        f'telegram/webhook/{settings.TELEGRAM_WEBHOOK_PATH_SECRET}/',
        TelegramWebhookView.as_view(),
        name='telegram-webhook',
    ),
]
