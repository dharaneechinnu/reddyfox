from django.contrib import admin, messages
from django.utils import timezone
from django.utils.html import format_html

from .models import TelegramDelivery, TelegramInvite, TelegramSubscriber
from .qrcode_utils import qr_data_uri


@admin.register(TelegramSubscriber)
class TelegramSubscriberAdmin(admin.ModelAdmin):
    list_display = ('name', 'chat_id', 'is_active', 'added_at')
    list_editable = ('is_active',)
    search_fields = ('name', 'chat_id')
    list_filter = ('is_active',)
    ordering = ('name',)


@admin.register(TelegramInvite)
class TelegramInviteAdmin(admin.ModelAdmin):
    """Create one of these, get a QR code back. See docs/telegram-bot.md — this is the primary
    onboarding path; manual chat_id lookup (TelegramSubscriber, added directly) stays as a
    documented fallback for local dev or if scanning isn't practical.

    Only `label` is ever hand-entered — token/status/expiry are generated, and everything about
    an invite becomes read-only the moment it's created. The QR itself is rendered inline as a
    read-only field rather than a separate view, so creating an invite and seeing its code is one
    screen, one save.
    """

    list_display = ('label', 'status_display', 'expires_at', 'claimed_by', 'created_at')
    list_filter = ('status',)
    search_fields = ('label', 'token')
    ordering = ('-created_at',)
    actions = ['revoke_invites']
    readonly_fields = ('token', 'status', 'expires_at', 'claimed_by', 'created_at', 'qr_code_display', 'deep_link_display')

    def get_fields(self, request, obj=None):
        if obj is None:
            return ['label']
        return ['label', 'status', 'expires_at', 'claimed_by', 'created_at', 'deep_link_display', 'qr_code_display']

    @admin.display(description='Status')
    def status_display(self, obj):
        if obj.is_expired:
            return format_html('<span style="color:#999">expired</span>')
        color = {'pending': '#b3541e', 'claimed': '#2e7d32', 'revoked': '#999'}.get(obj.status, '#999')
        return format_html('<span style="color:{}">{}</span>', color, obj.get_status_display())

    @admin.display(description='Invite link')
    def deep_link_display(self, obj):
        link = obj.deep_link
        if not link:
            return format_html('<span style="color:#a4322a">Set TELEGRAM_BOT_USERNAME to generate a link.</span>')
        return format_html('<a href="{}" target="_blank" rel="noreferrer">{}</a>', link, link)

    @admin.display(description='QR code')
    def qr_code_display(self, obj):
        link = obj.deep_link
        if not link:
            return '—'
        if not obj.is_claimable:
            return format_html('<span style="color:#999">(no longer claimable — {})</span>', obj.get_status_display())
        return format_html('<img src="{}" alt="Scan with Telegram to onboard {}" style="width:220px;height:220px">', qr_data_uri(link), obj.label)

    @admin.action(description='Revoke selected invites (unclaimed only)')
    def revoke_invites(self, request, queryset):
        updated = queryset.filter(status=TelegramInvite.Status.PENDING).update(status=TelegramInvite.Status.REVOKED)
        self.message_user(request, f'Revoked {updated} invite(s).', level=messages.SUCCESS)


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
