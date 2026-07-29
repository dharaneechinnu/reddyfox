from django.contrib import admin, messages
from django.utils import timezone
from django.utils.html import format_html

from .models import Enquiry, Faq, FaqCategory, Lead, QuoteRequest, RateLock, SiteSetting, Testimonial


@admin.register(Testimonial)
class TestimonialAdmin(admin.ModelAdmin):
    list_display = ('name', 'role', 'short_quote', 'is_visible', 'display_order', 'updated_at')
    list_editable = ('is_visible', 'display_order')
    list_filter = ('is_visible',)
    search_fields = ('name', 'quote', 'role')
    ordering = ('display_order', 'pk')
    fieldsets = (
        (None, {'fields': ('quote',)}),
        ('Attribution', {'fields': ('name', 'role', 'initials')}),
        ('Visibility', {'fields': ('is_visible', 'display_order')}),
    )

    @admin.display(description='Quote')
    def short_quote(self, obj):
        return obj.quote[:60] + ('…' if len(obj.quote) > 60 else '')


@admin.register(FaqCategory)
class FaqCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'display_order', 'faq_count')
    list_editable = ('display_order',)
    search_fields = ('name',)
    ordering = ('display_order', 'name')

    @admin.display(description='Questions')
    def faq_count(self, obj):
        return obj.faqs.count()


@admin.register(Faq)
class FaqAdmin(admin.ModelAdmin):
    list_display = ('question', 'category', 'is_visible', 'show_on_homepage', 'display_order', 'updated_at')
    list_editable = ('is_visible', 'show_on_homepage', 'display_order')
    list_filter = ('is_visible', 'show_on_homepage', 'category')
    search_fields = ('question', 'answer')
    ordering = ('display_order', 'pk')
    fieldsets = (
        (None, {'fields': ('question', 'answer')}),
        ('Placement & visibility', {
            'fields': ('category', 'is_visible', 'show_on_homepage', 'display_order'),
        }),
    )


STATUS_COLOURS = {
    'new': ('#FBEDE9', '#B4351F'),
    'contacted': ('#FDF6E3', '#8A6A11'),
    'quoted': ('#EAF6F0', '#1C7A50'),
    'closed': ('#F1EEE9', '#6B7688'),
    'spam': ('#EFECE7', '#A9A296'),
}


