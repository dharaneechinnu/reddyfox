from django.contrib import admin, messages
from django.utils import timezone
from django.utils.html import format_html

from .models import Enquiry, Faq, FaqCategory, Testimonial


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


@admin.register(Enquiry)
class EnquiryAdmin(admin.ModelAdmin):
    """The team's enquiry inbox.

    The customer's own words are read-only — this is a record of what they
    asked for. Staff only change status, assignment and the internal note.
    """

    list_display = (
        'status_badge', 'received', 'name', 'phone_links',
        'email', 'service', 'assigned_to',
    )
    list_display_links = ('name',)
    list_editable = ('assigned_to',)
    list_filter = ('status', 'service', 'assigned_to', 'created_at')
    search_fields = ('name', 'phone', 'email', 'message')
    date_hierarchy = 'created_at'
    list_per_page = 50
    ordering = ('-created_at',)
    actions = ('mark_contacted', 'mark_quoted', 'mark_closed', 'mark_spam')

    # Everything the customer submitted, plus audit trail, is immutable.
    readonly_fields = (
        'name', 'phone', 'email', 'service', 'message',
        'created_at', 'updated_at', 'contacted_at', 'notified_at',
        'source_ip', 'reply_links',
    )
    fieldsets = (
        ('Customer enquiry', {
            'fields': ('name', 'phone', 'email', 'service', 'message', 'reply_links'),
        }),
        ('Handling', {
            'fields': ('status', 'assigned_to', 'internal_note'),
        }),
        ('Audit', {
            'classes': ('collapse',),
            'fields': ('created_at', 'contacted_at', 'notified_at', 'updated_at', 'source_ip'),
        }),
    )

    def has_add_permission(self, request):
        # Enquiries only ever arrive via the website form.
        return False

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
        delta = timezone.now() - obj.created_at
        mins = int(delta.total_seconds() // 60)
        if mins < 1:
            rel = 'just now'
        elif mins < 60:
            rel = f'{mins} min ago'
        elif mins < 1440:
            rel = f'{mins // 60} hr ago'
        else:
            rel = f'{mins // 1440} d ago'
        # Untouched leads older than an hour are the ones that lose business.
        urgent = obj.status == Enquiry.Status.NEW and mins >= 60
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
            obj.email, f'Re: your enquiry to Reddy Forex',
        ))
        return format_html(
            '<div style="display:flex;gap:8px;flex-wrap:wrap">{}</div>',
            format_html(' '.join(['{}'] * len(bits)), *bits),
        )

    # --- bulk actions ---
    def _bulk_set(self, request, queryset, new_status, label):
        updated = 0
        for enquiry in queryset:
            enquiry.status = new_status
            enquiry.save()  # via save() so contacted_at gets stamped
            updated += 1
        self.message_user(request, f'{updated} enquiry(ies) marked {label}.', messages.SUCCESS)

    @admin.action(description='Mark as Contacted')
    def mark_contacted(self, request, queryset):
        self._bulk_set(request, queryset, Enquiry.Status.CONTACTED, 'contacted')

    @admin.action(description='Mark as Quoted')
    def mark_quoted(self, request, queryset):
        self._bulk_set(request, queryset, Enquiry.Status.QUOTED, 'quoted')

    @admin.action(description='Mark as Closed')
    def mark_closed(self, request, queryset):
        self._bulk_set(request, queryset, Enquiry.Status.CLOSED, 'closed')

    @admin.action(description='Mark as Spam')
    def mark_spam(self, request, queryset):
        self._bulk_set(request, queryset, Enquiry.Status.SPAM, 'spam')
