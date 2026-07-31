from decimal import Decimal

from django.conf import settings
from django.contrib import admin, messages
from django.forms import modelformset_factory
from django.shortcuts import redirect
from django.template.response import TemplateResponse
from django.urls import path
from django.utils import timezone
from django.utils.html import format_html

from reference_rates.models import ReferenceRate
from reference_rates.services import refresh_reference_rates

from .models import Currency

# Margin editing lives only on the dedicated "Reference rates & margins" page (see
# reference_rates_view below) — not on the regular Currency change form — so the one workflow for
# "fetch, then decide margins" isn't split across two places.
CurrencyMarginFormSet = modelformset_factory(
    Currency,
    fields=('auto_update_from_reference', 'buy_margin', 'sell_margin'),
    extra=0,
)


@admin.register(Currency)
class CurrencyAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'rate_type', 'region', 'buy_rate', 'sell_rate', 'change_pct', 'market_reference', 'auto_update_from_reference', 'is_popular', 'is_visible', 'display_order', 'updated_at')
    list_editable = ('buy_rate', 'sell_rate', 'change_pct', 'is_popular', 'is_visible', 'display_order')
    list_filter = ('rate_type', 'region', 'is_popular', 'is_visible', 'auto_update_from_reference')
    search_fields = ('code', 'name')
    ordering = ('display_order', 'code')
    actions = ['fetch_reference_rates_now']
    change_list_template = 'admin/rates/currency/change_list.html'
    fields = (
        'code', 'name', 'country_code', 'region', 'rate_type',
        'buy_rate', 'sell_rate', 'change_pct',
        'is_popular', 'is_visible', 'display_order',
    )

    def get_urls(self):
        custom = [
            path(
                'reference-rates/',
                self.admin_site.admin_view(self.reference_rates_view),
                name='rates_currency_reference_rates',
            ),
        ]
        return custom + super().get_urls()

    def reference_rates_view(self, request):
        """Dedicated page: only the margin inputs, plus a fetch-now button.

        Separate from the regular change form on purpose — this is the one workflow ("set margins,
        then fetch") the manual button on the changelist sends staff to.
        """
        if not request.user.has_perm('rates.change_currency'):
            self.message_user(request, "You don't have permission to change currencies.", level=messages.ERROR)
            return redirect('admin:index')

        queryset = Currency.objects.order_by('display_order', 'code')

        if request.method == 'POST':
            formset = CurrencyMarginFormSet(request.POST, queryset=queryset)
            if formset.is_valid():
                formset.save()
                summary = refresh_reference_rates()
                if summary['ok']:
                    text = f'Saved margins. Fetched {summary["fetched"]} reference rates, applied to {summary["applied"]} currencies.'
                    if summary['missing']:
                        text += f' No reference available for: {", ".join(summary["missing"])}.'
                    self.message_user(request, text, level=messages.SUCCESS if not summary['missing'] else messages.WARNING)
                else:
                    self.message_user(request, 'Margins saved, but all reference-rate providers failed — rates were not updated.', level=messages.ERROR)
                return redirect('admin:rates_currency_reference_rates')
        else:
            formset = CurrencyMarginFormSet(queryset=queryset)

        reference_rates = {rr.code: rr for rr in ReferenceRate.objects.all()}
        rows = [
            {'currency': currency, 'form': form, 'reference': reference_rates.get(currency.code)}
            for currency, form in zip(queryset, formset.forms)
        ]

        context = {
            **self.admin_site.each_context(request),
            'title': 'Reference rates & margins',
            'opts': self.model._meta,
            'formset': formset,
            'rows': rows,
        }
        return TemplateResponse(request, 'admin/rates/currency/reference_rates.html', context)

    @admin.action(description='Fetch reference rates now, and apply to auto-update currencies')
    def fetch_reference_rates_now(self, request, queryset):
        """Manual equivalent of the scheduled `fetch_reference_rates` command — same underlying
        call, so a click and a cron tick always produce the same result."""
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
