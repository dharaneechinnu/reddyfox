from unittest.mock import patch

from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from django.test import Client, TestCase, override_settings

from rates.admin import CurrencyAdmin
from rates.models import Currency, RateType

from .management.commands.fetch_reference_rates import Command
from .models import ReferenceRate


def _currency(code='USD', sell_rate='84.0000'):
    return Currency.objects.create(
        code=code, name=code, country_code='US', rate_type=RateType.CASH,
        buy_rate='83.0000', sell_rate=sell_rate,
    )


class FetchReferenceRatesCommandTests(TestCase):
    def test_upserts_rates_for_covered_currencies(self):
        _currency('USD')
        _currency('EUR')
        with patch(
            'reference_rates.management.commands.fetch_reference_rates.fetch_reference_rates',
            return_value={'USD': (84.5, 'fawazahmed0'), 'EUR': (97.2, 'fawazahmed0')},
        ):
            Command().handle()

        self.assertEqual(ReferenceRate.objects.count(), 2)
        usd = ReferenceRate.objects.get(code='USD')
        self.assertAlmostEqual(float(usd.inr_rate), 84.5)

    def test_both_providers_down_leaves_existing_rows_untouched(self):
        _currency('USD')
        ReferenceRate.objects.create(code='USD', inr_rate='84.0', source='fawazahmed0')

        with patch(
            'reference_rates.management.commands.fetch_reference_rates.fetch_reference_rates',
            return_value={},
        ):
            with self.assertRaises(SystemExit):
                Command().handle()

        self.assertEqual(ReferenceRate.objects.get(code='USD').inr_rate, 84)

    def test_no_currencies_is_a_no_op(self):
        Command().handle()
        self.assertEqual(ReferenceRate.objects.count(), 0)


class CurrencyAdminMarketReferenceTests(TestCase):
    def setUp(self):
        self.admin = CurrencyAdmin(Currency, AdminSite())

    def test_no_reference_row(self):
        currency = _currency('GBP')
        self.admin.get_queryset(request=None)
        self.assertIn('no reference', self.admin.market_reference(currency))

    def test_within_threshold_renders_green(self):
        currency = _currency('USD', sell_rate='84.0000')
        ReferenceRate.objects.create(code='USD', inr_rate='84.1', source='fawazahmed0')
        self.admin.get_queryset(request=None)
        html = self.admin.market_reference(currency)
        self.assertIn('#2e7d32', html)

    def test_beyond_threshold_renders_red(self):
        # sell_rate off by ~10x — the classic typo this column exists to catch.
        currency = _currency('USD', sell_rate='8.4000')
        ReferenceRate.objects.create(code='USD', inr_rate='84.0', source='fawazahmed0')
        self.admin.get_queryset(request=None)
        html = self.admin.market_reference(currency)
        self.assertIn('#c0392b', html)

    def test_stale_reference_shown_as_stale(self):
        currency = _currency('USD')
        ref = ReferenceRate.objects.create(code='USD', inr_rate='84.0', source='fawazahmed0')
        ReferenceRate.objects.filter(pk=ref.pk).update(
            fetched_at=ref.fetched_at - __import__('datetime').timedelta(days=5)
        )
        self.admin.get_queryset(request=None)
        html = self.admin.market_reference(currency)
        self.assertIn('stale', html)


@override_settings(STORAGES={
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
})
class CurrencyChangelistRendersTests(TestCase):
    """The market_reference column must not break the real admin changelist page.

    Static storage is overridden to the plain (non-manifest) backend because the manifest one
    requires `collectstatic` to have run, which is a deploy-time step, not a test-time one.
    """

    def test_changelist_loads(self):
        _currency('USD')
        ReferenceRate.objects.create(code='USD', inr_rate='84.1', source='fawazahmed0')
        User = get_user_model()
        User.objects.create_superuser('admin', 'admin@example.com', 'password123')
        client = Client()
        client.login(username='admin', password='password123')
        response = client.get('/admin/rates/currency/')
        self.assertEqual(response.status_code, 200)
