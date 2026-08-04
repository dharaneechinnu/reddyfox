from decimal import Decimal

from django.db import models


class Region(models.TextChoices):
    EUROPE = 'Europe', 'Europe'
    ASIA_PACIFIC = 'Asia-Pacific', 'Asia-Pacific'
    MIDDLE_EAST = 'Middle East', 'Middle East'
    AMERICAS = 'Americas', 'Americas'


class RateType(models.TextChoices):
    CASH = 'cash', 'Cash (currency notes)'
    FOREX_CARD = 'forex_card', 'Forex card'


class Currency(models.Model):
    code = models.CharField(max_length=3, help_text='ISO currency code, e.g. USD')
    name = models.CharField(max_length=60, help_text='Full name, e.g. US Dollar')
    country_code = models.CharField(max_length=2, help_text='ISO country code for the badge, e.g. US')
    region = models.CharField(max_length=20, choices=Region.choices, default=Region.ASIA_PACIFIC)
    rate_type = models.CharField(max_length=20, choices=RateType.choices, default=RateType.CASH, help_text='Which counter product this row prices — cash or forex card. Each currency can have one row per type.')
    buy_rate = models.DecimalField(max_digits=10, decimal_places=2, help_text='We buy at this rate (INR)')
    sell_rate = models.DecimalField(max_digits=10, decimal_places=2, help_text='We sell at this rate (INR)')
    change_pct = models.DecimalField(
        max_digits=6, decimal_places=2, default=0,
        help_text='Buy/sell spread, percent. Recalculated automatically whenever a reference-rate '
                   'fetch applies a new buy/sell rate — edit by hand here to override that value.',
    )
    is_visible = models.BooleanField(default=True, help_text='Show this currency anywhere in the UI (rate table, converter, homepage board). Untick to hide it without deleting it.')
    display_order = models.PositiveIntegerField(default=0, help_text='Lower numbers appear first in the rate table')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['display_order', 'code']
        verbose_name_plural = 'currencies'
        unique_together = [('code', 'rate_type')]

    def __str__(self):
        return f'{self.code} — {self.name} ({self.get_rate_type_display()})'

    @staticmethod
    def spread_pct(buy_rate, sell_rate):
        """The buy/sell spread as a percentage of the buy rate. Used to auto-fill change_pct
        whenever a reference-rate fetch applies a new buy/sell rate — see
        reference_rates.services.refresh_reference_rates. Not applied on every save(), so a
        staff hand-edit of change_pct in the admin sticks until the next fetch."""
        buy_rate = Decimal(str(buy_rate))
        if not buy_rate:
            return Decimal('0.00')
        return ((Decimal(str(sell_rate)) - buy_rate) / buy_rate * 100).quantize(Decimal('0.01'))

    def save(self, *args, **kwargs):
        # Codes are looked up uppercase everywhere (validate_currency_code, the API's code
        # lookup) — a stray lowercase entry from the admin would silently fail those lookups
        # even though the row exists and is visible.
        self.code = self.code.upper()
        super().save(*args, **kwargs)
