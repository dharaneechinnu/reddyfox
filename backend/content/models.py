from django.db import models
from django.utils import timezone

from .validators import (
    landline_tel,
    normalize_phone,
    validate_image_upload,
    validate_indian_phone,
    validate_landline,
)


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

    One table backs multiple request types, discriminated by `kind`:

      enquiry    — the general contact form
      quote      — "Get a free quote"
      callback   — quick "get your best price" from the homepage converter

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
    #: for something else. Every kind currently arrives Normal; a proxy can
    #: override this if a future lead type needs to arrive pre-flagged.
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

    # --- quote + callback ---
    from_currency = models.CharField(max_length=3, blank=True)
    to_currency = models.CharField(max_length=3, blank=True)
    amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)

    # --- quote only ---
    needed_by = models.DateField(null=True, blank=True, help_text='When the customer needs the currency.')

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
        help_text='Which end of the list this sits at. Set automatically when the lead arrives; '
                  'change it here any time.',
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
        # Most urgent first, then newest — so the desk always works top-down.
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
            self.Kind.QUOTE: f'your quote request for {self.service or "forex"}',
        }.get(self.kind, f'your enquiry about {self.service or "our services"}')
        return f'https://wa.me/91{d}?text={quote(f"Hello {first}, thank you for {subject} with Reddy Forex.")}'

    @property
    def tel_url(self):
        d = self._digits
        return f'tel:+91{d}' if len(d) == 10 else None


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


def _mobile_pair(digits):
    """'9941456261' -> {'display': '+91 99414 56261', 'tel': '+919941456261'}."""
    return {'display': f'+91 {digits[:5]} {digits[5:]}', 'tel': f'+91{digits}'}


class SiteSetting(models.Model):
    """Singleton row for contact options the business wants to change without a
    deploy: the company's own address/phone/email/socials (shown in the
    header, footer, Contact page and WhatsApp messages — one edit here
    updates every one of them), plus WhatsApp and notification settings.

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

    # --- footer content ---
    footer_legal_name = models.CharField(
        max_length=150,
        default='Reddy Forex Private Limited',
        help_text='Full registered company name — shown in the footer copyright line.',
    )
    footer_tagline = models.TextField(
        blank=True,
        default='Licensed and Regulated by Reserve Bank of India. Foreign currency exchange, money transfer '
                'and remittance services in Chennai since 2000.',
        help_text='Short description shown under the logo in the footer.',
    )

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
    # --- per-type notification recipients ---
    notify_enquiries = models.CharField(
        max_length=255, blank=True,
        help_text='Comma-separated emails for contact-form enquiries. Blank = use the default from settings.',
    )
    notify_quotes = models.CharField(
        max_length=255, blank=True,
        help_text='Comma-separated emails for quote requests. Blank = use the default.',
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


# Longest side an uploaded photo is downscaled to on save. Keeps a staff phone
# photo (routinely 3000px+) from sitting on disk — and going out over every
# page load — at full camera resolution. A number, not a setting: this is an
# implementation detail of how uploads are stored, not something an operator
# needs to tune per-deploy.
SITE_IMAGE_MAX_DIMENSION = 1600


class SiteImage(models.Model):
    """A staff-uploaded photo for one fixed spot on the site.

    Slots are a fixed enum, not free text — each one corresponds to a
    specific placeholder block in the React frontend (see SitePhoto.jsx).
    If a slot has no row yet, or is hidden, the frontend quietly keeps its
    decorative placeholder instead of breaking the layout — same
    never-block-on-missing-content pattern as is_visible elsewhere in this
    app. Stored on local disk (Django's default FileSystemStorage) — no
    third-party image host. See MEDIA_ROOT/MEDIA_URL in settings.py for how
    that's served, including the production caveat about disk persistence.
    """

    class Slot(models.TextChoices):
        HOME_WHY_US = 'home_why_us', 'Homepage — "Why us" counter photo'
        ABOUT_COUNTER = 'about_counter', 'About us — counter photo'
        ABOUT_TEAM = 'about_team', 'About us — front office team photo'
        SERVICE_EXCHANGE = 'service_exchange', 'Service page — Foreign Exchange'
        SERVICE_MONEY_TRANSFER = 'service_money-transfer', 'Service page — Money Transfer'
        SERVICE_REMITTANCE = 'service_remittance', 'Service page — Money Remittance'
        SERVICE_FOREX_CARD = 'service_forex-card', 'Service page — Prepaid Forex Card'
        SERVICE_WIRE_TRANSFER = 'service_wire-transfer', 'Service page — Drafts / TT / Swift Transfer'
        SERVICE_STUDENT = 'service_student-services', 'Service page — Student Services'

    slot = models.CharField(
        max_length=40, choices=Slot.choices, unique=True,
        help_text='Which spot on the site this photo fills. Each slot can only be used once — '
                  'edit the existing row for that slot rather than adding a second one.',
    )
    image = models.ImageField(
        upload_to='site-images/%Y/%m/',
        validators=[validate_image_upload],
        help_text='JPEG, PNG or WebP, under 8 MB. Resized automatically if larger than '
                  f'{SITE_IMAGE_MAX_DIMENSION}px on the longest side.',
    )
    alt_text = models.CharField(
        max_length=200, blank=True,
        help_text='Describes the photo for screen readers and search engines. '
                  'Leave blank and the slot\'s label is used instead.',
    )
    is_visible = models.BooleanField(
        default=True,
        help_text='Untick to fall back to the plain placeholder on the site without deleting the upload.',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['slot']
        verbose_name = 'site image'
        verbose_name_plural = 'site images'

    def __str__(self):
        return self.get_slot_display()

    @property
    def resolved_alt_text(self):
        return self.alt_text or self.get_slot_display()

    def save(self, *args, **kwargs):
        # Skip the Pillow round-trip entirely when this save couldn't possibly
        # have touched the file (e.g. a list_editable toggle of is_visible).
        update_fields = kwargs.get('update_fields')
        touches_image = update_fields is None or 'image' in update_fields
        super().save(*args, **kwargs)
        if touches_image and self.image:
            self._downscale_if_needed()

    def _downscale_if_needed(self):
        """Shrink the file on disk in place if it's larger than we ever serve it at.

        Runs after super().save() because the file only exists at self.image.path
        once Django's storage backend has actually written it. Rewrites the same
        path — no new model save, no field/filename change — so this is safe to
        call unconditionally; it's a no-op read+skip for an already-small image.
        """
        from PIL import Image

        path = self.image.path
        with Image.open(path) as img:
            if max(img.size) <= SITE_IMAGE_MAX_DIMENSION:
                return
            img.thumbnail((SITE_IMAGE_MAX_DIMENSION, SITE_IMAGE_MAX_DIMENSION), Image.LANCZOS)
            save_kwargs = {'quality': 85, 'optimize': True} if img.format == 'JPEG' else {'optimize': True}
            img.save(path, format=img.format, **save_kwargs)
