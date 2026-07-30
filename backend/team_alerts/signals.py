"""
Auto-raises a team push alert whenever a new website lead needs the desk's
immediate attention.

Connected on the proxy models specifically (not the shared `Lead` base) —
Django sends post_save with sender set to whichever proxy actually called
.save(), so each kind can be opted in independently. `QuoteRequest` is
deliberately not wired up: quotes are priced at the desk's own pace, unlike
an enquiry (a fresh lead going cold) or a rate lock (a promised rate that
expires).
"""
from django.db.models.signals import post_save
from django.dispatch import receiver

from content.models import Enquiry, RateLock


@receiver(post_save, sender=Enquiry)
def _push_new_enquiry_alert(sender, instance, created, **kwargs):
    if not created:
        return

    from .services import notify_new_enquiry
    notify_new_enquiry(instance)


@receiver(post_save, sender=RateLock)
def _push_new_rate_lock_alert(sender, instance, created, **kwargs):
    if not created:
        return

    from .services import notify_new_rate_lock
    notify_new_rate_lock(instance)
