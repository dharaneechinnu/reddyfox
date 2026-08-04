from django.apps import AppConfig


class ThemingConfig(AppConfig):
    name = 'theming'
    verbose_name = 'Theme'

    def ready(self):
        from . import signals  # noqa: F401
