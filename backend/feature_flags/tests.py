from django.core.cache import cache
from django.test import TestCase
from .models import FeatureFlag
from .views import CACHE_KEY


class FeatureFlagApiTests(TestCase):
    def setUp(self):
        cache.delete(CACHE_KEY)
        # The 0002 data migration seeds exchange_rates_page/live_board into
        # every fresh test DB — clear them so each test controls its own
        # fixture instead of asserting around pre-existing rows.
        FeatureFlag.objects.all().delete()

    def test_returns_flat_key_to_bool_map(self):
        FeatureFlag.objects.create(key='exchange_rates_page', name='Exchange rates page', is_enabled=True)
        FeatureFlag.objects.create(key='live_board', name='Live board', is_enabled=False)

        res = self.client.get('/api/flags/')

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {'exchange_rates_page': True, 'live_board': False})

    def test_empty_registry_returns_empty_map_not_error(self):
        res = self.client.get('/api/flags/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {})

    def test_toggling_a_flag_is_reflected_without_waiting_for_cache_expiry(self):
        flag = FeatureFlag.objects.create(key='live_board', name='Live board', is_enabled=True)
        self.client.get('/api/flags/')  # warm the cache

        flag.is_enabled = False
        flag.save()

        res = self.client.get('/api/flags/')
        self.assertEqual(res.json()['live_board'], False)

    def test_deleting_a_flag_clears_it_from_the_cached_map(self):
        flag = FeatureFlag.objects.create(key='live_board', name='Live board', is_enabled=True)
        self.client.get('/api/flags/')  # warm the cache

        flag.delete()

        res = self.client.get('/api/flags/')
        self.assertEqual(res.json(), {})


class FeatureFlagModelTests(TestCase):
    def test_key_must_be_unique(self):
        FeatureFlag.objects.create(key='some_new_flag', name='First')
        with self.assertRaises(Exception):
            FeatureFlag.objects.create(key='some_new_flag', name='Duplicate')

    def test_str_shows_on_off_state(self):
        on = FeatureFlag(key='x', name='X', is_enabled=True)
        off = FeatureFlag(key='y', name='Y', is_enabled=False)
        self.assertIn('on', str(on))
        self.assertIn('off', str(off))


class SeedMigrationTests(TestCase):
    """These run against the DB state the 0002 data migration leaves behind
    on every fresh test run — not creating their own fixtures."""

    def test_seeds_both_flags_enabled(self):
        exchange_rates = FeatureFlag.objects.get(key='exchange_rates_page')
        live_board = FeatureFlag.objects.get(key='live_board')
        self.assertTrue(exchange_rates.is_enabled)
        self.assertTrue(live_board.is_enabled)
