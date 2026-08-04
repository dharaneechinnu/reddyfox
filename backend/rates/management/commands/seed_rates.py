from django.core.management.base import BaseCommand
from rates.models import Currency

DATA = [
    # code, name, country_code, region, buy, sell
    ('USD', 'US Dollar', 'US', 'Americas', 83.12, 84.06),
    ('EUR', 'Euro', 'EU', 'Europe', 89.40, 90.55),
    ('GBP', 'Pound Sterling', 'GB', 'Europe', 104.20, 105.60),
    ('AED', 'UAE Dirham', 'AE', 'Middle East', 22.45, 22.95),
    ('SGD', 'Singapore Dollar', 'SG', 'Asia-Pacific', 61.20, 62.10),
    ('AUD', 'Australian Dollar', 'AU', 'Asia-Pacific', 54.10, 55.05),
    ('CAD', 'Canadian Dollar', 'CA', 'Americas', 60.35, 61.20),
    ('JPY', 'Japanese Yen', 'JP', 'Asia-Pacific', 0.545, 0.566),
    ('CHF', 'Swiss Franc', 'CH', 'Europe', 93.10, 94.40),
    ('MYR', 'Malaysian Ringgit', 'MY', 'Asia-Pacific', 17.55, 18.05),
    ('NZD', 'New Zealand Dollar', 'NZ', 'Asia-Pacific', 49.80, 50.70),
    ('THB', 'Thai Baht', 'TH', 'Asia-Pacific', 2.28, 2.39),
    ('CNY', 'Chinese Yuan', 'CN', 'Asia-Pacific', 11.42, 11.75),
    ('SAR', 'Saudi Riyal', 'SA', 'Middle East', 21.98, 22.44),
    ('QAR', 'Qatari Riyal', 'QA', 'Middle East', 22.31, 22.86),
    ('HKD', 'Hong Kong Dollar', 'HK', 'Asia-Pacific', 10.55, 10.86),
]


class Command(BaseCommand):
    help = 'Seed the Currency table with the Fox Exchange sample rate board'

    def handle(self, *args, **options):
        for order, (code, name, cc, region, buy, sell) in enumerate(DATA):
            obj, created = Currency.objects.update_or_create(
                code=code,
                defaults={
                    'name': name,
                    'country_code': cc,
                    'region': region,
                    'buy_rate': buy,
                    'sell_rate': sell,
                    'display_order': order,
                },
            )
            action = 'Created' if created else 'Updated'
            self.stdout.write(f'{action} {obj.code}')

        self.stdout.write(self.style.SUCCESS(f'Seeded {len(DATA)} currencies.'))
