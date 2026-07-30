from django.apps import AppConfig


class FeatureFlagsConfig(AppConfig):
    name = 'feature_flags'

    def ready(self):
        from . import signals  # noqa: F401
