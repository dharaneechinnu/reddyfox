import logging

from django.core.management.base import BaseCommand

from rates.models import Currency
from reference_rates.models import ReferenceRate
from reference_rates.providers import fetch_reference_rates

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = (
        'Fetch third-party mid-market reference rates for every currency on the board and store '
        'them in ReferenceRate, for admin guidance only. Never writes to Currency.buy_rate/sell_rate. '
        'Intended to run on a schedule (see docs/currency-rate-apis.md for the Render Cron Job setup), '
        'not during a request.'
    )

    def handle(self, *args, **options):
        codes = list(Currency.objects.values_list('code', flat=True).distinct())
        if not codes:
            self.stdout.write('No currencies on the board yet — nothing to fetch.')
            return

        results = fetch_reference_rates(codes)

        missing = sorted(set(codes) - results.keys())
        if missing:
            logger.warning('No reference rate available for: %s', ', '.join(missing))

        if not results:
            # Both providers are down. Leave existing rows as-is (the admin shows them as stale
            # by age) rather than deleting anything — a failed fetch must never look like "no data".
            self.stderr.write(self.style.ERROR('All reference-rate providers failed; nothing updated.'))
            raise SystemExit(1)

        updated = 0
        for code, (inr_rate, source) in results.items():
            ReferenceRate.objects.update_or_create(
                code=code,
                defaults={'inr_rate': inr_rate, 'source': source},
            )
            updated += 1

        self.stdout.write(self.style.SUCCESS(
            f'Updated {updated}/{len(codes)} reference rates.'
            + (f' Missing: {", ".join(missing)}.' if missing else '')
        ))
