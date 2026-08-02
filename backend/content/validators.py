"""
Server-side mirror of frontend/src/validation.js.

Client-side validation is a convenience, not a control — anyone can POST
straight to the API with curl. These rules are the ones that actually protect
the data, so keep them in step with the frontend copy.
"""
import re

from django.core.exceptions import ValidationError

PHONE_CLEAN = re.compile(r'[\s\-().]')
PHONE_RE = re.compile(r'^(?:\+?91|0)?([6-9]\d{9})$')

# Cheap link-spam heuristics. Real customers do not paste 3 URLs into a
# currency enquiry.
URL_RE = re.compile(r'https?://|www\.', re.I)
SPAM_WORDS = re.compile(
    r'\b(seo|backlink|crypto\s*invest|bitcoin\s*doubl|casino|viagra|loan\s*offer|'
    r'rank\s*your\s*site|guest\s*post|digital\s*marketing\s*service)\b',
    re.I,
)


def normalize_phone(value):
    """Return the bare 10-digit number, or None if not a valid Indian mobile."""
    match = PHONE_RE.match(PHONE_CLEAN.sub('', str(value or '')))
    return match.group(1) if match else None


def validate_indian_phone(value):
    """Django field validator — raises ValidationError on a bad number."""
    if normalize_phone(value) is None:
        raise ValidationError(
            'Enter a valid Indian mobile number — 10 digits starting with 6, 7, 8 or 9.',
            code='invalid_phone',
        )


LANDLINE_CLEAN = re.compile(r'[\s\-().]')


def validate_landline(value):
    """Looser than validate_indian_phone: landlines have an STD code and
    don't start with 6-9, so the mobile-shaped regex above doesn't apply.
    Just guards against staff leaving something obviously broken."""
    digits = LANDLINE_CLEAN.sub('', str(value or ''))
    if not digits.isdigit() or not (8 <= len(digits) <= 12):
        raise ValidationError(
            'Enter a valid landline number, digits and dashes only (e.g. 044-24353596).',
            code='invalid_landline',
        )


def landline_tel(display):
    """Build a tel: URI digit string from a staff-entered display string
    (e.g. '044-24353596' -> '914424353596'), stripping one leading trunk
    '0' the way a dialled +91 number never includes it. Returns None for a
    blank/unset landline rather than a URI to nowhere."""
    digits = LANDLINE_CLEAN.sub('', str(display or ''))
    if not digits:
        return None
    if digits.startswith('0'):
        digits = digits[1:]
    return f'+91{digits}'


def looks_like_spam(message, name=''):
    """Heuristic check. Returns a reason string, or None if it looks genuine."""
    text = f'{name}\n{message}'
    if len(URL_RE.findall(text)) >= 2:
        return 'multiple links in message'
    if SPAM_WORDS.search(text):
        return 'spam keyword in message'
    # A wall of text with no spaces is almost always generated.
    longest_run = max((len(w) for w in re.split(r'\s+', message or '') if w), default=0)
    if longest_run > 60:
        return 'unbroken token longer than 60 characters'
    return None


def validate_currency_code(value):
    """Accept only a currency code that actually exists on the rate board."""
    from rest_framework import serializers
    from rates.models import Currency

    code = str(value or '').strip().upper()
    if code == 'INR':
        return code  # the base currency, always valid even though it has no row
    if not Currency.objects.filter(code=code, is_visible=True).exists():
        raise serializers.ValidationError('We do not deal in that currency. Please pick one from the list.')
    return code


def validate_amount(value):
    """Reject nonsense amounts before they reach the desk."""
    from rest_framework import serializers

    if value is None:
        raise serializers.ValidationError('Please enter an amount.')
    if value <= 0:
        raise serializers.ValidationError('Amount must be greater than zero.')
    if value > 100_000_000:
        raise serializers.ValidationError('That amount is too large for an online request — please call us.')
    return value
