from django.db import migrations

# code -> (name, country_code, region) — matches rates.currency_metadata.CURRENCY_METADATA
CURRENCIES = [
    ('USD', 'US Dollar', 'US', 'Americas'),
    ('GBP', 'British Pound', 'GB', 'Europe'),
    ('EUR', 'Euro', 'EU', 'Europe'),
    ('CHF', 'Swiss Franc', 'CH', 'Europe'),
    ('AUD', 'Australian Dollar', 'AU', 'Asia-Pacific'),
    ('CAD', 'Canadian Dollar', 'CA', 'Americas'),
    ('SGD', 'Singapore Dollar', 'SG', 'Asia-Pacific'),
    ('MYR', 'Malaysian Ringgit', 'MY', 'Asia-Pacific'),
    ('AED', 'UAE Dirham', 'AE', 'Middle East'),
    ('SAR', 'Saudi Riyal', 'SA', 'Middle East'),
    ('THB', 'Thai Baht', 'TH', 'Asia-Pacific'),
    ('LKR', 'Sri Lankan Rupee', 'LK', 'Asia-Pacific'),
    ('CNY', 'Chinese Yuan', 'CN', 'Asia-Pacific'),
    ('HKD', 'Hong Kong Dollar', 'HK', 'Asia-Pacific'),
]


def seed_currencies(apps, schema_editor):
    """Create the board rows for these codes if they don't already exist.

    buy_rate/sell_rate are left at 0.00 and is_visible=False deliberately — this migration only
    lays down the currency board's structure (name/country/region). Real rates come from the
    fetch_reference_rates Render Cron Job (see docs/currency-rate-apis.md), which is the only
    thing allowed to write Currency.buy_rate/sell_rate from a market source, and only once
    ReferenceRateSettings.auto_update_enabled is on. Staff flip is_visible on per currency once
    they've checked the fetched rate.
    """
    Currency = apps.get_model('rates', 'Currency')
    existing = set(Currency.objects.values_list('code', 'rate_type'))

    to_create = [
        Currency(
            code=code,
            name=name,
            country_code=country_code,
            region=region,
            rate_type='cash',
            buy_rate=0,
            sell_rate=0,
            is_visible=False,
            display_order=order,
        )
        for order, (code, name, country_code, region) in enumerate(CURRENCIES)
        if (code, 'cash') not in existing
    ]
    Currency.objects.bulk_create(to_create)


def noop_reverse(apps, schema_editor):
    """Deliberately a no-op — deleting rows on unmigrate risks discarding rates staff have since
    set and made visible, which this migration has no way to distinguish from its own seed data."""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('rates', '0008_remove_currency_auto_update_from_reference_and_more'),
    ]

    operations = [
        migrations.RunPython(seed_currencies, noop_reverse),
    ]
