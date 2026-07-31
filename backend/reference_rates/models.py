from django.db import models


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
