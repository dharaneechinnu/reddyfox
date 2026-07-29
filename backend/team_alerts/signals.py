"""
Auto-raises a team push alert whenever a new website enquiry is saved.

Connected on the `Enquiry` proxy model specifically (not the shared `Lead`
base) — Django sends post_save with sender=Enquiry for saves made through
that proxy, so quote requests and rate locks (also backed by Lead, but
saved through their own proxies) do not trigger this.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver

from content.models import Enquiry


@receiver(post_save, sender=Enquiry)
def _push_new_enquiry_alert(sender, instance, created, **kwargs):
    if not created:
        return

    from .services import notify_new_enquiry
    notify_new_enquiry(instance)
