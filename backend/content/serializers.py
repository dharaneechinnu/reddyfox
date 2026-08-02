import re
from html import escape
from urllib.parse import quote

from rest_framework import serializers

from .models import CallbackRequest, Enquiry, Faq, FaqCategory, Lead, QuoteRequest, SiteSetting, Testimonial
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
    the phone/email/spam rules here means all three forms are protected
    identically — a new form cannot accidentally ship without them.
    """

    kind = None

    # Honeypot: display:none in the form, so a human never sees it and browser
    # autofill never touches it. Anything that fills it is a bot.
    # Not named website/url/company — autofill recognises those.
    enquiry_ref = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = Lead
        fields = ['name', 'phone', 'email', 'enquiry_ref']

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


class EnquiryCreateSerializer(BaseLeadSerializer):
    """Contact form. A message is the whole point here, so it is required."""

    kind = Lead.Kind.ENQUIRY

    class Meta(BaseLeadSerializer.Meta):
        model = Enquiry
        fields = BaseLeadSerializer.Meta.fields + ['service', 'message']

    def validate_message(self, value):
        value = super().validate_message(value)
        if len(value) < 5:
            raise serializers.ValidationError('Please tell us a little more about what you need.')
        return value


class QuoteRequestCreateSerializer(BaseLeadSerializer):
    """"Get a free quote" — we need to know what to price, so currency and
    amount are required; the free-text message is optional."""

    kind = Lead.Kind.QUOTE

    class Meta(BaseLeadSerializer.Meta):
        model = QuoteRequest
        fields = BaseLeadSerializer.Meta.fields + [
            'service', 'from_currency', 'amount', 'needed_by', 'message',
        ]
        extra_kwargs = {
            'from_currency': {'required': True, 'allow_blank': False},
            'amount': {'required': True},
        }

    def validate_from_currency(self, value):
        return validate_currency_code(value)

    def validate_amount(self, value):
        return validate_amount(value)


class CallbackRequestCreateSerializer(BaseLeadSerializer):
    """Quick "get your best price" capture from the homepage converter widget.
    Deliberately minimal — name and phone are all that's required. Email is
    optional here, unlike every other lead form, because the whole point is
    the lowest possible friction; from_currency/amount are carried along for
    context but the customer never has to touch them directly."""

    email = serializers.EmailField(required=False, allow_blank=True, default='')
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

    class Meta:
        model = SiteSetting
        fields = ['whatsapp_enabled', 'whatsapp_display', 'whatsapp_label', 'whatsapp_url', 'contact', 'socials']

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
