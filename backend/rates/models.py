from django.db import models


class Region(models.TextChoices):
    EUROPE = 'Europe', 'Europe'
    ASIA_PACIFIC = 'Asia-Pacific', 'Asia-Pacific'
    MIDDLE_EAST = 'Middle East', 'Middle East'
    AMERICAS = 'Americas', 'Americas'


class Currency(models.Model):
    code = models.CharField(max_length=3, unique=True, help_text='ISO currency code, e.g. USD')
    name = models.CharField(max_length=60, help_text='Full name, e.g. US Dollar')
    country_code = models.CharField(max_length=2, help_text='ISO country code for the badge, e.g. US')
    region = models.CharField(max_length=20, choices=Region.choices, default=Region.ASIA_PACIFIC)
    buy_rate = models.DecimalField(max_digits=10, decimal_places=4, help_text='We buy at this rate (INR)')
    sell_rate = models.DecimalField(max_digits=10, decimal_places=4, help_text='We sell at this rate (INR)')
    change_pct = models.DecimalField(max_digits=6, decimal_places=2, default=0, help_text='24h change, percent')
    is_popular = models.BooleanField(default=False, help_text='Show on the homepage board and ticker')
    is_visible = models.BooleanField(default=True, help_text='Show this currency anywhere in the UI (rate table, converter, homepage board). Untick to hide it without deleting it.')
    display_order = models.PositiveIntegerField(default=0, help_text='Lower numbers appear first in the rate table')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['display_order', 'code']
        verbose_name_plural = 'currencies'

    def __str__(self):
        return f'{self.code} — {self.name}'


class ConverterSetting(models.Model):
    """Singleton row holding values the converter needs beyond the raw buy/sell rates."""
    service_fee_percent = models.DecimalField(
        max_digits=5, decimal_places=2, default=0.4,
        help_text='Fee charged on top of the exchange rate, as a percent (e.g. 0.4 = 0.4%)',
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'converter setting'
        verbose_name_plural = 'converter settings'

    def __str__(self):
        return f'Service fee: {self.service_fee_percent}%'

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        pass

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
