from django.contrib import admin, messages
from django.utils import timezone
from django.utils.html import format_html

from .models import CallbackRequest, Enquiry, Faq, FaqCategory, Lead, SiteSetting, Testimonial


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

# Keyed by Lead.Priority value. Urgent is the only one that gets a solid
# fill — if everything shouts, nothing does.
PRIORITY_COLOURS = {
    1: ('#B4351F', '#FFFFFF'),   # Urgent
    2: ('#FDF6E3', '#8A6A11'),   # High
    3: ('#F1EEE9', '#6B7688'),   # Normal
    4: ('#F7F6F4', '#A9A296'),   # Low
}


class BaseLeadAdmin(admin.ModelAdmin):
    """Shared behaviour for the three lead inboxes.

    The customer's own words are read-only — this is a record of what they asked
    for. Staff only change status, assignment and the internal note, so there is
    never a dispute about what was requested or quoted.
    """

    list_display_links = ('name',)
    list_editable = ('priority', 'assigned_to')
    date_hierarchy = 'created_at'
    list_per_page = 50
    # Matches Lead.Meta.ordering: most urgent first, then newest.
    ordering = ('priority', '-created_at')
    actions = (
        'mark_contacted', 'mark_quoted', 'mark_closed', 'mark_spam',
        'raise_priority', 'lower_priority',
    )
    search_fields = ('name', 'phone', 'email', 'message')

    customer_fields = ('name', 'phone', 'email', 'message')
    audit_fields = ('created_at', 'contacted_at', 'notified_at', 'updated_at', 'source_ip')

    def has_add_permission(self, request):
        # Leads only ever arrive via the website forms.
        return False

    def get_readonly_fields(self, request, obj=None):
        return tuple(self.customer_fields) + tuple(self.audit_fields) + ('reply_links',)

    # --- shared columns ---
    @admin.display(description='Priority', ordering='priority')
    def priority_badge(self, obj):
        bg, fg = PRIORITY_COLOURS.get(obj.priority, ('#EEE', '#333'))
        label = obj.get_priority_display().upper()
        # An urgent lead nobody has touched in an hour is the one actually
        # losing money — say so rather than making staff work it out.
        suffix = ' · WAITING' if obj.is_overdue else ''
        return format_html(
            '<span style="background:{};color:{};padding:3px 9px;border-radius:5px;'
            'font-size:11px;font-weight:700;white-space:nowrap">{}{}</span>',
            bg, fg, label, suffix,
        )

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

    @admin.action(description='Mark selected as resolved')
    def mark_resolved(self, request, queryset):
        updated = queryset.update(is_resolved=True)
        self.message_user(request, f'{updated} record(s) marked resolved.', messages.SUCCESS)

    @admin.action(description='Mark selected as unresolved')
    def mark_unresolved(self, request, queryset):
        updated = queryset.update(is_resolved=False)
        self.message_user(request, f'{updated} record(s) marked unresolved.', messages.SUCCESS)

    @admin.display(description='Resolved', ordering='is_resolved', boolean=True)
    def resolved_badge(self, obj):
        return obj.is_resolved

    def _shift_priority(self, request, queryset, step, label):
        # Clamp rather than wrap: stepping past Urgent should stay Urgent,
        # not roll around to Low.
        moved = 0
        for lead in queryset:
            new = min(max(lead.priority + step, Lead.Priority.URGENT), Lead.Priority.LOW)
            if new != lead.priority:
                lead.priority = new
                lead.save(update_fields=['priority', 'updated_at'])
                moved += 1
        self.message_user(
            request,
            f'{moved} record(s) moved {label}.' if moved else f'Nothing to move {label}.',
            messages.SUCCESS if moved else messages.WARNING,
        )

    @admin.action(description='Raise priority (more urgent)')
    def raise_priority(self, request, queryset):
        self._shift_priority(request, queryset, -1, 'up')

    @admin.action(description='Lower priority (less urgent)')
    def lower_priority(self, request, queryset):
        self._shift_priority(request, queryset, +1, 'down')


