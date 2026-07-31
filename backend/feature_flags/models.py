from django.db import models


class FeatureFlag(models.Model):
    """A named on/off switch the frontend checks before rendering a feature.

    Add a row here to gate a new feature — no migration needed unless the
    feature needs more than on/off. `key` is what code checks against and
    must never be renamed once a frontend reads it; `name`/`description`
    are for whoever is toggling it in admin.
    """

    key = models.SlugField(
        max_length=60, unique=True,
        help_text="Stable identifier code checks against, e.g. 'exchange_rates_page'. Never rename once shipped.",
    )
    name = models.CharField(max_length=80, help_text="Human label shown in admin, e.g. 'Exchange rates page'.")
    description = models.TextField(
        blank=True,
        help_text='What this controls and where it takes effect — written for whoever toggles it next.',
    )
    is_enabled = models.BooleanField(
        default=True,
        help_text='Off hides the feature on the next page load. No deploy needed.',
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['key']

    def __str__(self):
        return f"{self.key} — {'on' if self.is_enabled else 'off'}"
