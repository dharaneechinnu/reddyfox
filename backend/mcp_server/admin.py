"""Managing MCP tokens from the admin.

The secret is generated on save and shown once, in a message at the top of the
page. There is nowhere to look it up afterwards — only its hash is stored — so
the message says to copy it now, and issuing a replacement is the recovery
path.
"""
from django.contrib import admin, messages
from django.utils.html import format_html

from .models import McpCallLog, McpToken, generate_token


@admin.register(McpToken)
class McpTokenAdmin(admin.ModelAdmin):
    list_display = ('name', 'token_hint', 'scopes_display', 'status', 'last_used_at', 'created_at')
    list_filter = ('is_active', 'can_read', 'can_write_images', 'can_write_content')
    search_fields = ('name',)
    readonly_fields = ('token_hint', 'last_used_at', 'created_at')

    fieldsets = (
        (None, {
            'fields': ('name', 'is_active', 'expires_at'),
            'description': (
                'A credential that lets Claude or ChatGPT read and edit website content. '
                'The token itself is shown once, when you first save this page.'
            ),
        }),
        ('What it may do', {
            'fields': ('can_read', 'can_write_images', 'can_write_content'),
            'description': (
                'Grant the least it needs. A token can only see the tools its scopes cover, '
                'so a read-only token is not tempted to try writing.'
            ),
        }),
        ('Audit', {'fields': ('token_hint', 'last_used_at', 'created_at')}),
    )

    @admin.display(description='Scopes')
    def scopes_display(self, obj):
        return ', '.join(obj.scopes) or '—'

    @admin.display(description='Status')
    def status(self, obj):
        if not obj.is_active:
            return format_html('<span style="color:#b3261e;">Revoked</span>')
        if obj.is_expired:
            return format_html('<span style="color:#b3261e;">Expired</span>')
        return format_html('<span style="color:#146c2e;">Active</span>')

    def save_model(self, request, obj, form, change):
        issued = None
        if not change:
            issued = generate_token()
            obj.set_token(issued)
        super().save_model(request, obj, form, change)

        if issued:
            self.message_user(
                request,
                format_html(
                    'Token for <strong>{}</strong> — copy it now, it is not stored and cannot be '
                    'shown again:<br><code style="user-select:all;font-size:13px;">{}</code>',
                    obj.name, issued,
                ),
                level=messages.WARNING,
            )

    @admin.action(description='Revoke selected tokens')
    def revoke(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f'Revoked {updated} token(s).')

    actions = ['revoke']


@admin.register(McpCallLog)
class McpCallLogAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'token_name', 'tool', 'status', 'detail')
    list_filter = ('status', 'tool', 'created_at')
    search_fields = ('token_name', 'tool', 'detail')
    date_hierarchy = 'created_at'

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        # An audit trail nobody can edit is worth more than one they can.
        return False
