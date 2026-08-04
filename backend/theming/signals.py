from django.core.cache import cache
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import ThemeSetting
from .views import CACHE_KEY


@receiver(post_save, sender=ThemeSetting)
def clear_theme_cache(sender, **kwargs):
    """A theme edit should show up on the next page load, not up to CACHE_SECONDS later.

    No post_delete counterpart: ThemeSetting.delete() is a deliberate no-op, so the row can
    never actually go away.
    """
    cache.delete(CACHE_KEY)
