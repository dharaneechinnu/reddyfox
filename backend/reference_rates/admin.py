from django.contrib import admin

from .models import ReferenceRate


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
