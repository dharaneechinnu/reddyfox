"""Orchestrates a reference-rate fetch: store ReferenceRate rows, then apply staff-configured
margins onto whichever Currency rows have opted in.

Shared by the scheduled command (fetch_reference_rates) and the manual "Fetch reference rates now"
admin action, so both paths do exactly the same thing — one runs on a timer, the other on a click.
"""
import logging
from decimal import ROUND_HALF_UP, Decimal

from rates.models import Currency

from .models import ReferenceRate
from .providers import fetch_reference_rates

logger = logging.getLogger(__name__)

TWO_PLACES = Decimal('0.01')


def refresh_reference_rates():
    """Fetch, store, and (for opted-in currencies) apply reference rates.

    Never raises — a total provider outage is reported in the returned summary, not an exception,
    so neither the cron command nor the admin action can be taken down by an upstream API being
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
    auto_update_rows = Currency.objects.filter(code__in=results.keys(), auto_update_from_reference=True)
    for currency in auto_update_rows:
        market_rate = Decimal(str(results[currency.code][0]))
        currency.sell_rate = (market_rate + currency.sell_margin).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
        currency.buy_rate = (market_rate + currency.buy_margin).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
        currency.save(update_fields=['buy_rate', 'sell_rate', 'updated_at'])
        applied += 1

    return {'ok': True, 'fetched': len(results), 'applied': applied, 'missing': missing}
