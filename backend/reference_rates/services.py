"""Orchestrates a reference-rate fetch: store ReferenceRate rows, then — if the one global setting
is on — apply the one global margin to every currency's buy_rate/sell_rate.

Shared by the scheduled command (fetch_reference_rates), the manual "Fetch reference rates now"
admin action, and the "Reference rates & margins" admin page, so all three paths do exactly the
same thing.
"""
import logging
from decimal import ROUND_HALF_UP, Decimal

from rates.models import Currency

from .models import ReferenceRate, ReferenceRateSettings
from .providers import fetch_reference_rates

logger = logging.getLogger(__name__)

TWO_PLACES = Decimal('0.01')


def refresh_reference_rates():
    """Fetch, store, and — if auto-update is on — apply reference rates.

    Never raises — a total provider outage is reported in the returned summary, not an exception,
    so neither the cron command nor an admin page can be taken down by an upstream API being
    unreachable. Returns:

        {
            'ok': bool,              # False only if every provider failed
            'fetched': int,          # ReferenceRate rows written
            'applied': int,          # Currency rows whose buy/sell rate were recalculated
            'missing': [str, ...],   # board currencies no provider covered
        }
    """
    codes = list(Currency.objects.values_list('code', flat=True).distinct())
    if not codes:
        return {'ok': True, 'fetched': 0, 'applied': 0, 'missing': []}

    results = fetch_reference_rates(codes)
    missing = sorted(set(codes) - results.keys())

    if not results:
        logger.error('All reference-rate providers failed; nothing updated.')
        return {'ok': False, 'fetched': 0, 'applied': 0, 'missing': missing}

    if missing:
        logger.warning('No reference rate available for: %s', ', '.join(missing))

    for code, (inr_rate, source) in results.items():
        ReferenceRate.objects.update_or_create(
            code=code,
            defaults={'inr_rate': inr_rate, 'source': source},
        )

    applied = 0
    settings_obj = ReferenceRateSettings.load()
    if settings_obj.auto_update_enabled:
        for currency in Currency.objects.filter(code__in=results.keys()):
            market_rate = Decimal(str(results[currency.code][0]))
            currency.sell_rate = (market_rate + settings_obj.sell_margin).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
            currency.buy_rate = (market_rate + settings_obj.buy_margin).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
            currency.save(update_fields=['buy_rate', 'sell_rate', 'updated_at'])
            applied += 1

    return {'ok': True, 'fetched': len(results), 'applied': applied, 'missing': missing}
