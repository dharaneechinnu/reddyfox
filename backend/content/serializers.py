import re
from html import escape
from urllib.parse import quote

from rest_framework import serializers

from .models import (
    CallbackRequest, Enquiry, Faq, FaqCategory, Lead, QuoteRequest, SiteImage, SiteSetting, Testimonial,
)
from .validators import looks_like_spam, normalize_phone, validate_amount, validate_currency_code


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


class BaseLeadSerializer(serializers.ModelSerializer):
    """Shared validation for every website form.

    Subclasses set `kind` and declare which extra fields they accept. Keeping
    the phone/spam rules here means all three forms are protected
    identically — a new form cannot accidentally ship without them.
    """

    kind = None

    # Honeypot: display:none in the form, so a human never sees it and browser
    # autofill never touches it. Anything that fills it is a bot.
    # Not named website/url/company — autofill recognises those.
    enquiry_ref = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = Lead
        fields = ['name', 'phone', 'enquiry_ref']

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
        value = (value or '').strip()
        if len(value) > 5000:
            raise serializers.ValidationError('Message is too long — please keep it under 5000 characters.')
        return value

    def validate(self, attrs):
        if attrs.pop('enquiry_ref', ''):
            # Bot filled the hidden field. Generic error: never explain the trap.
            raise serializers.ValidationError({'detail': 'Unable to submit this form.'})

        if looks_like_spam(attrs.get('message', ''), attrs.get('name', '')):
            raise serializers.ValidationError(
                {'message': 'This message looks like spam. Please remove links and try again, or call us instead.'}
            )
        return attrs

    def create(self, validated_data):
        validated_data['kind'] = self.kind
        return super().create(validated_data)


# A service value matched against Lead.service — kept as a plain string (not a
# choices field) because SERVICES lives in the frontend's data.js, not the DB.
MONEY_TRANSFER_SERVICE = 'Money Transfer'


class RequestLeadSerializer(BaseLeadSerializer):
    """Shared shape for "get a quote" and the contact-form enquiry — the two collect
    identical information: currency and amount always, plus (for Money Transfer only)
    who's receiving the money and the sender's relationship to them."""

    class Meta(BaseLeadSerializer.Meta):
        fields = BaseLeadSerializer.Meta.fields + [
            'service', 'recipient_name', 'relationship', 'from_currency', 'amount', 'message',
        ]
        extra_kwargs = {
            'from_currency': {'required': True, 'allow_blank': False},
            'amount': {'required': True},
        }

    def validate_from_currency(self, value):
        return validate_currency_code(value)

    def validate_amount(self, value):
        return validate_amount(value)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        errors = {}
        if attrs.get('service') == MONEY_TRANSFER_SERVICE:
            if not (attrs.get('recipient_name') or '').strip():
                errors['recipient_name'] = "Please enter the receiver's name."
            if not (attrs.get('relationship') or '').strip():
                errors['relationship'] = 'Please tell us your relationship to the receiver.'
        if errors:
            raise serializers.ValidationError(errors)
        return attrs


class EnquiryCreateSerializer(RequestLeadSerializer):
    """Contact form. Same field set and rules as "get a quote"."""

    kind = Lead.Kind.ENQUIRY

    class Meta(RequestLeadSerializer.Meta):
        model = Enquiry


class QuoteRequestCreateSerializer(RequestLeadSerializer):
    """"Get a free quote" — same field set and rules as the contact form."""

    kind = Lead.Kind.QUOTE

    class Meta(RequestLeadSerializer.Meta):
        model = QuoteRequest


class CallbackRequestCreateSerializer(BaseLeadSerializer):
    """Quick "get your best price" capture from the homepage converter widget.
    Deliberately minimal — name and phone are all that's required, the lowest
    possible friction; from_currency/amount are carried along for context but
    the customer never has to touch them directly."""

    kind = Lead.Kind.CALLBACK

    class Meta(BaseLeadSerializer.Meta):
        model = CallbackRequest
        fields = BaseLeadSerializer.Meta.fields + ['from_currency', 'to_currency', 'amount']
        extra_kwargs = {
            'from_currency': {'required': False, 'allow_blank': True},
            'to_currency': {'required': False, 'allow_blank': True},
            'amount': {'required': False},
        }

    def validate_from_currency(self, value):
        return validate_currency_code(value) if value else value

    def validate_to_currency(self, value):
        return validate_currency_code(value) if value else value

    def validate_amount(self, value):
        return validate_amount(value) if value is not None else value


class SiteImageSerializer(serializers.ModelSerializer):
    """Keyed by `slot` on the frontend (see fetchSiteImages in api.js) so a
    page can look up "is there a photo for this spot" with one dict access.
    `url` is built absolute — the API host and the site host are the same,
    but the media path isn't under /api, so a bare relative path from
    ImageField wouldn't resolve correctly against the frontend's own origin.
    """

    url = serializers.SerializerMethodField()
    alt_text = serializers.CharField(source='resolved_alt_text', read_only=True)

    class Meta:
        model = SiteImage
        fields = ['slot', 'url', 'alt_text']

    def get_url(self, obj):
        request = self.context.get('request')
        if not obj.image:
            return None
        return request.build_absolute_uri(obj.image.url) if request else obj.image.url


class SiteSettingSerializer(serializers.ModelSerializer):
    """Public contact options. The wa.me URL is built here so the frontend never
    has to reimplement number formatting or message encoding.

    `contact` and `socials` mirror the shape of the CONTACT/SOCIALS objects in
    frontend/src/company.js exactly (addressLines, addressNote, mobiles,
    landlines, ...) — CompanyInfoContext.jsx uses those same values as its
    fallback default, so keeping the field names identical means it can
    merge a real response straight over the static defaults with no
    reshaping in between.
    """

    whatsapp_url = serializers.SerializerMethodField()
    whatsapp_display = serializers.SerializerMethodField()
    contact = serializers.SerializerMethodField()
    socials = serializers.SerializerMethodField()
    footer = serializers.SerializerMethodField()

    class Meta:
        model = SiteSetting
        fields = [
            'whatsapp_enabled', 'whatsapp_display', 'whatsapp_label', 'whatsapp_url',
            'contact', 'socials', 'footer',
        ]

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

    def get_contact(self, obj):
        return {
            'addressLines': obj.address_lines,
            'addressNote': obj.address_note,
            'addressOneLine': obj.address_one_line,
            'email': obj.contact_email,
            'mobiles': obj.mobiles,
            'landlines': obj.landlines,
        }

    def get_socials(self, obj):
        return obj.socials

    def get_footer(self, obj):
        return {
            'legalName': obj.footer_legal_name,
            'tagline': obj.footer_tagline,
        }
