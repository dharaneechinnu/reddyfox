from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
from django.contrib import admin, messages
from django.http import JsonResponse
from django.urls import path
from django.utils import timezone
from django.utils.html import format_html

from fx_providers.providers import fetch_with_fallback
from reference_rates.models import ReferenceRate, ReferenceRateSettings
from reference_rates.services import refresh_reference_rates

from .currency_metadata import CURRENCY_METADATA
from .models import Currency

TWO_PLACES = Decimal('0.01')


@admin.register(Currency)
class CurrencyAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'rate_type', 'region', 'buy_rate', 'sell_rate', 'change_pct', 'market_reference', 'is_popular', 'is_visible', 'display_order', 'updated_at')
    list_editable = ('buy_rate', 'sell_rate', 'change_pct', 'is_popular', 'is_visible', 'display_order')
    list_filter = ('rate_type', 'region', 'is_popular', 'is_visible')
    search_fields = ('code', 'name')
    ordering = ('display_order', 'code')
    actions = ['fetch_reference_rates_now']
    change_list_template = 'admin/rates/currency/change_list.html'
    fields = (
        'code', 'name', 'country_code', 'region', 'rate_type',
        'buy_rate', 'sell_rate', 'change_pct',
        'is_popular', 'is_visible', 'display_order',
    )

    class Media:
        # Vanilla JS, no build step — looks up the market rate for whatever code staff just
        # typed and shows it as a suggestion next to buy_rate/sell_rate. Never fills the fields
        # itself; staff click "Use suggestion" to accept it, same "guidance, not a price" rule
        # as the Market ref column (see docs/currency-rate-apis.md).
        js = ('rates/currency_rate_lookup.js',)

    def get_urls(self):
        custom = [
            path(
                'lookup-rate/',
                self.admin_site.admin_view(self.lookup_rate_view),
                name='rates_currency_lookup_rate',
            ),
        ]
        return custom + super().get_urls()

    def lookup_rate_view(self, request):
        """Called from the add/change form's JS as soon as staff finish typing a currency code.
        Live-fetches that one code from the configured providers and returns a suggested
        buy/sell — informational only, never written anywhere until staff explicitly save."""
        if not request.user.has_perm('rates.add_currency'):
            return JsonResponse({'ok': False, 'error': 'Permission denied.'}, status=403)

        code = request.GET.get('code', '').strip().upper()
        if len(code) != 3 or not code.isalpha():
            return JsonResponse({'ok': False, 'error': 'Enter a 3-letter currency code, e.g. BHD.'})

        settings_obj = ReferenceRateSettings.load()
        try:
            results = fetch_with_fallback([code], primary=settings_obj.primary_provider)
        except Exception:
            return JsonResponse({'ok': False, 'error': 'Could not reach any reference-rate provider right now.'})

        if code not in results:
            return JsonResponse({
                'ok': False,
                'error': f'No market rate found for {code} from exchangerate-api, fawazahmed0, or Frankfurter.',
            })

        rate, source = results[code]
        market_rate = Decimal(str(rate))
        suggested_buy = (market_rate + settings_obj.buy_margin).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
        suggested_sell = (market_rate + settings_obj.sell_margin).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)

        # Name/country/region come from a small static ISO table, not from any rate provider —
        # none of their basic endpoints return currency metadata. A code missing from that table
        # just means those three fields aren't suggested; the rate suggestion above is unaffected.
        name, country_code, region = CURRENCY_METADATA.get(code, (None, None, None))

        return JsonResponse({
            'ok': True,
            'code': code,
            'rate': str(market_rate.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)),
            'source': source,
            'suggested_buy': str(suggested_buy),
            'suggested_sell': str(suggested_sell),
            'name': name,
            'country_code': country_code,
            'region': region,
        })

    @admin.action(description='Fetch reference rates now, and apply if auto-update is on')
    def fetch_reference_rates_now(self, request, queryset):
        """Manual equivalent of the scheduled `fetch_reference_rates` command — same underlying
        call, so a click and a cron tick always produce the same result. Margin configuration
        itself lives on the reference_rates app's own admin screen, not here."""
        summary = refresh_reference_rates()
        if not summary['ok']:
            self.message_user(request, 'All reference-rate providers failed — nothing was updated.', level=messages.ERROR)
            return

        text = f'Fetched {summary["fetched"]} reference rates, applied to {summary["applied"]} currencies.'
        if summary['missing']:
            text += f' No reference available for: {", ".join(summary["missing"])}.'
        self.message_user(request, text, level=messages.SUCCESS if not summary['missing'] else messages.WARNING)

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

        # ReferenceRate stores 6 decimal places for fetch-time precision, but every place this
        # figure is shown to staff is a rounded, 2-decimal INR amount to match buy_rate/sell_rate.
        ref_rate = ref.inr_rate.quantize(Decimal('0.01'))

        stale_after = timezone.timedelta(hours=settings.REFERENCE_RATE_STALE_AFTER_HOURS)
        age = timezone.now() - ref.fetched_at
        if age > stale_after:
            return format_html(
                '<span style="color:#999" title="{}">stale ({} ago)</span>',
                ref_rate, _format_age(age),
            )

        # DecimalField values round-trip as Decimal from the DB, but the field also accepts a
        # plain str before the first save/refresh (e.g. Model(sell_rate='84.00')) — cast rather
        # than assume, so this never breaks on an object that hasn't been reloaded from the DB.
        sell_rate = Decimal(obj.sell_rate)
        divergence_pct = abs(sell_rate - ref.inr_rate) / ref.inr_rate * 100
        color = '#c0392b' if divergence_pct >= settings.REFERENCE_RATE_DIVERGENCE_WARN_PCT else '#2e7d32'
        return format_html(
            '<span style="color:{}" title="source: {}">{} ({} ago, {}% off sell)</span>',
            color, ref.source, ref_rate, _format_age(age), f'{divergence_pct:.1f}',
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
