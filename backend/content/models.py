from datetime import timedelta

from django.db import models
from django.utils import timezone

from .validators import landline_tel, normalize_phone, validate_indian_phone, validate_landline


class VisibleOrderedQuerySet(models.QuerySet):
    """Shared helper so every public API endpoint filters the same way."""

    def public(self):
        return self.filter(is_visible=True)


class ContentBase(models.Model):
    """Fields every editorial block shares, mirroring the Currency model's
    is_visible + display_order convention so staff learn one pattern."""

    is_visible = models.BooleanField(
        default=True,
        help_text='Untick to hide this from the website without deleting it.',
    )
    display_order = models.PositiveIntegerField(
        default=0,
        help_text='Lower numbers appear first on the site.',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = VisibleOrderedQuerySet.as_manager()

    class Meta:
        abstract = True
        ordering = ['display_order', 'pk']


class Testimonial(ContentBase):
    """A customer quote shown in the "Customer voices" section."""

    quote = models.TextField(help_text='The customer’s words. Quote marks are added automatically by the site.')
    name = models.CharField(max_length=80, help_text='e.g. Deborah Beck')
    role = models.CharField(
        max_length=120,
        blank=True,
        help_text='Optional. e.g. "Google review" or "Frequent traveller, Chennai".',
    )
    initials = models.CharField(
        max_length=3,
        blank=True,
        help_text='Shown in the avatar circle. Leave blank to derive from the name.',
    )

    class Meta(ContentBase.Meta):
        abstract = False
        ordering = ['display_order', 'pk']

    def __str__(self):
        return f'{self.name} — {self.quote[:40]}…'

    @property
    def resolved_initials(self):
        if self.initials:
            return self.initials.upper()
        parts = [p for p in self.name.replace('.', ' ').split() if p]
        return ''.join(p[0] for p in parts[:2]).upper()


class FaqCategory(models.Model):
    """Optional grouping for the FAQ page sidebar."""

    name = models.CharField(max_length=60, unique=True, help_text='e.g. Documents & KYC')
    display_order = models.PositiveIntegerField(default=0, help_text='Lower numbers appear first.')

    class Meta:
        ordering = ['display_order', 'name']
        verbose_name = 'FAQ category'
        verbose_name_plural = 'FAQ categories'

    def __str__(self):
        return self.name


class Faq(ContentBase):
    """A question/answer pair.

    `answer` is plain text. Leave a blank line between paragraphs and the API
    turns each block into its own <p> — staff never need to write HTML.
    """

    question = models.CharField(max_length=255)
    answer = models.TextField(
        help_text='Plain text. Leave a blank line between paragraphs.',
    )
    category = models.ForeignKey(
        FaqCategory,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='faqs',
        help_text='Optional. Used to group questions on the FAQ page.',
    )
    show_on_homepage = models.BooleanField(
        default=True,
        help_text='Also show this question in the homepage "Before you walk in" accordion.',
    )

    class Meta(ContentBase.Meta):
        abstract = False
        ordering = ['display_order', 'pk']
        verbose_name = 'FAQ'
        verbose_name_plural = 'FAQs'

    def __str__(self):
        return self.question


class LeadQuerySet(models.QuerySet):
    def of_kind(self, kind):
        return self.filter(kind=kind)


class Lead(models.Model):
    """A customer request from the website.

    One table backs three request types, discriminated by `kind`:

      enquiry    — the general contact form
      quote      — "Get a free quote"
      rate_lock  — "Lock this rate" from the converter

    They share ~80% of their fields (who the customer is, workflow state, audit
    trail), so a single table keeps validation, spam protection, notification and
    reply-links written once. The three proxy models below give each type its own
    admin list, its own columns and its own permissions.

    The customer's own words are treated as an immutable record — read-only in
    the admin. Staff only change the workflow fields.
    """

    class Kind(models.TextChoices):
        ENQUIRY = 'enquiry', 'Enquiry'
        QUOTE = 'quote', 'Quote request'
        RATE_LOCK = 'rate_lock', 'Rate lock'
        CALLBACK = 'callback', 'Callback request'

    class Status(models.TextChoices):
        NEW = 'new', 'New'
        CONTACTED = 'contacted', 'Contacted'
        QUOTED = 'quoted', 'Quoted'
        CLOSED = 'closed', 'Closed'
        SPAM = 'spam', 'Spam'

    class Priority(models.IntegerChoices):
        """What the desk should pick up first.

        Deliberately integers, not strings: the admin lists order on this
        column directly, and text choices would sort alphabetically
        (high, low, normal, urgent) — which is not the order anyone wants.
        Ascending is most-urgent-first.
        """

        URGENT = 1, 'Urgent'
        HIGH = 2, 'High'
        NORMAL = 3, 'Normal'
        LOW = 4, 'Low'

    #: Priority a brand-new lead of this kind gets, unless the caller asked
    #: for something else. Overridden on the proxies below — a rate lock is
    #: the one type with a deadline, so it arrives Urgent.
    default_priority = Priority.NORMAL

    kind = models.CharField(
        max_length=12, choices=Kind.choices, default=Kind.ENQUIRY, db_index=True,
        help_text='Which website form this came from.',
    )

    # --- who the customer is (all three types) ---
    name = models.CharField(max_length=120)
    phone = models.CharField(max_length=20, help_text='Normalised to 10 digits on save.')
    email = models.EmailField()
    message = models.TextField(blank=True)

    # --- quote + enquiry ---
    service = models.CharField(max_length=120, blank=True, help_text='Which service they selected.')

    # --- quote + rate lock ---
    from_currency = models.CharField(max_length=3, blank=True)
    to_currency = models.CharField(max_length=3, blank=True)
    amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)

    # --- quote only ---
    needed_by = models.DateField(null=True, blank=True, help_text='When the customer needs the currency.')

    # --- rate lock only ---
    quoted_rate = models.DecimalField(
        max_digits=12, decimal_places=4, null=True, blank=True,
        help_text='The rate the customer saw when they locked it.',
    )
    converted_amount = models.DecimalField(
        max_digits=16, decimal_places=2, null=True, blank=True,
        help_text='What the converter showed they would receive.',
    )
    lock_expires_at = models.DateTimeField(
        null=True, blank=True, help_text='Set automatically from the lock window in Site settings.',
    )

    # --- workflow (the only fields staff edit) ---
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.NEW, db_index=True)
    is_resolved = models.BooleanField(
        default=False, db_index=True,
        help_text='Untick (default) while the desk still needs to act on this. Tick once it\'s '
                  'fully handled — resolved items drop out of the default admin list, same as '
                  '"unresolved" being the working set. Never deletes anything.',
    )
    priority = models.PositiveSmallIntegerField(
        choices=Priority.choices, default=Priority.NORMAL, db_index=True,
        help_text='Which end of the list this sits at. Set automatically when the lead arrives '
                  '(rate locks come in Urgent because they expire); change it here any time.',
    )
    assigned_to = models.ForeignKey(
        'auth.User', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='leads', help_text='Who is handling this.',
    )
    internal_note = models.TextField(blank=True, help_text='Staff notes. Never shown to the customer.')

    # --- audit ---
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    contacted_at = models.DateTimeField(null=True, blank=True, help_text='Set automatically when status leaves New.')
    source_ip = models.GenericIPAddressField(null=True, blank=True, help_text='For spam triage.')
    notified_at = models.DateTimeField(null=True, blank=True, help_text='When the team alert was sent.')

    objects = LeadQuerySet.as_manager()

    class Meta:
        # Most urgent first, then newest — so the desk works top-down and a
        # rate lock about to expire never sits below a day-old enquiry.
        ordering = ['priority', '-created_at']
        verbose_name = 'lead'
        verbose_name_plural = 'all leads'
        indexes = [
            models.Index(fields=['kind', 'status', '-created_at']),
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['priority', '-created_at']),
        ]

    def __str__(self):
        return f'{self.name} — {self.get_kind_display()} ({self.get_status_display()})'

    def save(self, *args, **kwargs):
        # Stamp the moment it stopped being an untouched lead.
        if self.status != self.Status.NEW and self.contacted_at is None:
            self.contacted_at = timezone.now()
        # Apply the kind's default priority on arrival only. Anything the
        # caller set explicitly is left alone, and staff edits later are
        # never overwritten — this branch only runs on the first save.
        if self._state.adding and self.priority == Lead.Priority.NORMAL:
            self.priority = self.default_priority
        super().save(*args, **kwargs)

    @property
    def is_overdue(self):
        """An Urgent or High lead nobody has touched within the hour.

        Used by the admin to make the row shout. Deliberately a property, not
        a stored flag: it changes with the clock, not with an edit.
        """
        if self.status != self.Status.NEW:
            return False
        if self.priority > Lead.Priority.HIGH:
            return False
        return (timezone.now() - self.created_at).total_seconds() >= 3600

    # --- reply helpers: one tap for the desk, no WhatsApp API needed ---
    @property
    def _digits(self):
        return ''.join(ch for ch in self.phone if ch.isdigit())[-10:]

    @property
    def whatsapp_url(self):
        from urllib.parse import quote
        d = self._digits
        if len(d) != 10:
            return None
        first = self.name.split()[0] if self.name.split() else 'there'
        subject = {
            self.Kind.RATE_LOCK: f'your {self.from_currency}/{self.to_currency} rate lock',
            self.Kind.QUOTE: f'your quote request for {self.service or "forex"}',
        }.get(self.kind, f'your enquiry about {self.service or "our services"}')
        return f'https://wa.me/91{d}?text={quote(f"Hello {first}, thank you for {subject} with Reddy Forex.")}'

    @property
    def tel_url(self):
        d = self._digits
        return f'tel:+91{d}' if len(d) == 10 else None

    # --- rate lock helpers ---
    @property
    def is_expired(self):
        return bool(self.lock_expires_at and timezone.now() > self.lock_expires_at)

    @property
    def expires_in(self):
        """Human countdown, or None when this lead has no lock window."""
        if not self.lock_expires_at:
            return None
        delta = self.lock_expires_at - timezone.now()
        mins = int(delta.total_seconds() // 60)
        if mins < 0:
            return 'expired'
        if mins < 60:
            return f'{mins} min left'
        return f'{mins // 60} hr {mins % 60} min left'


class KindManager(models.Manager):
    """Manager that scopes a proxy model to a single Lead.kind."""

    def __init__(self, kind):
        super().__init__()
        self._kind = kind

    def get_queryset(self):
        return super().get_queryset().filter(kind=self._kind)


class Enquiry(Lead):
    """Proxy: the general contact form. Own admin list and own permissions."""

    objects = KindManager(Lead.Kind.ENQUIRY)

    class Meta:
        proxy = True
        verbose_name = 'enquiry'
        verbose_name_plural = 'enquiries'

    def save(self, *args, **kwargs):
        self.kind = Lead.Kind.ENQUIRY
        super().save(*args, **kwargs)


class QuoteRequest(Lead):
    """Proxy: "Get a free quote". Own admin list and own permissions."""

    objects = KindManager(Lead.Kind.QUOTE)

    class Meta:
        proxy = True
        verbose_name = 'quote request'
        verbose_name_plural = 'quote requests'

    def save(self, *args, **kwargs):
        self.kind = Lead.Kind.QUOTE
        super().save(*args, **kwargs)


class CallbackRequest(Lead):
    """Proxy: quick "get your best price" capture from the homepage converter
    widget — just a name and phone number, with the amount/currency they were
    converting carried along for context. Own admin list and own permissions."""

    objects = KindManager(Lead.Kind.CALLBACK)

    class Meta:
        proxy = True
        verbose_name = 'callback request'
        verbose_name_plural = 'callback requests'

    def save(self, *args, **kwargs):
        self.kind = Lead.Kind.CALLBACK
        super().save(*args, **kwargs)


class RateLock(Lead):
    """Proxy: "Lock this rate" from the converter. Own admin list and own
    permissions, and the only type with an expiry window."""

    objects = KindManager(Lead.Kind.RATE_LOCK)

    # The only lead type with a deadline attached: the customer has been
    # promised a rate that lapses, so these arrive at the top of the desk's
    # list. Staff can still lower it.
    default_priority = Lead.Priority.URGENT

    class Meta:
        proxy = True
        verbose_name = 'rate lock'
        verbose_name_plural = 'rate locks'

    def save(self, *args, **kwargs):
        self.kind = Lead.Kind.RATE_LOCK
        if not self.lock_expires_at:
            hours = SiteSetting.load().rate_lock_hours
            self.lock_expires_at = timezone.now() + timedelta(hours=hours)
        super().save(*args, **kwargs)


def _mobile_pair(digits):
    """'9941456261' -> {'display': '+91 99414 56261', 'tel': '+919941456261'}."""
    return {'display': f'+91 {digits[:5]} {digits[5:]}', 'tel': f'+91{digits}'}


class SiteSetting(models.Model):
    """Singleton row for contact options the business wants to change without a
    deploy: the company's own address/phone/email/socials (shown in the
    header, footer, Contact page and WhatsApp messages — one edit here
    updates every one of them), plus WhatsApp, rate lock and notification
    settings.

    Frontend defaults live in frontend/src/company.js and are used only as
    the fallback while this loads or if the API is unreachable — the same
    fail-open rule as feature_flags. They are NOT the source of truth once
    this row has been edited in the admin.
    """

    # --- company contact info (header, footer, Contact page, WhatsApp) ---
    contact_email = models.EmailField(
        default='reddyforex@gmail.com',
        help_text='Public "contact us" email shown on the site. Different from the notify_* '
                  'addresses below, which are where staff get alerted internally.',
    )
    address = models.TextField(
        default='Shop No 105, Challa Mall,\n17, Thyagaraya Road, T. Nagar,\nChennai, Tamil Nadu 600017',
        help_text='One address line per line — each becomes its own line on the site.',
    )
    address_note = models.CharField(
        max_length=100, blank=True, default='(Opposite Globus)',
        help_text='Optional landmark note shown after the address, e.g. "(Opposite Globus)".',
    )
    mobile_1 = models.CharField(
        max_length=20, default='9941456261', validators=[validate_indian_phone],
        verbose_name='Primary mobile',
        help_text='Shown first everywhere on the site. 10 digits; +91, spaces and dashes are fine and get stripped.',
    )
    mobile_2 = models.CharField(
        max_length=20, blank=True, default='9551699221', validators=[validate_indian_phone],
        verbose_name='Second mobile (optional)',
    )
    mobile_3 = models.CharField(
        max_length=20, blank=True, default='9551699055', validators=[validate_indian_phone],
        verbose_name='Third mobile (optional)',
    )
    landline_1 = models.CharField(
        max_length=20, blank=True, default='044-24353596', validators=[validate_landline],
        verbose_name='Landline 1 (optional)', help_text='Shown as entered, e.g. "044-24353596".',
    )
    landline_2 = models.CharField(
        max_length=20, blank=True, default='044-24353604', validators=[validate_landline],
        verbose_name='Landline 2 (optional)',
    )
    facebook_url = models.URLField(blank=True, default='https://www.facebook.com/Reddy-Forex-Private-Limited-100909432036543')
    x_url = models.URLField(blank=True, default='https://x.com/ReddyForex', verbose_name='X (Twitter) URL')
    youtube_url = models.URLField(blank=True, default='https://www.youtube.com/channel/UCrFuWjK4Yfma9A6RMbywE5g')

    whatsapp_enabled = models.BooleanField(
        default=True,
        verbose_name='Show WhatsApp option',
        help_text='Untick to hide the "Chat with us on WhatsApp" option from the website.',
    )
    whatsapp_number = models.CharField(
        max_length=20,
        default='9941456261',
        validators=[validate_indian_phone],
        help_text='Indian mobile number that receives customer chats. '
                  '10 digits; +91, spaces and dashes are fine and get stripped.',
    )
    whatsapp_label = models.CharField(
        max_length=80,
        default='Chat with us on WhatsApp',
        help_text='Button text shown to the customer.',
    )
    whatsapp_greeting = models.CharField(
        max_length=200,
        blank=True,
        default='Hello, I just sent an enquiry on your website.',
        help_text='Message pre-filled in the customer’s WhatsApp. '
                  'Leave blank to open an empty chat.',
    )
    # --- rate lock ---
    rate_lock_hours = models.PositiveSmallIntegerField(
        default=4,
        verbose_name='Rate lock validity (hours)',
        help_text='How long a locked rate stays valid. The customer is told the exact expiry time.',
    )

    # --- per-type notification recipients ---
    notify_enquiries = models.CharField(
        max_length=255, blank=True,
        help_text='Comma-separated emails for contact-form enquiries. Blank = use the default from settings.',
    )
    notify_quotes = models.CharField(
        max_length=255, blank=True,
        help_text='Comma-separated emails for quote requests. Blank = use the default.',
    )
    notify_rate_locks = models.CharField(
        max_length=255, blank=True,
        help_text='Comma-separated emails for rate locks. Blank = use the default.',
    )

    updated_at = models.DateTimeField(auto_now=True)

    # --- contact info, shaped for the frontend (see SiteSettingSerializer) ---
    @property
    def address_lines(self):
        return [line.strip() for line in self.address.splitlines() if line.strip()]

    @property
    def address_one_line(self):
        # Each line commonly ends with its own trailing comma (for the
        # multi-line display) — strip it first so joining doesn't double up.
        line = ', '.join(l.rstrip(',').strip() for l in self.address_lines)
        return f'{line} {self.address_note}'.strip() if self.address_note else line

    @property
    def mobiles(self):
        """{display, tel} pairs, blank optional numbers dropped. Every site
        phone link (header, footer, forms, LeadSuccess) uses this shape."""
        return [_mobile_pair(n) for n in (self.mobile_1, self.mobile_2, self.mobile_3) if n]

    @property
    def landlines(self):
        return [{'display': n, 'tel': landline_tel(n)} for n in (self.landline_1, self.landline_2) if n]

    @property
    def socials(self):
        """Only the platforms staff have actually filled in — same
        blank-means-hidden rule as whatsapp_url below, not a broken link."""
        options = [
            ('facebook', 'Facebook', self.facebook_url),
            ('x', 'X (formerly Twitter)', self.x_url),
            ('youtube', 'YouTube', self.youtube_url),
        ]
        return [{'icon': icon, 'label': label, 'url': url} for icon, label, url in options if url]

    def recipients_for(self, kind):
        """Emails to alert for a given Lead.kind, falling back to the project
        default so a blank field never means "nobody gets told"."""
        from django.conf import settings
        raw = {
            'enquiry': self.notify_enquiries,
            'quote': self.notify_quotes,
            'rate_lock': self.notify_rate_locks,
        }.get(kind, '')
        addrs = [a.strip() for a in (raw or '').split(',') if a.strip()]
        return addrs or list(getattr(settings, 'ENQUIRY_NOTIFY_EMAILS', []) or [])

    class Meta:
        verbose_name = 'site setting'
        verbose_name_plural = 'site settings'

    def __str__(self):
        return f'WhatsApp: +91 {self.whatsapp_number}' if self.whatsapp_enabled else 'WhatsApp: disabled'

    def save(self, *args, **kwargs):
        self.pk = 1  # enforce singleton
        self.whatsapp_number = normalize_phone(self.whatsapp_number) or self.whatsapp_number
        self.mobile_1 = normalize_phone(self.mobile_1) or self.mobile_1
        self.mobile_2 = normalize_phone(self.mobile_2) or self.mobile_2
        self.mobile_3 = normalize_phone(self.mobile_3) or self.mobile_3
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        pass  # the single row is never deleted

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