@admin.register(Enquiry)
class EnquiryAdmin(BaseLeadAdmin):
    """Front office inbox — general contact-form enquiries.

    Resolved enquiries drop out of the default list — this is the working queue, not a full
    archive. Nothing is hidden permanently: clicking the "Resolved" (or "All") option under the
    "Is resolved" filter in the sidebar shows them again, same as `is_visible` elsewhere in this
    codebase never actually deletes a row.
    """

    list_display = ('priority_badge', 'status_badge', 'resolved_badge', 'received', 'name', 'phone_links', 'email', 'service', 'priority', 'assigned_to')
    list_filter = ('is_resolved', 'priority', 'status', 'service', 'assigned_to', 'created_at')
    actions = BaseLeadAdmin.actions + ('mark_resolved', 'mark_unresolved')
    customer_fields = ('name', 'phone', 'email', 'service', 'message')
    fieldsets = (
        ('Customer enquiry', {'fields': ('name', 'phone', 'email', 'service', 'message', 'reply_links')}),
        ('Handling', {'fields': ('priority', 'status', 'is_resolved', 'assigned_to', 'internal_note')}),
        ('Audit', {'classes': ('collapse',),
                   'fields': ('created_at', 'contacted_at', 'notified_at', 'updated_at', 'source_ip')}),
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        # Unresolved is the default working view. Staff can still reach resolved rows by picking
        # "Resolved" (or "All") from the "Is resolved" filter in the sidebar — this only changes
        # what shows with no filter applied, never what exists.
        if 'is_resolved__exact' not in request.GET:
            qs = qs.filter(is_resolved=False)
        return qs


@admin.register(CallbackRequest)
class CallbackRequestAdmin(BaseLeadAdmin):
    """Quick "get your best price" requests from the homepage converter widget.
    Email is genuinely optional here — the point of this form is minimum
    friction, so don't be surprised to see it blank."""

    list_display = ('priority_badge', 'status_badge', 'received', 'name', 'phone_links', 'wants', 'priority', 'assigned_to')
    list_filter = ('priority', 'status', 'from_currency', 'assigned_to', 'created_at')
    customer_fields = ('name', 'phone', 'email', 'from_currency', 'to_currency', 'amount', 'message')
    fieldsets = (
        ('Customer', {'fields': ('name', 'phone', 'email', 'reply_links')}),
        ('What they were converting', {'fields': ('from_currency', 'to_currency', 'amount')}),
        ('Handling', {'fields': ('priority', 'status', 'assigned_to', 'internal_note')}),
        ('Audit', {'classes': ('collapse',),
                   'fields': ('created_at', 'contacted_at', 'notified_at', 'updated_at', 'source_ip')}),
    )

    @admin.display(description='Was converting')
    def wants(self, obj):
        if obj.amount is None or not obj.from_currency:
            return '—'
        return format_html(
            '<span style="font-family:monospace">{} {} → {}</span>',
            f'{obj.amount:,.2f}', obj.from_currency, obj.to_currency or '?',
        )


@admin.register(SiteSetting)
class SiteSettingAdmin(admin.ModelAdmin):
    """Singleton — one row, auto-created, never deleted."""

    list_display = ('__str__', 'whatsapp_number', 'whatsapp_enabled', 'rate_lock_hours', 'updated_at')
    readonly_fields = ('updated_at', 'preview_link')
    fieldsets = (
        ('Company contact info — header, footer, Contact page & WhatsApp', {
            'fields': (
                'contact_email', 'address', 'address_note',
                'mobile_1', 'mobile_2', 'mobile_3',
                'landline_1', 'landline_2',
                'facebook_url', 'x_url', 'youtube_url',
            ),
            'description': 'The same values shown everywhere on the site — one edit here updates the header top '
                           'bar, the footer, the Contact page and every "call us" prompt at once.',
        }),
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
