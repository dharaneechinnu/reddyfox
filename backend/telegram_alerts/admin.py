from django.contrib import admin

from .models import TelegramDelivery, TelegramSubscriber


@admin.register(TelegramSubscriber)
class TelegramSubscriberAdmin(admin.ModelAdmin):
    list_display = ('name', 'chat_id', 'is_active', 'added_at')
    list_editable = ('is_active',)
    search_fields = ('name', 'chat_id')
    list_filter = ('is_active',)
    ordering = ('name',)


@admin.register(TelegramDelivery)
class TelegramDeliveryAdmin(admin.ModelAdmin):
    """Read-only audit log — written only by notify_team_telegram()."""

    list_display = ('lead', 'subscriber', 'status', 'attempted_at')
    list_filter = ('status',)
    search_fields = ('lead__name', 'subscriber__name')
    ordering = ('-attempted_at',)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
