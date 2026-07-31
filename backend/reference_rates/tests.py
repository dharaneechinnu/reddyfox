from decimal import Decimal
from unittest.mock import patch

from django.contrib import messages
from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from django.test import Client, RequestFactory, TestCase, override_settings

from rates.admin import CurrencyAdmin
from rates.models import Currency, RateType

from .management.commands.fetch_reference_rates import Command
from .models import ReferenceRate, ReferenceRateSettings
from .services import refresh_reference_rates


def _currency(code='USD', sell_rate='84.0000', buy_rate='83.0000', **extra):
    return Currency.objects.create(
        code=code, name=code, country_code='US', rate_type=RateType.CASH,
        buy_rate=buy_rate, sell_rate=sell_rate, **extra,
    )


def _patch_providers(return_value):
    return patch('reference_rates.services.fetch_reference_rates', return_value=return_value)


def _enable_auto_update(buy_margin='-1.00', sell_margin='1.00'):
    settings_obj = ReferenceRateSettings.load()
    settings_obj.auto_update_enabled = True
    settings_obj.buy_margin = buy_margin
    settings_obj.sell_margin = sell_margin
    settings_obj.save()
    return settings_obj


class ReferenceRateSettingsSingletonTests(TestCase):
    def test_load_creates_the_one_row_with_defaults(self):
        settings_obj = ReferenceRateSettings.load()
        self.assertFalse(settings_obj.auto_update_enabled)
        self.assertEqual(settings_obj.pk, 1)

    def test_save_always_pins_pk_to_one(self):
        obj = ReferenceRateSettings(pk=99, auto_update_enabled=True)
        obj.save()
        self.assertEqual(obj.pk, 1)
        self.assertEqual(ReferenceRateSettings.objects.count(), 1)

    def test_delete_is_a_no_op(self):
        obj = ReferenceRateSettings.load()
        obj.delete()
        self.assertEqual(ReferenceRateSettings.objects.count(), 1)


class RefreshReferenceRatesServiceTests(TestCase):
    def test_upserts_rates_for_covered_currencies(self):
        _currency('USD')
        _currency('EUR')
        with _patch_providers({'USD': (84.5, 'fawazahmed0'), 'EUR': (97.2, 'fawazahmed0')}):
            summary = refresh_reference_rates()

        self.assertEqual(summary, {'ok': True, 'fetched': 2, 'applied': 0, 'missing': []})
        self.assertEqual(ReferenceRate.objects.count(), 2)
        self.assertAlmostEqual(float(ReferenceRate.objects.get(code='USD').inr_rate), 84.5)

    def test_both_providers_down_leaves_existing_rows_untouched(self):
        _currency('USD')
        ReferenceRate.objects.create(code='USD', inr_rate='84.0', source='fawazahmed0')

        with _patch_providers({}):
            summary = refresh_reference_rates()

        self.assertFalse(summary['ok'])
        self.assertEqual(ReferenceRate.objects.get(code='USD').inr_rate, 84)

    def test_no_currencies_is_a_no_op(self):
        summary = refresh_reference_rates()
        self.assertEqual(summary, {'ok': True, 'fetched': 0, 'applied': 0, 'missing': []})

    def test_auto_update_off_leaves_every_currency_untouched(self):
        # ReferenceRateSettings.auto_update_enabled defaults to False — this is the default-safe path.
        currency = _currency('USD', sell_rate='84.00', buy_rate='83.00')
        with _patch_providers({'USD': (90.0, 'fawazahmed0')}):
            summary = refresh_reference_rates()

        currency.refresh_from_db()
        self.assertEqual(summary['applied'], 0)
        self.assertEqual(currency.sell_rate, Decimal('84.00'))
        self.assertEqual(currency.buy_rate, Decimal('83.00'))

    def test_auto_update_on_applies_the_same_margin_to_every_currency(self):
        usd = _currency('USD', sell_rate='1.00', buy_rate='1.00')
        eur = _currency('EUR', sell_rate='1.00', buy_rate='1.00')
        _enable_auto_update(buy_margin='-2.00', sell_margin='1.50')

        with _patch_providers({'USD': (90.0, 'fawazahmed0'), 'EUR': (97.0, 'fawazahmed0')}):
            summary = refresh_reference_rates()

        usd.refresh_from_db()
        eur.refresh_from_db()
        self.assertEqual(summary['applied'], 2)
        self.assertEqual(usd.sell_rate, Decimal('91.50'))
        self.assertEqual(usd.buy_rate, Decimal('88.00'))
        self.assertEqual(eur.sell_rate, Decimal('98.50'))
        self.assertEqual(eur.buy_rate, Decimal('95.00'))

    def test_missing_currency_not_covered_by_any_provider_is_reported(self):
        _currency('AED')
        with _patch_providers({}):
            summary = refresh_reference_rates()
        self.assertEqual(summary['missing'], ['AED'])


