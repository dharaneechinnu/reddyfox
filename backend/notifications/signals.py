"""
Auto-raises a rate alert whenever a currency's buy/sell rate is edited in the
Django admin — including bulk edits via CurrencyAdmin's list_editable fields,
which go through Model.save() one row at a time.
"""
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from rates.models import Currency


@receiver(pre_save, sender=Currency)
def _stash_previous_rates(sender, instance, **kwargs):
    if not instance.pk:
        instance._previous_rates = None
        return
    try:
        previous = Currency.objects.only('buy_rate', 'sell_rate').get(pk=instance.pk)
    except Currency.DoesNotExist:
        instance._previous_rates = None
    else:
        instance._previous_rates = (previous.buy_rate, previous.sell_rate)


@receiver(post_save, sender=Currency)
def _send_rate_change_alert(sender, instance, created, **kwargs):
    if created or not instance.is_visible:
        return
    previous = getattr(instance, '_previous_rates', None)
    if previous is None:
        return
    previous_buy, previous_sell = previous
    # Cast before comparing: `instance.buy_rate`/`sell_rate` may still be the
    # raw string assigned by the caller (e.g. admin form data) rather than a
    # Decimal, and Decimal("83.00") == "83.00" is False, not a type error —
    # that false inequality would fire a spurious alert on every save.
    if float(previous_buy) == float(instance.buy_rate) and float(previous_sell) == float(instance.sell_rate):
        return

    from .services import notify_rate_change
    notify_rate_change(instance, previous_buy, previous_sell)
