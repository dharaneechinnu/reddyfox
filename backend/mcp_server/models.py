"""Access control and audit trail for the MCP endpoint.

The public API is read-only on purpose (see CLAUDE.md). This app is the one
way in that writes, so it carries its own credential rather than reusing a
staff login: an assistant holding a token can be scoped, expired and revoked
without touching anyone's admin account, and every call it makes is recorded.
"""
import hashlib
import secrets

from django.db import models
from django.utils import timezone

#: Prefixed so a leaked token is recognisable in a log or a paste, and so
#: secret-scanning tools have something to match on.
TOKEN_PREFIX = 'rfx_mcp_'


def generate_token():
    return f'{TOKEN_PREFIX}{secrets.token_urlsafe(32)}'


def hash_token(raw):
    """Tokens are stored as a SHA-256 digest, never in plain text.

    No salt and no slow KDF on purpose: this is a 256-bit random secret, not a
    human-chosen password, so there is no dictionary to attack and a fast hash
    is what lets a lookup be a single indexed query.
    """
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()


class McpToken(models.Model):
    """One credential, for one assistant, with its own scopes.

    Create one per place it is used ("Claude desktop — Priya", "ChatGPT —
    front office") rather than sharing one: revoking then costs one row, and
    the audit log below says which of them did what.
    """

    name = models.CharField(
        max_length=80,
        help_text='Who or what uses this token, e.g. "Claude desktop — Priya". '
                  'Shown in the audit log against every call it makes.',
    )
    token_hash = models.CharField(max_length=64, unique=True, editable=False)
    token_hint = models.CharField(
        max_length=12, editable=False,
        help_text='The last few characters of the token, so you can tell two rows apart.',
    )

    # Scopes. Read is implied by the others but kept separate so a token can be
    # granted look-but-don't-touch access.
    can_read = models.BooleanField(
        default=True,
        help_text='List images, testimonials and FAQs. Safe: reads published and '
                  'unpublished content but changes nothing.',
    )
    can_write_images = models.BooleanField(
        default=False,
        help_text='Upload photos into site image slots and edit their alt text.',
    )
    can_write_content = models.BooleanField(
        default=False,
        help_text='Create and edit testimonials and FAQs. New items always arrive '
                  'unpublished for a human to review — see docs/mcp-server.md.',
    )

    is_active = models.BooleanField(
        default=True,
        help_text='Untick to revoke immediately without deleting the audit trail.',
    )
    expires_at = models.DateTimeField(
        null=True, blank=True,
        help_text='Optional. After this moment the token stops working. Leave blank for no expiry.',
    )
    last_used_at = models.DateTimeField(null=True, blank=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'MCP token'
        verbose_name_plural = 'MCP tokens'

    def __str__(self):
        return f'{self.name} (…{self.token_hint})'

    def set_token(self, raw):
        self.token_hash = hash_token(raw)
        self.token_hint = raw[-6:]

    @property
    def is_expired(self):
        return self.expires_at is not None and self.expires_at <= timezone.now()

    @property
    def is_usable(self):
        return self.is_active and not self.is_expired

    @property
    def scopes(self):
        granted = []
        if self.can_read:
            granted.append('read')
        if self.can_write_images:
            granted.append('images')
        if self.can_write_content:
            granted.append('content')
        return granted

    def has_scope(self, scope):
        return scope in self.scopes

    @classmethod
    def resolve(cls, raw):
        """Return the usable token matching this secret, or None.

        Returns None for an unknown, revoked or expired token alike — the
        caller gets one undifferentiated 401 either way, so a probe can't use
        the response to tell "wrong secret" from "right secret, revoked".
        """
        if not raw:
            return None
        token = cls.objects.filter(token_hash=hash_token(raw)).first()
        if token is None or not token.is_usable:
            return None
        return token

    def touch(self):
        """Record that this token was just used, without a full model save."""
        self.last_used_at = timezone.now()
        self.save(update_fields=['last_used_at'])


class McpCallLog(models.Model):
    """One row per tool call, so there is a record of what an assistant changed.

    `detail` is a short human-readable summary, never the raw arguments — an
    image upload's arguments are megabytes of base64 and a lead's would be
    personal data. Keeping it a summary is what makes this table safe to leave
    on indefinitely.
    """

    class Status(models.TextChoices):
        OK = 'ok', 'OK'
        ERROR = 'error', 'Error'
        DENIED = 'denied', 'Denied'

    token = models.ForeignKey(
        McpToken, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='calls',
        help_text='Null once the token itself has been deleted — the log entry outlives it.',
    )
    token_name = models.CharField(
        max_length=80, blank=True,
        help_text='Copied at call time so the log still names the caller after the token is deleted.',
    )
    tool = models.CharField(max_length=60)
    status = models.CharField(max_length=8, choices=Status.choices)
    detail = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'MCP call log'
        verbose_name_plural = 'MCP call log'

    def __str__(self):
        return f'{self.created_at:%Y-%m-%d %H:%M} {self.tool} ({self.status})'
