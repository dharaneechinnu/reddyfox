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
    buy_rate = models.DecimalField(max_digits=10, decimal_places=4, help_text='We buy at this rate (INR)')
    sell_rate = models.DecimalField(max_digits=10, decimal_places=4, help_text='We sell at this rate (INR)')
    change_pct = models.DecimalField(max_digits=6, decimal_places=2, default=0, help_text='24h change, percent')
    is_popular = models.BooleanField(default=False, help_text='Show on the homepage board and ticker')
    is_visible = models.BooleanField(default=True, help_text='Show this currency anywhere in the UI (rate table, converter, homepage board). Untick to hide it without deleting it.')
    display_order = models.PositiveIntegerField(default=0, help_text='Lower numbers appear first in the rate table')
    updated_at = models.DateTimeField(auto_now=True)

    # Reference-rate auto-update. Off by default and per-row, so nothing changes for a currency
    # until staff explicitly opts it in here and sets its own margin — the desk stays in control
    # of both whether this runs and what it computes. See reference_rates/services.py.
    auto_update_from_reference = models.BooleanField(
        default=False,
        help_text='When on, buy_rate/sell_rate are recalculated automatically from the fetched market rate plus the margins below, on every scheduled or manual reference-rate fetch.',
    )
    sell_margin = models.DecimalField(
        max_digits=8, decimal_places=4, default=1,
        help_text='Added to the fetched market rate to set sell_rate automatically, e.g. 1.00 to sell ₹1 above market. Only used when auto-update is on.',
    )
    buy_margin = models.DecimalField(
        max_digits=8, decimal_places=4, default=-1,
        help_text='Added to the fetched market rate to set buy_rate automatically, e.g. -1.00 to buy ₹1 below market. Only used when auto-update is on.',
    )

    class Meta:
        ordering = ['display_order', 'code']
        verbose_name_plural = 'currencies'
        unique_together = [('code', 'rate_type')]

    def __str__(self):
        return f'{self.code} — {self.name} ({self.get_rate_type_display()})'
