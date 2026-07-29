import re
from html import escape
from urllib.parse import quote

from rest_framework import serializers

from .models import Enquiry, Faq, FaqCategory, SiteSetting, Testimonial
from .validators import looks_like_spam, normalize_phone


def text_to_paragraphs(text):
    """Turn a plain-text field into safe HTML paragraphs.

    Blank line = new paragraph. Everything is HTML-escaped first, so staff can
    type ampersands, angle brackets and quotes freely without breaking the page
    or injecting markup.
    """
    if not text:
        return ''
    blocks = re.split(r'\n\s*\n', text.strip())
    return ''.join(
        '<p>' + escape(b.strip()).replace('\n', '<br />') + '</p>'
        for b in blocks if b.strip()
    )


class TestimonialSerializer(serializers.ModelSerializer):
    initials = serializers.CharField(source='resolved_initials', read_only=True)

    class Meta:
        model = Testimonial
        fields = ['id', 'quote', 'name', 'role', 'initials', 'display_order']


class FaqSerializer(serializers.ModelSerializer):
    answer_html = serializers.SerializerMethodField()
    category = serializers.StringRelatedField()

    class Meta:
        model = Faq
        fields = ['id', 'question', 'answer', 'answer_html', 'category', 'show_on_homepage', 'display_order']

    def get_answer_html(self, obj):
        return text_to_paragraphs(obj.answer)


class FaqCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = FaqCategory
        fields = ['id', 'name', 'display_order']


class EnquiryCreateSerializer(serializers.ModelSerializer):
    """Write-only serializer for the public contact form.

    Only accepts the customer-supplied fields — status, assignment, notes and
    all audit fields are set server-side and cannot be injected by the client.
    """

    # Honeypot: display:none in the form, so a human never sees it and browser
    # autofill never touches it. Anything that fills it is a bot.
    # Not named website/url/company — autofill recognises those.
    enquiry_ref = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = Enquiry
        fields = ['name', 'phone', 'email', 'service', 'message', 'enquiry_ref']

    def validate_name(self, value):
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError('Please enter your full name.')
        return value

    def validate_phone(self, value):
        digits = normalize_phone(value)
        if not digits:
            raise serializers.ValidationError(
                'Enter a valid Indian mobile number — 10 digits starting with 6, 7, 8 or 9.'
            )
        return digits  # stored normalised, so search and wa.me links always work

    def validate_message(self, value):
        value = value.strip()
        if len(value) < 5:
            raise serializers.ValidationError('Please tell us a little more about what you need.')
        if len(value) > 5000:
            raise serializers.ValidationError('Message is too long — please keep it under 5000 characters.')
        return value

    def validate(self, attrs):
        if attrs.pop('enquiry_ref', ''):
            # Bot filled the hidden field. Generic error: never explain the trap.
            raise serializers.ValidationError({'detail': 'Unable to submit this form.'})

        reason = looks_like_spam(attrs.get('message', ''), attrs.get('name', ''))
        if reason:
            raise serializers.ValidationError(
                {'message': 'This message looks like spam. Please remove links and try again, or call us instead.'}
            )
        return attrs


class SiteSettingSerializer(serializers.ModelSerializer):
    """Public contact options. The wa.me URL is built here so the frontend never
    has to reimplement number formatting or message encoding."""

    whatsapp_url = serializers.SerializerMethodField()
    whatsapp_display = serializers.SerializerMethodField()

    class Meta:
        model = SiteSetting
        fields = ['whatsapp_enabled', 'whatsapp_display', 'whatsapp_label', 'whatsapp_url']

    def get_whatsapp_display(self, obj):
        n = obj.whatsapp_number or ''
        # 9941456261 -> +91 99414 56261
        return f'+91 {n[:5]} {n[5:]}' if len(n) == 10 else n

    def get_whatsapp_url(self, obj):
        if not (obj.whatsapp_enabled and obj.whatsapp_number):
            return None
        url = f'https://wa.me/91{obj.whatsapp_number}'
        if obj.whatsapp_greeting:
            url += f'?text={quote(obj.whatsapp_greeting)}'
        return url
