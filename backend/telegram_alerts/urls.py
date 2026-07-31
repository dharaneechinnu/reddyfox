from django.conf import settings
from django.urls import path

from .views import TelegramWebhookView

# The path segment is the same TELEGRAM_WEBHOOK_SECRET the view checks in the
# X-Telegram-Bot-Api-Secret-Token header — one secret, checked two ways (a request has to know
# both the URL and produce the matching header; leaking one alone isn't enough). Keeps only one
# secret to generate/rotate/set as an env var instead of two.
urlpatterns = [
    path(
        f'telegram/webhook/{settings.TELEGRAM_WEBHOOK_SECRET}/',
        TelegramWebhookView.as_view(),
        name='telegram-webhook',
    ),
]
