"""The one thing this app does: answer "should this kind of lead reach Telegram?" — nothing about
how a Telegram message gets built or sent lives here, only the yes/no config rule.

No caching layer: this is checked once per lead submission (a few dozen a day for this business),
not on every page load the way feature_flags' /api/flags/ is — a plain query is the right amount
of engineering for this volume. See docs/telegram-bot.md for the reasoning.
"""
import logging

from .models import LeadAlertRule

logger = logging.getLogger(__name__)


def is_telegram_enabled_for(kind):
    """True/False per the checklist in /admin/. Never raises: a missing row is created on the
    spot defaulting to enabled (self-healing — e.g. a future Lead.Kind added without a matching
    data migration still gets alerts rather than silently going dark), and any other failure
    (a DB hiccup) fails open rather than silently suppressing every Telegram alert."""
    try:
        rule, _ = LeadAlertRule.objects.get_or_create(
            kind=kind, defaults={'kind_label': kind.replace('_', ' ').title(), 'telegram_enabled': True},
        )
        return rule.telegram_enabled
    except Exception:
        logger.exception('alert_routing: could not resolve the Telegram rule for kind=%s; defaulting to enabled.', kind)
        return True
