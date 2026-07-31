from django import forms
from django.contrib import admin, messages
from django.shortcuts import redirect
from django.template.response import TemplateResponse

from rates.models import Currency

from .models import ReferenceRate, ReferenceRateSettings
from .services import refresh_reference_rates


@admin.register(ReferenceRate)
class ReferenceRateAdmin(admin.ModelAdmin):
    list_display = ('code', 'inr_rate', 'source', 'fetched_at')
    search_fields = ('code',)
    ordering = ('code',)

    def has_add_permission(self, request):
        # Written only by fetch_reference_rates; a hand-added row would look real but never refresh.
        return False

    def has_change_permission(self, request, obj=None):
        return False


class ReferenceRateSettingsForm(forms.ModelForm):
    class Meta:
        model = ReferenceRateSettings
        fields = ['auto_update_enabled', 'buy_margin', 'sell_margin']


@admin.register(ReferenceRateSettings)
class ReferenceRateSettingsAdmin(admin.ModelAdmin):
    """Singleton — one row, auto-created, never deleted (same pattern as content.SiteSetting).

    The whole "Reference rates & margins" screen lives here, as this app's own admin surface,
    rather than as a sub-page bolted onto rates.CurrencyAdmin: the margin config, the
    "Save & fetch now" action, and — on the same page after saving — a table of the result. The
    default Django add/change form is replaced entirely (see changelist_view below) since one
    combined screen serves this model's one row better than the standard list-then-edit flow.
    """

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def get_model_perms(self, request):
        # Empty dict = this model is left out of the admin index/app-list entirely (no
        # "Reference rate settings" row under the Reference rates app). The URL below still
        # works — it's only reachable via the "Reference rates & margins" button on the Currency
        # changelist, which is the one place this screen is meant to be opened from. The real
        # permission check happens explicitly in changelist_view, not here.
        return {}

    def changelist_view(self, request, extra_context=None):
        if not request.user.has_perm('reference_rates.change_referenceratesettings'):
            self.message_user(request, "You don't have permission to change reference rate settings.", level=messages.ERROR)
            return redirect('admin:index')

        settings_obj = ReferenceRateSettings.load()

        if request.method == 'POST':
            form = ReferenceRateSettingsForm(request.POST, instance=settings_obj)
            if form.is_valid():
                form.save()
                summary = refresh_reference_rates()
                if summary['ok']:
                    text = f'Fetched {summary["fetched"]} reference rates, applied to {summary["applied"]} currencies.'
                    if summary['missing']:
                        text += f' No reference available for: {", ".join(summary["missing"])}.'
                    self.message_user(request, text, level=messages.SUCCESS if not summary['missing'] else messages.WARNING)
                else:
                    self.message_user(request, 'Settings saved, but all reference-rate providers failed — rates were not updated.', level=messages.ERROR)
                # Redirect to self (not the Currency changelist) — same screen shows the
                # calculated result right below the form, so there's nowhere else to send them.
                return redirect('admin:reference_rates_referenceratesettings_changelist')
        else:
            form = ReferenceRateSettingsForm(instance=settings_obj)

        reference_rates = {rr.code: rr for rr in ReferenceRate.objects.all()}
        currencies = Currency.objects.order_by('display_order', 'code')
        rows = [
            {'currency': currency, 'reference': reference_rates.get(currency.code)}
            for currency in currencies
        ]

        context = {
            **self.admin_site.each_context(request),
            'title': 'Reference rates & margins',
            'opts': self.model._meta,
            'form': form,
            'rows': rows,
            'settings_obj': settings_obj,
        }
        return TemplateResponse(request, 'admin/reference_rates/referenceratesettings/changelist.html', context)
