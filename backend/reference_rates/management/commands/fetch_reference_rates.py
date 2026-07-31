from django.core.management.base import BaseCommand

from reference_rates.services import refresh_reference_rates


class Command(BaseCommand):
    help = (
        'Fetch third-party mid-market reference rates for every currency on the board, store them '
        'in ReferenceRate, and apply staff-configured margins onto any Currency row with '
        'auto_update_from_reference on. Intended to run on a schedule (see docs/currency-rate-apis.md '
        'for the Render Cron Job setup), not during a request. The same logic backs the "Fetch '
        'reference rates now" admin action, for an on-demand run.'
    )

    def handle(self, *args, **options):
        summary = refresh_reference_rates()

        if not summary['ok']:
            self.stderr.write(self.style.ERROR('All reference-rate providers failed; nothing updated.'))
            raise SystemExit(1)

        message = f'Fetched {summary["fetched"]} reference rates, applied to {summary["applied"]} currencies.'
        if summary['missing']:
            message += f' Missing: {", ".join(summary["missing"])}.'
        self.stdout.write(self.style.SUCCESS(message))