class BaseLeadAdmin(admin.ModelAdmin):
    """Shared behaviour for the three lead inboxes.

    The customer's own words are read-only — this is a record of what they asked
    for. Staff only change status, assignment and the internal note, so there is
    never a dispute about what was requested or quoted.
    """

    list_display_links = ('name',)
    list_editable = ('assigned_to',)
    date_hierarchy = 'created_at'
    list_per_page = 50
    ordering = ('-created_at',)
    actions = ('mark_contacted', 'mark_quoted', 'mark_closed', 'mark_spam')
    search_fields = ('name', 'phone', 'email', 'message')

    customer_fields = ('name', 'phone', 'email', 'message')
    audit_fields = ('created_at', 'contacted_at', 'notified_at', 'updated_at', 'source_ip')

    def has_add_permission(self, request):
        # Leads only ever arrive via the website forms.
        return False

    def get_readonly_fields(self, request, obj=None):
        return tuple(self.customer_fields) + tuple(self.audit_fields) + ('reply_links',)

    # --- shared columns ---
    @admin.display(description='Status', ordering='status')
    def status_badge(self, obj):
        bg, fg = STATUS_COLOURS.get(obj.status, ('#EEE', '#333'))
        return format_html(
            '<span style="background:{};color:{};padding:3px 9px;border-radius:5px;'
            'font-size:11px;font-weight:600;white-space:nowrap">{}</span>',
            bg, fg, obj.get_status_display().upper(),
        )

    @admin.display(description='Received', ordering='created_at')
    def received(self, obj):
        mins = int((timezone.now() - obj.created_at).total_seconds() // 60)
        if mins < 1:
            rel = 'just now'
        elif mins < 60:
            rel = f'{mins} min ago'
        elif mins < 1440:
            rel = f'{mins // 60} hr ago'
        else:
            rel = f'{mins // 1440} d ago'
        # Untouched leads older than an hour are the ones that lose business.
        urgent = obj.status == Lead.Status.NEW and mins >= 60
        return format_html(
            '<span title="{}" style="{}">{}</span>',
            timezone.localtime(obj.created_at).strftime('%d %b %Y, %H:%M'),
            'color:#B4351F;font-weight:600' if urgent else '',
            rel,
        )

    @admin.display(description='Phone')
    def phone_links(self, obj):
        parts = [format_html('<span style="font-family:monospace">+91 {}</span>', obj.phone)]
        if obj.tel_url:
            parts.append(format_html('<a href="{}">call</a>', obj.tel_url))
        if obj.whatsapp_url:
            parts.append(format_html(
                '<a href="{}" target="_blank" rel="noreferrer" style="color:#1C7A50">WhatsApp</a>',
                obj.whatsapp_url,
            ))
        return format_html('&nbsp;·&nbsp;'.join(['{}'] * len(parts)), *parts)

    @admin.display(description='Reply to this customer')
    def reply_links(self, obj):
        if not obj.pk:
            return '—'
        bits = []
        if obj.whatsapp_url:
            bits.append(format_html(
                '<a class="button" href="{}" target="_blank" rel="noreferrer">Reply on WhatsApp</a>',
                obj.whatsapp_url,
            ))
        if obj.tel_url:
            bits.append(format_html('<a class="button" href="{}">Call +91 {}</a>', obj.tel_url, obj.phone))
        bits.append(format_html(
            '<a class="button" href="mailto:{}?subject={}">Email reply</a>',
            obj.email, 'Re: your request to Reddy Forex',
        ))
        return format_html(
            '<div style="display:flex;gap:8px;flex-wrap:wrap">{}</div>',
            format_html(' '.join(['{}'] * len(bits)), *bits),
        )

    # --- bulk actions ---
    def _bulk_set(self, request, queryset, new_status, label):
        updated = 0
        for lead in queryset:
            lead.status = new_status
            lead.save()  # via save() so contacted_at gets stamped
            updated += 1
        self.message_user(request, f'{updated} record(s) marked {label}.', messages.SUCCESS)

    @admin.action(description='Mark as Contacted')
    def mark_contacted(self, request, queryset):
        self._bulk_set(request, queryset, Lead.Status.CONTACTED, 'contacted')

    @admin.action(description='Mark as Quoted')
    def mark_quoted(self, request, queryset):
        self._bulk_set(request, queryset, Lead.Status.QUOTED, 'quoted')

    @admin.action(description='Mark as Closed')
    def mark_closed(self, request, queryset):
        self._bulk_set(request, queryset, Lead.Status.CLOSED, 'closed')

    @admin.action(description='Mark as Spam')
    def mark_spam(self, request, queryset):
        self._bulk_set(request, queryset, Lead.Status.SPAM, 'spam')


@admin.register(Enquiry)
class EnquiryAdmin(BaseLeadAdmin):
    """Front office inbox — general contact-form enquiries."""

    list_display = ('status_badge', 'received', 'name', 'phone_links', 'email', 'service', 'assigned_to')
    list_filter = ('status', 'service', 'assigned_to', 'created_at')
    customer_fields = ('name', 'phone', 'email', 'service', 'message')
    fieldsets = (
        ('Customer enquiry', {'fields': ('name', 'phone', 'email', 'service', 'message', 'reply_links')}),
        ('Handling', {'fields': ('status', 'assigned_to', 'internal_note')}),
        ('Audit', {'classes': ('collapse',),
                   'fields': ('created_at', 'contacted_at', 'notified_at', 'updated_at', 'source_ip')}),
    )


@admin.register(QuoteRequest)
class QuoteRequestAdmin(BaseLeadAdmin):
    """Quotes desk — customers asking for a price."""

    list_display = ('status_badge', 'received', 'name', 'phone_links', 'wants', 'needed_by', 'assigned_to')
    list_filter = ('status', 'service', 'from_currency', 'assigned_to', 'created_at')
    customer_fields = ('name', 'phone', 'email', 'service', 'from_currency', 'amount', 'needed_by', 'message')
    fieldsets = (
        ('Customer', {'fields': ('name', 'phone', 'email', 'reply_links')}),
        ('What to price', {'fields': ('service', 'from_currency', 'amount', 'needed_by', 'message')}),
        ('Handling', {'fields': ('status', 'assigned_to', 'internal_note')}),
        ('Audit', {'classes': ('collapse',),
                   'fields': ('created_at', 'contacted_at', 'notified_at', 'updated_at', 'source_ip')}),
    )

    @admin.display(description='Wants')
    def wants(self, obj):
        amount = f'{obj.amount:,.2f}' if obj.amount is not None else '—'
        return format_html(
            '<span style="font-family:monospace">{} {}</span>'
            '<br><span style="font-size:11px;color:#666">{}</span>',
            amount, obj.from_currency or '', obj.service or '',
        )


@admin.register(RateLock)
class RateLockAdmin(BaseLeadAdmin):
    """Rates desk — customers who locked a rate in the converter.

    The only type with an expiry, so the list leads with a countdown: an expired
    lock is no longer honourable and shows in red.
    """

    list_display = ('status_badge', 'lock_state', 'received', 'name', 'phone_links', 'pair', 'assigned_to')
    list_filter = ('status', 'from_currency', 'to_currency', 'assigned_to', 'created_at')
    customer_fields = (
        'name', 'phone', 'email', 'from_currency', 'to_currency',
        'amount', 'quoted_rate', 'converted_amount', 'message',
    )
    audit_fields = ('lock_expires_at', 'created_at', 'contacted_at', 'notified_at', 'updated_at', 'source_ip')
    fieldsets = (
        ('Customer', {'fields': ('name', 'phone', 'email', 'reply_links')}),
        ('Rate the customer locked', {
            'fields': ('from_currency', 'to_currency', 'amount', 'quoted_rate',
                       'converted_amount', 'lock_expires_at', 'message'),
            'description': 'Exactly what the converter showed them. Compare against the current board before confirming.',
        }),
        ('Handling', {'fields': ('status', 'assigned_to', 'internal_note')}),
        ('Audit', {'classes': ('collapse',),
                   'fields': ('created_at', 'contacted_at', 'notified_at', 'updated_at', 'source_ip')}),
    )

    @admin.display(description='Lock', ordering='lock_expires_at')
    def lock_state(self, obj):
        if not obj.lock_expires_at:
            return '—'
        if obj.is_expired:
            return format_html(
                '<span style="background:#FBEDE9;color:#B4351F;padding:3px 9px;border-radius:5px;'
                'font-size:11px;font-weight:600">EXPIRED</span>'
            )
        return format_html(
            '<span title="{}" style="background:#EAF6F0;color:#1C7A50;padding:3px 9px;'
            'border-radius:5px;font-size:11px;font-weight:600;white-space:nowrap">{}</span>',
            timezone.localtime(obj.lock_expires_at).strftime('%d %b %Y, %H:%M'),
            obj.expires_in.upper(),
        )

    @admin.display(description='Locked rate')
    def pair(self, obj):
        return format_html(
            '<span style="font-family:monospace">{} {} → {}</span>'
            '<br><span style="font-size:11px;color:#666">@ {} = {} {}</span>',
            f'{obj.amount:,.2f}' if obj.amount is not None else '—',
            obj.from_currency, obj.to_currency,
            f'{obj.quoted_rate:,.4f}' if obj.quoted_rate is not None else '—',
            f'{obj.converted_amount:,.2f}' if obj.converted_amount is not None else '—',
            obj.to_currency,
        )


@admin.register(SiteSetting)
class SiteSettingAdmin(admin.ModelAdmin):
    """Singleton — one row, auto-created, never deleted."""

    list_display = ('__str__', 'whatsapp_number', 'whatsapp_enabled', 'rate_lock_hours', 'updated_at')
    readonly_fields = ('updated_at', 'preview_link')
    fieldsets = (
        ('Rate lock', {
            'fields': ('rate_lock_hours',),
            'description': 'How long a locked rate stays valid. The customer is told the exact expiry time, '
                           'and the Rate locks list shows a live countdown.',
        }),
        ('Who gets alerted', {
            'fields': ('notify_enquiries', 'notify_quotes', 'notify_rate_locks'),
            'description': 'Comma-separated email addresses per request type. Leave a field blank to fall back to '
                           'the default from the environment — a blank field never means nobody is told.',
        }),
        ('WhatsApp — offered to customers after they send a request', {
            'fields': (
                'whatsapp_enabled', 'whatsapp_number',
                'whatsapp_label', 'whatsapp_greeting', 'preview_link',
            ),
            'description': 'Change the number here and the website picks it up on the next page load — no deploy needed.',
        }),
        (None, {'fields': ('updated_at',)}),
    )

    def has_add_permission(self, request):
        return not SiteSetting.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False

    def changelist_view(self, request, extra_context=None):
        # There is only ever one row: make sure it exists so the list is never
        # empty, and staff land straight on the edit form.
        SiteSetting.load()
        return super().changelist_view(request, extra_context)

    @admin.display(description='Test this link')
    def preview_link(self, obj):
        if not obj.pk or not obj.whatsapp_number:
            return 'Save first to get a test link.'
        from urllib.parse import quote
        url = f'https://wa.me/91{obj.whatsapp_number}'
        if obj.whatsapp_greeting:
            url += f'?text={quote(obj.whatsapp_greeting)}'
        return format_html(
            '<a class="button" href="{}" target="_blank" rel="noreferrer">Open this WhatsApp chat</a>'
            '<div style="margin-top:6px;font-size:12px;color:#666">{}</div>',
            url, url,
        )
