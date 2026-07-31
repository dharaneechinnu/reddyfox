from decimal import Decimal

from django.conf import settings
from django.contrib import admin
from django.utils import timezone
from django.utils.html import format_html

from reference_rates.models import ReferenceRate

from .models import Currency


@admin.register(Currency)
class CurrencyAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'rate_type', 'region', 'buy_rate', 'sell_rate', 'change_pct', 'market_reference', 'is_popular', 'is_visible', 'display_order', 'updated_at')
    list_editable = ('buy_rate', 'sell_rate', 'change_pct', 'is_popular', 'is_visible', 'display_order')
    list_filter = ('rate_type', 'region', 'is_popular', 'is_visible')
    search_fields = ('code', 'name')
    ordering = ('display_order', 'code')

    def get_queryset(self, request):
        # One query for every reference rate on the page, instead of one per row.
        self._reference_rates = {rr.code: rr for rr in ReferenceRate.objects.all()}
        return super().get_queryset(request)

    def market_reference(self, obj):
        """Read-only guidance column: a third-party mid-market rate, never a price.

        This is a typo guard for staff entering buy_rate/sell_rate by hand — it never blocks a
        save. See docs/currency-rate-apis.md for why we don't publish this figure directly.
        """
        ref = getattr(self, '_reference_rates', {}).get(obj.code)
        if ref is None:
            return format_html('<span style="color:#999">{}</span>', 'no reference')

        stale_after = timezone.timedelta(hours=settings.REFERENCE_RATE_STALE_AFTER_HOURS)
        age = timezone.now() - ref.fetched_at
        if age > stale_after:
            return format_html(
                '<span style="color:#999" title="{}">stale ({} ago)</span>',
                ref.inr_rate, _format_age(age),
            )

        # DecimalField values round-trip as Decimal from the DB, but the field also accepts a
        # plain str before the first save/refresh (e.g. Model(sell_rate='84.00')) — cast rather
        # than assume, so this never breaks on an object that hasn't been reloaded from the DB.
        sell_rate = Decimal(obj.sell_rate)
        divergence_pct = abs(sell_rate - ref.inr_rate) / ref.inr_rate * 100
        color = '#c0392b' if divergence_pct >= settings.REFERENCE_RATE_DIVERGENCE_WARN_PCT else '#2e7d32'
        return format_html(
            '<span style="color:{}" title="source: {}">{} ({} ago, {}% off sell)</span>',
            color, ref.source, ref.inr_rate, _format_age(age), f'{divergence_pct:.1f}',
        )
    market_reference.short_description = 'Market ref'


def _format_age(delta):
    minutes = int(delta.total_seconds() // 60)
    if minutes < 60:
        return f'{minutes}m'
    hours = minutes // 60
    if hours < 24:
        return f'{hours}h'
    return f'{hours // 24}d'
