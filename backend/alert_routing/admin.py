from django.contrib import admin

from .models import LeadAlertRule


@admin.register(LeadAlertRule)
class LeadAlertRuleAdmin(admin.ModelAdmin):
    """A checklist, not a normal CRUD list: exactly one row per lead kind (seeded by migration),
    so add/delete are disabled — staff can only flip the Telegram checkbox for a row that already
    represents a real kind of lead."""

    list_display = ('kind_label', 'telegram_enabled', 'updated_at')
    list_editable = ('telegram_enabled',)
    ordering = ('kind_label',)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
