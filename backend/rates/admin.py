from django.contrib import admin
from .models import Currency, ConverterSetting


@admin.register(Currency)
class CurrencyAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'region', 'buy_rate', 'sell_rate', 'change_pct', 'is_popular', 'is_visible', 'display_order', 'updated_at')
    list_editable = ('buy_rate', 'sell_rate', 'change_pct', 'is_popular', 'is_visible', 'display_order')
    list_filter = ('region', 'is_popular', 'is_visible')
    search_fields = ('code', 'name')
    ordering = ('display_order', 'code')


@admin.register(ConverterSetting)
class ConverterSettingAdmin(admin.ModelAdmin):
    list_display = ('service_fee_percent', 'updated_at')

    def has_add_permission(self, request):
        # Singleton: only ever one row, auto-created on first access.
        return not ConverterSetting.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False
