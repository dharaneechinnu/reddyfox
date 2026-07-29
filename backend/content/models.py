from django.db import models
from django.utils import timezone


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


class Enquiry(models.Model):
    """A customer enquiry submitted from the website contact form.

    The customer's own words (name/phone/email/service/message) are treated as
    an immutable record — they are read-only in the admin. Staff only change the
    workflow fields (status, assignment, internal note), so there is never a
    question about what the customer actually asked for.
    """

    class Status(models.TextChoices):
        NEW = 'new', 'New'
        CONTACTED = 'contacted', 'Contacted'
        QUOTED = 'quoted', 'Quoted'
        CLOSED = 'closed', 'Closed'
        SPAM = 'spam', 'Spam'

    # --- what the customer sent ---
    name = models.CharField(max_length=120)
    phone = models.CharField(max_length=20, help_text='Normalised to 10 digits on save.')
    email = models.EmailField()
    service = models.CharField(max_length=120, blank=True, help_text='Which service they selected.')
    message = models.TextField()

    # --- workflow (the only fields staff edit) ---
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.NEW, db_index=True)
    assigned_to = models.ForeignKey(
        'auth.User', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='enquiries', help_text='Who is handling this enquiry.',
    )
    internal_note = models.TextField(blank=True, help_text='Staff notes. Never shown to the customer.')

    # --- audit ---
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    contacted_at = models.DateTimeField(null=True, blank=True, help_text='Set automatically when status leaves New.')
    source_ip = models.GenericIPAddressField(null=True, blank=True, help_text='For spam triage.')
    notified_at = models.DateTimeField(null=True, blank=True, help_text='When the team alert was sent.')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'enquiry'
        verbose_name_plural = 'enquiries'
        indexes = [models.Index(fields=['status', '-created_at'])]

    def __str__(self):
        return f'{self.name} — {self.service or "enquiry"} ({self.get_status_display()})'

    def save(self, *args, **kwargs):
        # Stamp the moment it stopped being an untouched lead.
        if self.status != self.Status.NEW and self.contacted_at is None:
            self.contacted_at = timezone.now()
        super().save(*args, **kwargs)

    @property
    def whatsapp_url(self):
        """Deep link that opens WhatsApp with a reply drafted to this customer.
        Avoids needing the WhatsApp Business API at all."""
        from urllib.parse import quote
        digits = ''.join(ch for ch in self.phone if ch.isdigit())[-10:]
        if len(digits) != 10:
            return None
        text = quote(f'Hello {self.name.split()[0]}, thank you for your enquiry to Reddy Forex regarding {self.service or "our services"}.')
        return f'https://wa.me/91{digits}?text={text}'

    @property
    def tel_url(self):
        digits = ''.join(ch for ch in self.phone if ch.isdigit())[-10:]
        return f'tel:+91{digits}' if len(digits) == 10 else None
