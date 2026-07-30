from django.core.cache import cache
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver
from .models import FeatureFlag
from .views import CACHE_KEY


@receiver([post_save, post_delete], sender=FeatureFlag)
def clear_feature_flag_cache(sender, **kwargs):
    """An admin toggle should take effect on the next page load, not up to
    CACHE_SECONDS later — so drop the cached map the moment a flag changes."""
    cache.delete(CACHE_KEY)
