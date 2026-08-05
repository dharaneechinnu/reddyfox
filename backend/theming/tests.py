from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.test import Client, TestCase, override_settings
from django.urls import reverse

from .models import ThemeSetting
from .views import CACHE_KEY

# The shipped brand colour, read off the field rather than repeated in every test that
# happens to need "whatever the default is". Only the tests whose actual subject is the
# palette (ResetToDefaultsTests) spell the hex out — everything below cares that the row
# is created, served and cached, not what colour it is.
DEFAULT_BRAND = ThemeSetting._meta.get_field('brand').get_default()

PLAIN_STATIC = override_settings(STORAGES={
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
})


class SingletonTests(TestCase):
    def test_load_creates_the_one_row_with_defaults(self):
        theme = ThemeSetting.load()
        self.assertEqual(theme.pk, 1)
        self.assertEqual(theme.brand, DEFAULT_BRAND)
        self.assertEqual(ThemeSetting.objects.count(), 1)

    def test_save_always_pins_pk_to_one(self):
        ThemeSetting.load()
        ThemeSetting(brand='#123456').save()
        self.assertEqual(ThemeSetting.objects.count(), 1)
        self.assertEqual(ThemeSetting.load().brand, '#123456')

    def test_delete_is_a_no_op(self):
        ThemeSetting.load().delete()
        self.assertEqual(ThemeSetting.objects.count(), 1)


class ResetToDefaultsTests(TestCase):
    def test_overwrites_every_field_with_the_model_default(self):
        theme = ThemeSetting.load()
        theme.brand = '#123456'
        theme.surface = '#000000'
        theme.base_font_size = Decimal('20')
        theme.font_serif = "'Comic Sans MS', cursive"
        theme.save()

        theme.reset_to_defaults()

        theme.refresh_from_db()
        self.assertEqual(theme.brand, '#26307A')
        self.assertEqual(theme.surface, '#FFFFFF')
        self.assertEqual(theme.base_font_size, Decimal('16.0'))
        self.assertEqual(theme.font_serif, "'Instrument Serif', serif")

    def test_does_not_change_the_primary_key(self):
        theme = ThemeSetting.load()
        theme.reset_to_defaults()
        self.assertEqual(theme.pk, 1)
        self.assertEqual(ThemeSetting.objects.count(), 1)


class HexValidationTests(TestCase):
    def test_six_and_three_digit_hex_are_both_accepted(self):
        for value in ('#A87B2C', '#a87b2c', '#E51'):
            ThemeSetting(brand=value).full_clean()  # must not raise

    def test_a_colour_that_is_not_a_hex_is_rejected(self):
        # These values are interpolated straight into a stylesheet, so anything the browser
        # would choke on has to fail here rather than silently producing an unstyled page.
        for value in ('A87B2C', 'orange', '#12345', 'rgb(1,2,3)', '#GGGGGG', ''):
            with self.assertRaises(ValidationError, msg=f'{value!r} should have been rejected'):
                ThemeSetting(brand=value).full_clean()


