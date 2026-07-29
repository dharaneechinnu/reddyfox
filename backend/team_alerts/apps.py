from django.apps import AppConfig


class TeamAlertsConfig(AppConfig):
    """Internal Chrome push alerts for staff — see team_alerts/services.py."""

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'team_alerts'

    def ready(self):
        from . import signals  # noqa: F401
