from decimal import Decimal

from django import forms
from django.conf import settings
from django.contrib import admin, messages
from django.shortcuts import redirect
from django.template.response import TemplateResponse
from django.urls import path
from django.utils import timezone
from django.utils.html import format_html

from reference_rates.models import ReferenceRate, ReferenceRateSettings
from reference_rates.services import refresh_reference_rates

from .models import Currency


class ReferenceRateSettingsForm(forms.ModelForm):
    class Meta:
        model = ReferenceRateSettings
        fields = ['auto_update_enabled', 'buy_margin', 'sell_margin']


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
        """A settings-only screen: the one global margin config (same for every currency) and a
        "Save & fetch now" button — nothing else on it.

        The result of a fetch is *not* shown here — it's on the Currency list itself (buy_rate,
        sell_rate, and the "Market ref" column), which is where saving redirects back to. Keeping
        this screen to just the inputs is deliberate: configuring margins and reviewing rates are
        two different jobs, so they get two different screens.
        """
        if not request.user.has_perm('rates.change_currency'):
            self.message_user(request, "You don't have permission to change currencies.", level=messages.ERROR)
            return redirect('admin:index')

        settings_obj = ReferenceRateSettings.load()

        if request.method == 'POST':
            form = ReferenceRateSettingsForm(request.POST, instance=settings_obj)
            if form.is_valid():
                form.save()
                summary = refresh_reference_rates()
                if summary['ok']:
                    text = f'Saved settings. Fetched {summary["fetched"]} reference rates, applied to {summary["applied"]} currencies.'
                    if summary['missing']:
                        text += f' No reference available for: {", ".join(summary["missing"])}.'
                    self.message_user(request, text, level=messages.SUCCESS if not summary['missing'] else messages.WARNING)
                else:
                    self.message_user(request, 'Settings saved, but all reference-rate providers failed — rates were not updated.', level=messages.ERROR)
                return redirect('admin:rates_currency_changelist')
        else:
            form = ReferenceRateSettingsForm(instance=settings_obj)

        context = {
            **self.admin_site.each_context(request),
            'title': 'Reference rate settings',
            'opts': self.model._meta,
            'form': form,
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