class FetchReferenceRatesCommandTests(TestCase):
    """Thin wrapper around the service — just check it surfaces success/failure correctly."""

    def test_success_exits_zero(self):
        _currency('USD')
        with _patch_providers({'USD': (84.5, 'fawazahmed0')}):
            Command().handle()  # should not raise
        self.assertEqual(ReferenceRate.objects.count(), 1)

    def test_total_failure_raises_system_exit(self):
        _currency('USD')
        with _patch_providers({}):
            with self.assertRaises(SystemExit):
                Command().handle()


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


class FetchReferenceRatesNowActionTests(TestCase):
    """The admin's manual-refresh action, exercised the same way Django calls it: as a bound
    method with a request and a queryset (the queryset itself is ignored — it always refreshes
    the whole board, driven by the one global ReferenceRateSettings)."""

    def setUp(self):
        self.admin = CurrencyAdmin(Currency, AdminSite())
        self.request = RequestFactory().post('/admin/rates/currency/')
        self.request.session = {}
        self.request._messages = messages.storage.default_storage(self.request)

    def test_applies_global_margin_and_reports_success(self):
        currency = _currency('USD', sell_rate='1.00', buy_rate='1.00')
        _enable_auto_update(buy_margin='-1.00', sell_margin='1.00')

        with _patch_providers({'USD': (84.0, 'fawazahmed0')}):
            self.admin.fetch_reference_rates_now(self.request, Currency.objects.none())

        currency.refresh_from_db()
        self.assertEqual(currency.sell_rate, Decimal('85.00'))
        self.assertEqual(currency.buy_rate, Decimal('83.00'))
        stored = list(messages.get_messages(self.request))
        self.assertIn('Fetched 1 reference rates, applied to 1 currencies', str(stored[0]))

    def test_total_failure_reports_error_without_raising(self):
        _currency('USD')
        with _patch_providers({}):
            self.admin.fetch_reference_rates_now(self.request, Currency.objects.none())

        stored = list(messages.get_messages(self.request))
        self.assertEqual(stored[0].level, messages.ERROR)


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

    def test_changelist_links_to_reference_rates_page(self):
        User = get_user_model()
        User.objects.create_superuser('admin', 'admin@example.com', 'password123')
        client = Client()
        client.login(username='admin', password='password123')
        response = client.get('/admin/rates/currency/')
        self.assertContains(response, '/admin/rates/currency/reference-rates/')


@override_settings(STORAGES={
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
})
class ReferenceRatesPageTests(TestCase):
    """The one settings-and-results page: GET renders the form plus the last-fetch table, POST
    saves the global config, fetches, and redirects back to itself so the calculated result shows
    on the same page. Gated behind the same permission as editing a Currency."""

    def setUp(self):
        User = get_user_model()
        self.superuser = User.objects.create_superuser('admin', 'admin@example.com', 'password123')
        self.client = Client()

    def test_get_renders_settings_form_and_currency_table(self):
        _currency('USD')
        _currency('EUR')
        self.client.login(username='admin', password='password123')
        response = self.client.get('/admin/rates/currency/reference-rates/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'auto_update_enabled')
        self.assertContains(response, 'buy_margin')
        self.assertContains(response, 'sell_margin')
        self.assertContains(response, 'USD')
        self.assertContains(response, 'EUR')

    def test_post_saves_settings_fetches_and_shows_result_on_same_page(self):
        usd = _currency('USD', sell_rate='1.00', buy_rate='1.00')
        eur = _currency('EUR', sell_rate='1.00', buy_rate='1.00')
        self.client.login(username='admin', password='password123')

        data = {
            'auto_update_enabled': 'on',
            'buy_margin': '-2.00',
            'sell_margin': '2.00',
        }
        with _patch_providers({'USD': (90.0, 'fawazahmed0'), 'EUR': (97.0, 'fawazahmed0')}):
            response = self.client.post('/admin/rates/currency/reference-rates/', data, follow=True)

        # Redirects to itself (POST-redirect-GET), not the changelist — the calculated result is
        # shown right on this page.
        self.assertRedirects(response, '/admin/rates/currency/reference-rates/')
        self.assertContains(response, '92.00')  # USD sell: 90 market + 2 margin
        self.assertContains(response, '88.00')  # USD buy: 90 market - 2 margin
        settings_obj = ReferenceRateSettings.load()
        self.assertTrue(settings_obj.auto_update_enabled)
        self.assertEqual(settings_obj.buy_margin, Decimal('-2.00'))
        self.assertEqual(settings_obj.sell_margin, Decimal('2.00'))

        usd.refresh_from_db()
        eur.refresh_from_db()
        self.assertEqual(usd.sell_rate, Decimal('92.00'))
        self.assertEqual(usd.buy_rate, Decimal('88.00'))
        self.assertEqual(eur.sell_rate, Decimal('99.00'))
        self.assertEqual(eur.buy_rate, Decimal('95.00'))

    def test_requires_login(self):
        response = self.client.get('/admin/rates/currency/reference-rates/')
        self.assertNotEqual(response.status_code, 200)

    def test_staff_without_change_permission_is_redirected(self):
        User = get_user_model()
        limited = User.objects.create_user('limited', 'limited@example.com', 'password123', is_staff=True)
        self.client.login(username='limited', password='password123')
        response = self.client.get('/admin/rates/currency/reference-rates/', follow=True)
        self.assertRedirects(response, '/admin/')
