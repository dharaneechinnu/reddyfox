from unittest.mock import patch

from django.test import TestCase, override_settings

from . import providers
from .providers import Provider


class ExchangeRateApiProviderTests(TestCase):
    @override_settings(EXCHANGERATE_API_KEY='')
    def test_missing_key_raises_without_a_network_call(self):
        with patch('fx_providers.providers._fetch_json') as fetch_json:
            with self.assertRaises(RuntimeError):
                providers.fetch_exchangerateapi()
            fetch_json.assert_not_called()

    @override_settings(EXCHANGERATE_API_KEY='test-key')
    def test_success_response_is_parsed_and_inverted(self):
        payload = {
            'result': 'success',
            'base_code': 'INR',
            'conversion_rates': {'USD': 0.0105, 'AED': 0.0384},
        }
        with patch('fx_providers.providers._fetch_json', return_value=payload):
            rates, source = providers.fetch_exchangerateapi()

        self.assertEqual(source, Provider.EXCHANGERATE_API)
        self.assertAlmostEqual(rates['USD'], 1 / 0.0105)
        self.assertAlmostEqual(rates['AED'], 1 / 0.0384)

    @override_settings(EXCHANGERATE_API_KEY='test-key')
    def test_vendor_error_result_raises_with_the_error_type(self):
        payload = {'result': 'error', 'error-type': 'quota-reached'}
        with patch('fx_providers.providers._fetch_json', return_value=payload):
            with self.assertRaisesMessage(RuntimeError, 'quota-reached'):
                providers.fetch_exchangerateapi()


class FetchWithFallbackTests(TestCase):
    """fetch_with_fallback() — the ordering providers are tried in, and that `primary` actually
    moves a provider to the front instead of just being decorative."""

    @override_settings(EXCHANGERATE_API_KEY='test-key')
    def test_default_order_tries_exchangerateapi_first(self):
        with patch('fx_providers.providers.fetch_exchangerateapi', return_value=({'USD': 90.0}, Provider.EXCHANGERATE_API)) as primary, \
             patch('fx_providers.providers.fetch_fawazahmed0') as fallback:
            results = providers.fetch_with_fallback(['USD'])

        self.assertEqual(results, {'USD': (90.0, Provider.EXCHANGERATE_API)})
        primary.assert_called_once()
        fallback.assert_not_called()

    def test_explicit_primary_is_tried_first_even_if_not_the_default(self):
        with patch('fx_providers.providers.fetch_fawazahmed0', return_value=({'USD': 91.0}, Provider.FAWAZAHMED0)) as chosen, \
             patch('fx_providers.providers.fetch_exchangerateapi') as not_chosen:
            results = providers.fetch_with_fallback(['USD'], primary=Provider.FAWAZAHMED0)

        self.assertEqual(results, {'USD': (91.0, Provider.FAWAZAHMED0)})
        chosen.assert_called_once()
        not_chosen.assert_not_called()

    @override_settings(EXCHANGERATE_API_KEY='')
    def test_falls_back_when_primary_is_unavailable(self):
        with patch('fx_providers.providers.fetch_fawazahmed0', return_value=({'USD': 91.0}, Provider.FAWAZAHMED0)) as fallback:
            results = providers.fetch_with_fallback(['USD'])  # exchangerate-api has no key set

        self.assertEqual(results, {'USD': (91.0, Provider.FAWAZAHMED0)})
        fallback.assert_called_once()

    @override_settings(EXCHANGERATE_API_KEY='test-key')
    def test_next_provider_fills_in_whatever_the_first_missed(self):
        with patch('fx_providers.providers.fetch_exchangerateapi', return_value=({'USD': 90.0}, Provider.EXCHANGERATE_API)), \
             patch('fx_providers.providers.fetch_fawazahmed0', return_value=({'USD': 91.0, 'AED': 26.0}, Provider.FAWAZAHMED0)):
            results = providers.fetch_with_fallback(['USD', 'AED'])

        self.assertEqual(results, {'USD': (90.0, Provider.EXCHANGERATE_API), 'AED': (26.0, Provider.FAWAZAHMED0)})

    @override_settings(EXCHANGERATE_API_KEY='')
    def test_frankfurter_is_the_last_resort(self):
        with patch('fx_providers.providers.fetch_fawazahmed0', side_effect=RuntimeError('down')), \
             patch('fx_providers.providers.fetch_frankfurter', return_value=({'USD': 92.0}, Provider.FRANKFURTER)):
            results = providers.fetch_with_fallback(['USD'])

        self.assertEqual(results, {'USD': (92.0, Provider.FRANKFURTER)})

    def test_every_provider_failing_returns_empty_dict_not_an_exception(self):
        with patch('fx_providers.providers.fetch_exchangerateapi', side_effect=RuntimeError('no key')), \
             patch('fx_providers.providers.fetch_fawazahmed0', side_effect=RuntimeError('down')), \
             patch('fx_providers.providers.fetch_frankfurter', side_effect=RuntimeError('down')):
            results = providers.fetch_with_fallback(['USD'])

        self.assertEqual(results, {})
