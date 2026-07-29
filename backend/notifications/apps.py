from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    """Chrome browser push (rate alerts) — see notifications/services.py."""

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'notifications'

    def ready(self):
        from . import signals  # noqa: F401
