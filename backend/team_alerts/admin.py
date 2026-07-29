from django.contrib import admin, messages
from django.utils.html import format_html

from .models import TeamAlert, TeamAlertDelivery, TeamPushSubscriber
from .services import send_team_alert

PRIORITY_COLOURS = {
    'urgent': ('#FBEDE9', '#B4351F'),
    'normal': ('#EAF6F0', '#1C7A50'),
}
STATUS_COLOURS = {
    'draft': ('#F1EEE9', '#6B7688'),
    'sent': ('#EAF6F0', '#1C7A50'),
    'failed': ('#FBEDE9', '#B4351F'),
}
DELIVERY_COLOURS = {
    'success': ('#EAF6F0', '#1C7A50'),
    'failed': ('#FBEDE9', '#B4351F'),
    'skipped': ('#FDF6E3', '#8A6A11'),
}


def _badge(label, bg, fg):
    return format_html(
        '<span style="background:{};color:{};padding:3px 9px;border-radius:5px;'
        'font-size:11px;font-weight:600;white-space:nowrap">{}</span>',
        bg, fg, label.upper(),
    )


@admin.register(TeamPushSubscriber)
class TeamPushSubscriberAdmin(admin.ModelAdmin):
    """Staff browsers subscribed to internal push alerts. Enabled from the
    "Enable push alerts" link in the admin header — staff only ever toggle
    is_active here, e.g. to silence a browser they no longer use."""

    list_display = ('user', 'masked_token', 'is_active', 'failure_count', 'last_notified_at', 'last_seen_at', 'created_at')
    list_editable = ('is_active',)
    list_filter = ('is_active', 'user')
    search_fields = ('user__username', 'user__email', 'fcm_token', 'user_agent')
    ordering = ('-last_seen_at',)
    readonly_fields = ('user', 'fcm_token', 'user_agent', 'created_at', 'last_seen_at', 'last_notified_at', 'failure_count')

    def has_add_permission(self, request):
        # Subscribers only ever arrive via the admin's "Enable push alerts" flow.
        return False


@admin.register(TeamAlert)
class TeamAlertAdmin(admin.ModelAdmin):
    """One row per internal push broadcast. Urgent alerts sort first (they
    bypass the per-staff-member rate limit); Normal ones respect it.

    'Send now' is the manual trigger for a draft created here. New-enquiry
    alerts are created and sent automatically — see team_alerts/signals.py.
    """

    list_display = (
        'title', 'priority_badge', 'lead', 'status_badge',
        'target_count', 'success_count', 'fail_count', 'skipped_count', 'created_at', 'sent_at',
    )
    list_filter = ('priority', 'status')
    search_fields = ('title', 'body')
    ordering = ('-created_at',)
    actions = ('send_now',)
    readonly_fields = (
        'status', 'created_by', 'created_at', 'sent_at', 'lead',
        'target_count', 'success_count', 'fail_count', 'skipped_count',
    )
    fieldsets = (
        (None, {'fields': ('title', 'body', 'priority')}),
        ('Delivery', {
            'fields': (
                'status', 'lead', 'target_count', 'success_count', 'fail_count', 'skipped_count',
                'created_at', 'sent_at', 'created_by',
            ),
        }),
    )

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

    @admin.display(description='Priority', ordering='priority')
    def priority_badge(self, obj):
        bg, fg = PRIORITY_COLOURS.get(obj.priority, ('#EEE', '#333'))
        return _badge(obj.get_priority_display(), bg, fg)

    @admin.display(description='Status', ordering='status')
    def status_badge(self, obj):
        bg, fg = STATUS_COLOURS.get(obj.status, ('#EEE', '#333'))
        return _badge(obj.get_status_display(), bg, fg)

    @admin.action(description='Send now to all eligible staff subscribers')
    def send_now(self, request, queryset):
        sent = 0
        for alert in queryset.exclude(status=TeamAlert.Status.SENT):
            send_team_alert(alert)
            sent += 1
        if sent:
            self.message_user(request, f'{sent} alert(s) sent — see success/fail counts below.', messages.SUCCESS)
        else:
            self.message_user(request, 'Nothing to send — selected alert(s) were already sent.', messages.WARNING)


@admin.register(TeamAlertDelivery)
class TeamAlertDeliveryAdmin(admin.ModelAdmin):
    """Per-staff-member delivery log — the audit trail of every push
    attempt, success, failure or rate-limit skip. The primary place to check
    "did the team actually get pinged about this enquiry"."""

    list_display = ('alert', 'subscriber', 'status_badge', 'fcm_message_id', 'error_message', 'attempted_at')
    list_filter = ('status', 'alert__priority', 'attempted_at')
    search_fields = ('alert__title', 'subscriber__user__username', 'error_message', 'fcm_message_id')
    date_hierarchy = 'attempted_at'
    ordering = ('-attempted_at',)
    list_per_page = 100

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    @admin.display(description='Status', ordering='status')
    def status_badge(self, obj):
        bg, fg = DELIVERY_COLOURS.get(obj.status, ('#EEE', '#333'))
        return _badge(obj.get_status_display(), bg, fg)
