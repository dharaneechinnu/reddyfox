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
