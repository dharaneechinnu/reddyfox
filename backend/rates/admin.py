from django.contrib import admin
from .models import Currency


@admin.register(Currency)
class CurrencyAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'rate_type', 'region', 'buy_rate', 'sell_rate', 'change_pct', 'is_popular', 'is_visible', 'display_order', 'updated_at')
    list_editable = ('buy_rate', 'sell_rate', 'change_pct', 'is_popular', 'is_visible', 'display_order')
    list_filter = ('rate_type', 'region', 'is_popular', 'is_visible')
    search_fields = ('code', 'name')
    ordering = ('display_order', 'code')
