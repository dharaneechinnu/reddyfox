from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import Client, TestCase, override_settings

from fx_providers.providers import Provider
from reference_rates.models import ReferenceRateSettings

PLAIN_STATIC = override_settings(STORAGES={
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
})


def _patch_fetch(return_value):
    return patch('rates.admin.fetch_with_fallback', return_value=return_value)


@PLAIN_STATIC
class LookupRateViewTests(TestCase):
    """/admin/rates/currency/lookup-rate/ — the live-suggestion endpoint the add/change form's
    JS calls as staff type a currency code. Never writes anything; purely informational."""

    def setUp(self):
        self.client = Client()
        User = get_user_model()
        self.staff = User.objects.create_superuser('boss', 'b@example.com', 'pw12345')
        self.client.force_login(self.staff)

    def test_valid_code_returns_suggested_buy_and_sell(self):
        settings_obj = ReferenceRateSettings.load()
        settings_obj.buy_margin = '-1.00'
        settings_obj.sell_margin = '1.00'
        settings_obj.save()

        with _patch_fetch({'BHD': (254.5177, Provider.EXCHANGERATE_API)}):
            response = self.client.get('/admin/rates/currency/lookup-rate/', {'code': 'bhd'})

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['ok'])
        self.assertEqual(data['code'], 'BHD')
        self.assertEqual(data['rate'], '254.52')
        self.assertEqual(data['suggested_buy'], '253.52')
        self.assertEqual(data['suggested_sell'], '255.52')
        self.assertEqual(data['source'], Provider.EXCHANGERATE_API)

    def test_code_not_covered_by_any_provider(self):
        with _patch_fetch({}):
            response = self.client.get('/admin/rates/currency/lookup-rate/', {'code': 'XYZ'})

        data = response.json()
        self.assertFalse(data['ok'])
        self.assertIn('XYZ', data['error'])

    def test_malformed_code_is_rejected_without_a_network_call(self):
        with _patch_fetch({}) as fetch:
            response = self.client.get('/admin/rates/currency/lookup-rate/', {'code': 'toolong'})
        fetch.assert_not_called()
        self.assertFalse(response.json()['ok'])

    def test_blank_code_is_rejected(self):
        response = self.client.get('/admin/rates/currency/lookup-rate/', {'code': ''})
        self.assertFalse(response.json()['ok'])

    def test_provider_exception_is_handled_cleanly(self):
        with patch('rates.admin.fetch_with_fallback', side_effect=RuntimeError('network down')):
            response = self.client.get('/admin/rates/currency/lookup-rate/', {'code': 'BHD'})
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()['ok'])

    def test_staff_without_add_permission_is_forbidden(self):
        User = get_user_model()
        limited = User.objects.create_user('limited', 'l@example.com', 'pw12345', is_staff=True)
        self.client.force_login(limited)

        with _patch_fetch({'BHD': (254.52, Provider.EXCHANGERATE_API)}):
            response = self.client.get('/admin/rates/currency/lookup-rate/', {'code': 'BHD'})

        self.assertEqual(response.status_code, 403)

    def test_anonymous_user_is_redirected_to_login(self):
        anon = Client()
        response = anon.get('/admin/rates/currency/lookup-rate/', {'code': 'BHD'})
        self.assertEqual(response.status_code, 302)

    def test_add_page_loads_the_lookup_script(self):
        response = self.client.get('/admin/rates/currency/add/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'currency_rate_lookup.js')