class TypeScaleTests(TestCase):
    """The scale's whole job is that one number moves every size together and keeps the design
    in proportion — so these assert the relationships, not just that a key exists."""

    def test_reference_base_reproduces_the_original_hardcoded_sizes(self):
        # The refactor that introduced this app replaced ~180 inline sizes. At the reference base
        # the scale must land on exactly the pixels those had, or that migration was not lossless.
        # The site now ships a larger base (see below) — this pins the proportions the whole
        # design was drawn at, which is what makes rescaling it safe.
        theme = ThemeSetting.load()
        theme.base_font_size = Decimal('14.5')
        variables = theme.css_variables
        self.assertEqual(variables['--fx-text-2xs'], '10px')
        self.assertEqual(variables['--fx-text-xs'], '11.5px')
        self.assertEqual(variables['--fx-text-sm'], '12.5px')
        self.assertEqual(variables['--fx-text-base'], '14.5px')
        self.assertEqual(variables['--fx-text-md'], '15.5px')
        self.assertEqual(variables['--fx-text-lg'], '16.5px')
        self.assertEqual(variables['--fx-text-xl'], '18px')
        self.assertEqual(variables['--fx-text-2xl'], '20px')
        self.assertEqual(variables['--fx-text-3xl'], '26px')
        self.assertEqual(variables['--fx-text-h3'], 'clamp(28px, 3vw, 42px)')
        self.assertEqual(variables['--fx-text-h2'], 'clamp(32px, 3.4vw, 48px)')
        self.assertEqual(variables['--fx-text-h1'], 'clamp(34px, 4vw, 56px)')
        self.assertEqual(variables['--fx-text-hero'], 'clamp(42px, 4.6vw, 68px)')

    def test_shipped_default_is_a_16px_reading_size(self):
        # These values are duplicated by hand in frontend/src/theme.css as the pre-API default,
        # and the two must agree — a mismatch means the site resizes the moment /api/theme/
        # answers. If you change base_font_size's default, change theme.css to match.
        variables = ThemeSetting.load().css_variables
        self.assertEqual(variables['--fx-text-2xs'], '11px')
        self.assertEqual(variables['--fx-text-xs'], '12.5px')
        self.assertEqual(variables['--fx-text-sm'], '14px')
        self.assertEqual(variables['--fx-text-base'], '16px')
        self.assertEqual(variables['--fx-text-md'], '17px')
        self.assertEqual(variables['--fx-text-lg'], '18px')
        self.assertEqual(variables['--fx-text-xl'], '20px')
        self.assertEqual(variables['--fx-text-2xl'], '22px')
        self.assertEqual(variables['--fx-text-3xl'], '28.5px')
        self.assertEqual(variables['--fx-text-h3'], 'clamp(31px, 3vw, 46.5px)')
        self.assertEqual(variables['--fx-text-h2'], 'clamp(35.5px, 3.4vw, 53px)')
        self.assertEqual(variables['--fx-text-h1'], 'clamp(37.5px, 4vw, 62px)')
        self.assertEqual(variables['--fx-text-hero'], 'clamp(46.5px, 4.6vw, 75px)')

    def test_raising_the_base_size_scales_every_size_proportionally(self):
        theme = ThemeSetting.load()
        theme.base_font_size = Decimal('29')  # exactly double the reference base
        variables = theme.css_variables
        self.assertEqual(variables['--fx-text-base'], '29px')
        self.assertEqual(variables['--fx-text-xs'], '23px')
        self.assertEqual(variables['--fx-text-2xl'], '40px')

    def test_heading_scale_lifts_headings_without_touching_body_text(self):
        theme = ThemeSetting.load()
        theme.heading_scale = Decimal('1.50')
        variables = theme.css_variables
        self.assertEqual(variables['--fx-text-base'], '16px')  # body untouched
        self.assertEqual(variables['--fx-text-md'], '17px')
        self.assertEqual(variables['--fx-text-3xl'], '43px')   # 26 * 1.5, at the 16px base
        self.assertEqual(variables['--fx-text-h1'], 'clamp(56.5px, 4vw, 92.5px)')

    def test_sizes_are_rounded_to_half_a_pixel(self):
        # Finer than this is invisible and just reproduces the 14.6-vs-14.8 noise the scale
        # exists to remove.
        theme = ThemeSetting.load()
        theme.base_font_size = Decimal('15.3')
        for key, value in theme.css_variables.items():
            if not key.startswith('--fx-text-') or 'clamp' in value:
                continue
            self.assertEqual((float(value.removesuffix('px')) * 2) % 1, 0, f'{key} = {value}')

    def test_every_core_colour_and_font_reaches_the_variable_map(self):
        theme = ThemeSetting.load()
        theme.brand = '#AABBCC'
        theme.font_serif = "'Fraunces', serif"
        variables = theme.css_variables
        self.assertEqual(variables['--fx-brand'], '#AABBCC')
        self.assertEqual(variables['--fx-font-serif'], "'Fraunces', serif")
        self.assertEqual(variables['--fx-radius'], '14px')


class ThemeApiTests(TestCase):
    def setUp(self):
        cache.delete(CACHE_KEY)

    def test_returns_variables_and_the_fonts_url(self):
        response = self.client.get(reverse('site-theme'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['css_variables']['--fx-brand'], DEFAULT_BRAND)
        self.assertIn('Instrument+Sans', response.data['fonts_url'])

    def test_works_before_anyone_has_opened_the_admin(self):
        # The row is created on demand — a fresh deploy must not 500 here just because nobody
        # has saved the theme form yet.
        ThemeSetting.objects.all().delete()
        response = self.client.get(reverse('site-theme'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['css_variables']['--fx-brand'], DEFAULT_BRAND)

    def test_an_admin_edit_shows_up_on_the_next_request(self):
        self.client.get(reverse('site-theme'))  # prime the cache
        theme = ThemeSetting.load()
        theme.brand = '#00FF00'
        theme.save()
        response = self.client.get(reverse('site-theme'))
        self.assertEqual(response.data['css_variables']['--fx-brand'], '#00FF00')

    def test_response_is_cached_between_saves(self):
        self.client.get(reverse('site-theme'))
        # Written straight to the DB, so no post_save signal fires and no cache drop happens.
        ThemeSetting.objects.filter(pk=1).update(brand='#00FF00')
        response = self.client.get(reverse('site-theme'))
        self.assertEqual(response.data['css_variables']['--fx-brand'], DEFAULT_BRAND)


@PLAIN_STATIC
class ThemeAdminTests(TestCase):
    def setUp(self):
        get_user_model().objects.create_superuser('boss', 'b@example.com', 'pw12345')
        self.client = Client()
        self.client.login(username='boss', password='pw12345')

    def test_changelist_creates_the_row_and_loads(self):
        ThemeSetting.objects.all().delete()
        response = self.client.get('/admin/theming/themesetting/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(ThemeSetting.objects.count(), 1)

    def test_change_form_renders_pickers_and_both_previews(self):
        ThemeSetting.load()
        response = self.client.get('/admin/theming/themesetting/1/change/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'type="color"')
        self.assertContains(response, 'Current palette')
        self.assertContains(response, 'Resulting sizes')

    def test_the_row_cannot_be_deleted(self):
        ThemeSetting.load()
        self.client.post('/admin/theming/themesetting/1/delete/', {'post': 'yes'})
        self.assertEqual(ThemeSetting.objects.count(), 1)

    def test_reset_action_restores_the_default_palette(self):
        theme = ThemeSetting.load()
        theme.brand = '#123456'
        theme.save()

        response = self.client.post('/admin/theming/themesetting/', {
            'action': 'reset_to_defaults',
            '_selected_action': [str(theme.pk)],
        }, follow=True)

        self.assertEqual(response.status_code, 200)
        theme.refresh_from_db()
        self.assertEqual(theme.brand, DEFAULT_BRAND)
