from django.db import models

from fx_providers.providers import Provider


class ReferenceRate(models.Model):
    """A third-party mid-market rate for one currency, INR-denominated.

    This is guidance for staff, never a price. Nothing in this app writes to
    rates.Currency.buy_rate / sell_rate — see docs/currency-rate-apis.md for
    why piping a reference rate onto the public board would misrepresent our
    own commercial rate.
    """

    code = models.CharField(max_length=3, unique=True, help_text='ISO currency code, matches rates.Currency.code')
    inr_rate = models.DecimalField(max_digits=12, decimal_places=6, help_text='1 unit of this currency, in INR, per the source')
    source = models.CharField(max_length=40, help_text='Which provider this figure came from, e.g. fawazahmed0')
    fetched_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['code']

    def __str__(self):
        return f'{self.code} = {self.inr_rate} INR ({self.source})'


class ReferenceRateSettings(models.Model):
    """Singleton — one row, auto-created, never deleted. Same pattern as content.SiteSetting.

    A single global margin, applied to every currency alike, rather than a per-currency setting —
    this is the one place staff configure it, and every fetch (scheduled or manual) reads it fresh.
    """

    auto_update_enabled = models.BooleanField(
        default=False,
        verbose_name='Auto-update rates from market',
        help_text='When on, every fetch recalculates every currency\'s buy_rate/sell_rate from the '
                   'fetched market rate plus the margins below. When off, a fetch only refreshes the '
                   '"Market ref" guidance column — Currency rows are never touched.',
    )
    primary_provider = models.CharField(
        max_length=20, choices=Provider.choices, default=Provider.EXCHANGERATE_API,
        help_text='Tried first on every fetch. The other two are tried, in their usual order, for '
                   'whatever currencies the primary doesn\'t cover — e.g. if exchangerate-api has no '
                   'key configured, or is down, fawazahmed0 (free, no key) is used automatically.',
    )
    buy_margin = models.DecimalField(
        max_digits=8, decimal_places=2, default=-1,
        help_text='Added to the fetched market rate to set every currency\'s buy_rate, e.g. -1.00 to buy ₹1 below market.',
    )
    sell_margin = models.DecimalField(
        max_digits=8, decimal_places=2, default=1,
        help_text='Added to the fetched market rate to set every currency\'s sell_rate, e.g. 1.00 to sell ₹1 above market.',
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'reference rate setting'
        verbose_name_plural = 'reference rate settings'

    def __str__(self):
        return 'Auto-update: on' if self.auto_update_enabled else 'Auto-update: off'

    def save(self, *args, **kwargs):
        self.pk = 1  # enforce singleton
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        pass  # the single row is never deleted

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
