"""
Server-side mirror of frontend/src/validation.js.

Client-side validation is a convenience, not a control — anyone can POST
straight to the API with curl. These rules are the ones that actually protect
the data, so keep them in step with the frontend copy.
"""
import re

from django.core.exceptions import ValidationError

# --- site image uploads (content.models.SiteImage) -------------------------

MAX_IMAGE_UPLOAD_MB = 8
ALLOWED_IMAGE_FORMATS = {'JPEG', 'PNG', 'WEBP'}


def validate_image_upload(file):
    """Reject anything too large, or that isn't actually a real image.

    Django's ImageField already runs Pillow's verify() to catch a renamed
    non-image file, but not file size or format — a careless staff upload of
    a 40MB camera photo would otherwise sit on disk (and in every page load)
    forever. Checked here, not just relied on client-side, for the same
    reason every other validator in this file is server-side: the admin form
    is not the only way to POST a file.
    """
    if file.size > MAX_IMAGE_UPLOAD_MB * 1024 * 1024:
        raise ValidationError(
            f'Image is too large ({file.size / 1024 / 1024:.1f} MB) — please '
            f'keep uploads under {MAX_IMAGE_UPLOAD_MB} MB.',
            code='image_too_large',
        )

    from PIL import Image
    try:
        file.seek(0)
        with Image.open(file) as img:
            img.verify()
            fmt = img.format
    except Exception as exc:
        raise ValidationError('That file is not a valid image.', code='invalid_image') from exc
    finally:
        file.seek(0)

    if fmt not in ALLOWED_IMAGE_FORMATS:
        raise ValidationError(
            f'Unsupported image format ({fmt or "unknown"}) — please upload a JPEG, PNG or WebP.',
            code='invalid_image_format',
        )

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
