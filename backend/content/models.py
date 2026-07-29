from django.db import models


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
