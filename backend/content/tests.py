import io
import shutil
import tempfile
from datetime import timedelta

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.urls import reverse
from PIL import Image
from rest_framework.test import APIClient

from rates.models import Currency
from .models import CallbackRequest, Enquiry, Lead, QuoteRequest, SiteImage, SiteSetting
from .validators import landline_tel, validate_image_upload, validate_landline

# Rendering an admin page needs a staticfiles manifest, which only exists
# after `collectstatic`. Production builds one; the test runner shouldn't
# have to. (See issue #22 — the same gap breaks /admin/ in production if the
# deploy skips collectstatic.)
PLAIN_STATIC = override_settings(STORAGES={
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
})


def _make_usd():
    return Currency.objects.get_or_create(
        code='USD', defaults=dict(name='US Dollar', country_code='US', buy_rate='83.0', sell_rate='84.0'),
    )[0]


def _enquiry(**kw):
    d = dict(name='Deborah Beck', phone='9876543210', email='d@example.com', message='Need USD please')
    d.update(kw)
    return Enquiry.objects.create(**d)


class PriorityOnArrivalTests(TestCase):
    """Every lead kind arrives Normal by default. Urgent is only reached by
    an explicit priority set on creation, or a later staff edit."""

    def test_enquiry_arrives_normal(self):
        self.assertEqual(_enquiry().priority, Lead.Priority.NORMAL)

    def test_quote_request_arrives_normal(self):
        quote = QuoteRequest.objects.create(name='X', phone='9876543210', email='x@example.com')
        self.assertEqual(quote.priority, Lead.Priority.NORMAL)

    def test_explicit_priority_is_respected_on_creation(self):
        self.assertEqual(_enquiry(priority=Lead.Priority.HIGH).priority, Lead.Priority.HIGH)

    def test_staff_can_lower_an_urgent_lead_and_it_sticks(self):
        lead = _enquiry(priority=Lead.Priority.URGENT)
        lead.priority = Lead.Priority.LOW
        lead.save()
        lead.refresh_from_db()
        self.assertEqual(lead.priority, Lead.Priority.LOW)

    def test_later_saves_never_re_raise_priority(self):
        # The regression that matters: staff demote a lead, then any
        # unrelated edit must not silently promote it back to Urgent.
        lead = _enquiry(priority=Lead.Priority.URGENT)
        lead.priority = Lead.Priority.NORMAL
        lead.save()
        lead.status = Lead.Status.CONTACTED
        lead.save()
        lead.refresh_from_db()
        self.assertEqual(lead.priority, Lead.Priority.NORMAL)


class PriorityOrderingTests(TestCase):
    def test_urgent_sorts_above_newer_normal_leads(self):
        _enquiry(phone='9876500001', priority=Lead.Priority.URGENT)  # urgent, oldest
        _enquiry(phone='9876500002')                        # normal, newer
        _enquiry(phone='9876500003')                        # normal, newest
        order = [lead.priority for lead in Lead.objects.all()]
        self.assertEqual(order, sorted(order), 'leads must come back most-urgent-first')
        self.assertEqual(Lead.objects.first().priority, Lead.Priority.URGENT)

    def test_within_the_same_priority_newest_comes_first(self):
        older = _enquiry(phone='9876500004')
        newer = _enquiry(phone='9876500005')
        same = list(Lead.objects.filter(priority=Lead.Priority.NORMAL))
        self.assertEqual([lead.pk for lead in same], [newer.pk, older.pk])


class OverdueTests(TestCase):
    def test_untouched_urgent_lead_becomes_overdue_after_an_hour(self):
        lead = _enquiry(priority=Lead.Priority.URGENT)
        self.assertFalse(lead.is_overdue, 'just-arrived lead is not overdue')

        Lead.objects.filter(pk=lead.pk).update(
            created_at=lead.created_at - timedelta(hours=2)
        )
        lead.refresh_from_db()
        self.assertTrue(lead.is_overdue)

    def test_a_handled_lead_is_never_overdue(self):
        lead = _enquiry(priority=Lead.Priority.URGENT, status=Lead.Status.CONTACTED)
        Lead.objects.filter(pk=lead.pk).update(
            created_at=lead.created_at - timedelta(hours=5)
        )
        lead.refresh_from_db()
        self.assertFalse(lead.is_overdue)

    def test_low_priority_leads_do_not_shout(self):
        lead = _enquiry(priority=Lead.Priority.LOW)
        Lead.objects.filter(pk=lead.pk).update(
            created_at=lead.created_at - timedelta(hours=5)
        )
        lead.refresh_from_db()
        self.assertFalse(lead.is_overdue)


@PLAIN_STATIC
class PriorityAdminActionTests(TestCase):
    """The raise/lower bulk actions must clamp, not wrap — stepping past
    Urgent should stay Urgent rather than rolling round to Low."""

    def setUp(self):
        self.client = APIClient()
        staff = User.objects.create_superuser('boss', 'b@example.com', 'pw12345')
        self.client.force_authenticate(user=staff)
        self.staff = staff

    def _run(self, action, pks):
        self.client.force_login(self.staff)
        return self.client.post(
            reverse('admin:content_enquiry_changelist'),
            {'action': action, '_selected_action': [str(pk) for pk in pks]},
            follow=True,
        )

    def test_raise_clamps_at_urgent(self):
        lead = _enquiry(priority=Lead.Priority.URGENT)
        self._run('raise_priority', [lead.pk])
        lead.refresh_from_db()
        self.assertEqual(lead.priority, Lead.Priority.URGENT)

    def test_lower_clamps_at_low(self):
        lead = _enquiry(priority=Lead.Priority.LOW)
        self._run('lower_priority', [lead.pk])
        lead.refresh_from_db()
        self.assertEqual(lead.priority, Lead.Priority.LOW)

    def test_raise_moves_one_step(self):
        lead = _enquiry(priority=Lead.Priority.NORMAL)
        self._run('raise_priority', [lead.pk])
        lead.refresh_from_db()
        self.assertEqual(lead.priority, Lead.Priority.HIGH)


@PLAIN_STATIC
class EnquiryResolvedTests(TestCase):
    """Resolved enquiries default out of the admin list without ever being deleted, and staff
    can flip is_resolved individually or in bulk. See EnquiryAdmin.get_queryset."""

    def setUp(self):
        self.client = APIClient()
        staff = User.objects.create_superuser('boss', 'b@example.com', 'pw12345')
        self.client.force_authenticate(user=staff)
        self.staff = staff

    def _run(self, action, pks, query=''):
        # Mirrors the real admin form: it has no action= attribute, so it POSTs back to the
        # current URL including whatever filter querystring is active — matters for
        # test_mark_unresolved_bulk_action below, which needs the Resolved filter active to
        # select a resolved row in the first place.
        self.client.force_login(self.staff)
        url = reverse('admin:content_enquiry_changelist')
        if query:
            url += f'?{query}'
        return self.client.post(
            url,
            {'action': action, '_selected_action': [str(pk) for pk in pks]},
            follow=True,
        )

    def test_new_enquiry_defaults_to_unresolved(self):
        lead = _enquiry()
        self.assertFalse(lead.is_resolved)

    def test_default_changelist_hides_resolved(self):
        self.client.force_login(self.staff)
        unresolved = _enquiry(name='Still open')
        _enquiry(name='Already handled', is_resolved=True)

        response = self.client.get(reverse('admin:content_enquiry_changelist'))

        self.assertContains(response, 'Still open')
        self.assertNotContains(response, 'Already handled')
        self.assertEqual(list(response.context['cl'].queryset), [unresolved])

    def test_is_resolved_filter_reveals_resolved_rows(self):
        self.client.force_login(self.staff)
        _enquiry(name='Still open')
        _enquiry(name='Already handled', is_resolved=True)

        response = self.client.get(reverse('admin:content_enquiry_changelist'), {'is_resolved__exact': '1'})

        self.assertContains(response, 'Already handled')
        self.assertNotContains(response, 'Still open')

    def test_mark_resolved_bulk_action(self):
        lead = _enquiry()
        self._run('mark_resolved', [lead.pk])
        lead.refresh_from_db()
        self.assertTrue(lead.is_resolved)

    def test_mark_unresolved_bulk_action(self):
        # Needs the "Resolved" filter active, same as a real staff member would have it, since
        # a resolved row isn't in the default (unresolved-only) queryset the action selects from.
        lead = _enquiry(is_resolved=True)
        self._run('mark_unresolved', [lead.pk], query='is_resolved__exact=1')
        lead.refresh_from_db()
        self.assertFalse(lead.is_resolved)

    def test_bulk_resolve_does_not_touch_other_enquiries(self):
        target = _enquiry(name='Resolve me')
        other = _enquiry(name='Leave me alone')
        self._run('mark_resolved', [target.pk])
        target.refresh_from_db()
        other.refresh_from_db()
        self.assertTrue(target.is_resolved)
        self.assertFalse(other.is_resolved)


class LeadSubmissionStillWorksTests(TestCase):
    """Priority must not disturb the existing public create endpoints."""

    def setUp(self):
        from django.core.cache import cache
        cache.clear()  # DRF's per-IP lead throttle uses the cache, which isn't rolled back like the DB
        self.client = APIClient()
        _make_usd()

    def test_enquiry_submission_unaffected(self):
        res = self.client.post(reverse('enquiry-create'), {
            'name': 'Deborah Beck', 'phone': '9876543210', 'email': 'd@example.com', 'message': 'Need USD',
            'from_currency': 'USD', 'amount': '500',
        })
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(Enquiry.objects.get().priority, Lead.Priority.NORMAL)

    def test_priority_is_not_settable_from_the_public_api(self):
        # A customer must not be able to promote their own lead.
        res = self.client.post(reverse('enquiry-create'), {
            'name': 'Chancer', 'phone': '9876543211', 'email': 'c@example.com',
            'message': 'Need USD', 'from_currency': 'USD', 'amount': '500', 'priority': 1,
        })
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(Enquiry.objects.get().priority, Lead.Priority.NORMAL)

    def test_non_transfer_service_requires_currency_and_amount(self):
        res = self.client.post(reverse('quote-create'), {
            'name': 'Deborah Beck', 'phone': '9876543210', 'email': 'd@example.com',
            'service': 'Foreign Currency Exchange',
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn('from_currency', res.data)

    def test_money_transfer_requires_currency_and_amount(self):
        res = self.client.post(reverse('quote-create'), {
            'name': 'Deborah Beck', 'phone': '9876543210', 'email': 'd@example.com',
            'service': 'Money Transfer', 'recipient_name': 'John Doe', 'relationship': 'Brother',
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn('from_currency', res.data)
        self.assertIn('amount', res.data)

    def test_money_transfer_requires_receiver_and_relationship(self):
        res = self.client.post(reverse('quote-create'), {
            'name': 'Deborah Beck', 'phone': '9876543210', 'email': 'd@example.com',
            'service': 'Money Transfer', 'from_currency': 'USD', 'amount': '500',
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn('recipient_name', res.data)
        self.assertIn('relationship', res.data)

    def test_money_transfer_submission_succeeds_with_all_fields(self):
        res = self.client.post(reverse('quote-create'), {
            'name': 'Deborah Beck', 'phone': '9876543210', 'email': 'd@example.com',
            'service': 'Money Transfer', 'recipient_name': 'John Doe', 'relationship': 'Brother',
            'from_currency': 'USD', 'amount': '500',
        })
        self.assertEqual(res.status_code, 201, res.data)
        lead = QuoteRequest.objects.get()
        self.assertEqual(lead.recipient_name, 'John Doe')
        self.assertEqual(lead.relationship, 'Brother')
        self.assertEqual(lead.from_currency, 'USD')


class CallbackRequestTests(TestCase):
    """The homepage converter's quick "get your best price" capture — name
    and phone are the only things a customer must provide."""

    def setUp(self):
        self.client = APIClient()
        _make_usd()

    def test_name_and_phone_alone_is_enough(self):
        res = self.client.post(reverse('callback-create'), {
            'name': 'Deborah Beck', 'phone': '9876543210',
        })
        self.assertEqual(res.status_code, 201, res.data)
        lead = CallbackRequest.objects.get()
        self.assertEqual(lead.phone, '9876543210')
        self.assertEqual(lead.email, '')
        self.assertEqual(lead.kind, Lead.Kind.CALLBACK)

    def test_amount_and_currency_are_carried_along_when_present(self):
        res = self.client.post(reverse('callback-create'), {
            'name': 'Deborah Beck', 'phone': '9876543210',
            'from_currency': 'USD', 'to_currency': 'INR', 'amount': '500',
        })
        self.assertEqual(res.status_code, 201, res.data)
        lead = CallbackRequest.objects.get()
        self.assertEqual(lead.from_currency, 'USD')
        self.assertEqual(str(lead.amount), '500.00')

    def test_missing_phone_is_rejected(self):
        res = self.client.post(reverse('callback-create'), {'name': 'Deborah Beck'})
        self.assertEqual(res.status_code, 400)
        self.assertFalse(CallbackRequest.objects.exists())

    def test_invalid_phone_is_rejected(self):
        res = self.client.post(reverse('callback-create'), {'name': 'Deborah Beck', 'phone': '12345'})
        self.assertEqual(res.status_code, 400)
        self.assertFalse(CallbackRequest.objects.exists())

    def test_arrives_at_normal_priority(self):
        self.client.post(reverse('callback-create'), {'name': 'Deborah Beck', 'phone': '9876543210'})
        self.assertEqual(CallbackRequest.objects.get().priority, Lead.Priority.NORMAL)

    def test_does_not_appear_in_other_lead_lists(self):
        self.client.post(reverse('callback-create'), {'name': 'Deborah Beck', 'phone': '9876543210'})
        self.assertFalse(Enquiry.objects.exists())
        self.assertFalse(QuoteRequest.objects.exists())


class LandlineValidatorTests(TestCase):
    def test_accepts_a_real_looking_landline(self):
        validate_landline('044-24353596')  # must not raise

    def test_rejects_letters(self):
        with self.assertRaises(Exception):
            validate_landline('044-ABCDE')

    def test_rejects_too_short(self):
        with self.assertRaises(Exception):
            validate_landline('123')

    def test_tel_strips_dashes_and_leading_trunk_zero(self):
        self.assertEqual(landline_tel('044-24353596'), '+914424353596')

    def test_tel_is_none_for_blank(self):
        self.assertIsNone(landline_tel(''))


class SiteSettingContactInfoTests(TestCase):
    """Company contact info (address/phones/socials) — shared by the header,
    footer, Contact page and WhatsApp messages. See CompanyInfoContext.jsx on
    the frontend for how a blank/unreachable API falls back to company.js."""

    def test_defaults_match_the_real_published_numbers(self):
        # These defaults exist so a fresh install shows the real business
        # facts already published on the live site, not a placeholder —
        # same "never invent a fact" discipline as CLAUDE.md's content rule.
        setting = SiteSetting.load()
        self.assertEqual(setting.mobiles[0]['display'], '+91 99414 56261')
        self.assertEqual(setting.contact_email, 'reddyforex@gmail.com')

    def test_mobiles_drops_blank_optional_numbers(self):
        setting = SiteSetting.load()
        setting.mobile_2 = ''
        setting.mobile_3 = ''
        setting.save()
        self.assertEqual(len(setting.mobiles), 1)
        self.assertEqual(setting.mobiles[0]['tel'], '+919941456261')

    def test_mobile_is_normalized_on_save(self):
        setting = SiteSetting.load()
        setting.mobile_1 = '+91 99414-56261'
        setting.save()
        setting.refresh_from_db()
        self.assertEqual(setting.mobile_1, '9941456261')

    def test_landlines_drops_blank_optional_numbers(self):
        setting = SiteSetting.load()
        setting.landline_2 = ''
        setting.save()
        self.assertEqual(len(setting.landlines), 1)

    def test_address_lines_splits_on_newline_and_drops_blanks(self):
        setting = SiteSetting.load()
        setting.address = 'Line one,\n\nLine two,\n  '
        setting.save()
        self.assertEqual(setting.address_lines, ['Line one,', 'Line two,'])

    def test_address_one_line_does_not_double_commas(self):
        setting = SiteSetting.load()
        setting.address = 'Shop No 1,\nMain Road,'
        setting.address_note = '(Landmark)'
        setting.save()
        self.assertEqual(setting.address_one_line, 'Shop No 1, Main Road (Landmark)')

    def test_socials_drops_platforms_left_blank(self):
        setting = SiteSetting.load()
        setting.x_url = ''
        setting.save()
        icons = [s['icon'] for s in setting.socials]
        self.assertEqual(icons, ['facebook', 'youtube'])

    def test_public_api_exposes_contact_and_socials(self):
        client = APIClient()
        res = client.get(reverse('site-settings'))
        self.assertEqual(res.status_code, 200)
        self.assertIn('contact', res.data)
        self.assertIn('socials', res.data)
        self.assertEqual(res.data['contact']['email'], 'reddyforex@gmail.com')
        self.assertEqual(len(res.data['contact']['mobiles']), 3)

    def test_public_api_is_read_only(self):
        client = APIClient()
        res = client.post(reverse('site-settings'), {'contact_email': 'hacked@example.com'})
        self.assertEqual(res.status_code, 405)


def _generated_image(size=(120, 80), fmt='JPEG', name='photo.jpg'):
    """An in-memory image Pillow will happily open — no fixture file needed."""
    buf = io.BytesIO()
    Image.new('RGB', size, color=(200, 40, 10)).save(buf, format=fmt)
    buf.seek(0)
    content_type = 'image/jpeg' if fmt == 'JPEG' else f'image/{fmt.lower()}'
    return SimpleUploadedFile(name, buf.read(), content_type=content_type)


# SiteImage writes real files (ImageField + the resize-on-save Pillow step),
# so every test in this section gets its own throwaway MEDIA_ROOT — never
# touch the developer's real backend/media/ folder, and nothing to clean up
# by hand afterwards.
_TEST_MEDIA_ROOT = tempfile.mkdtemp(prefix='reddyfox-test-media-')


@override_settings(MEDIA_ROOT=_TEST_MEDIA_ROOT)
class SiteImageValidatorTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(_TEST_MEDIA_ROOT, ignore_errors=True)

    def test_accepts_a_real_jpeg(self):
        validate_image_upload(_generated_image())  # must not raise

    def test_rejects_a_file_that_is_not_actually_an_image(self):
        fake = SimpleUploadedFile('not-a-photo.jpg', b'this is definitely not image bytes', content_type='image/jpeg')
        with self.assertRaises(ValidationError):
            validate_image_upload(fake)

    def test_rejects_oversized_upload(self):
        oversized = _generated_image()
        oversized.size = 9 * 1024 * 1024  # pretend it's 9MB without generating one
        with self.assertRaises(ValidationError):
            validate_image_upload(oversized)

    def test_rejects_unsupported_format(self):
        with self.assertRaises(ValidationError):
            validate_image_upload(_generated_image(fmt='BMP', name='photo.bmp'))


@override_settings(MEDIA_ROOT=_TEST_MEDIA_ROOT)
class SiteImageModelTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(_TEST_MEDIA_ROOT, ignore_errors=True)

    def test_slot_is_unique(self):
        SiteImage.objects.create(slot=SiteImage.Slot.HOME_WHY_US, image=_generated_image())
        with self.assertRaises(Exception):
            SiteImage.objects.create(slot=SiteImage.Slot.HOME_WHY_US, image=_generated_image())

    def test_oversized_image_is_downscaled_on_save(self):
        big = _generated_image(size=(2400, 1200))
        obj = SiteImage.objects.create(slot=SiteImage.Slot.ABOUT_COUNTER, image=big)
        with Image.open(obj.image.path) as saved:
            self.assertLessEqual(max(saved.size), 1600)
            self.assertEqual(saved.size[0] / saved.size[1], 2)  # aspect ratio preserved

    def test_small_image_is_left_alone(self):
        small = _generated_image(size=(120, 80))
        obj = SiteImage.objects.create(slot=SiteImage.Slot.ABOUT_TEAM, image=small)
        with Image.open(obj.image.path) as saved:
            self.assertEqual(saved.size, (120, 80))

    def test_resolved_alt_text_falls_back_to_slot_label(self):
        obj = SiteImage.objects.create(slot=SiteImage.Slot.HOME_WHY_US, image=_generated_image(), alt_text='')
        self.assertEqual(obj.resolved_alt_text, obj.get_slot_display())

    def test_toggling_visibility_does_not_touch_the_file(self):
        obj = SiteImage.objects.create(slot=SiteImage.Slot.HOME_WHY_US, image=_generated_image())
        original_path = obj.image.path
        obj.is_visible = False
        obj.save(update_fields=['is_visible', 'updated_at'])
        obj.refresh_from_db()
        self.assertEqual(obj.image.path, original_path)


@override_settings(MEDIA_ROOT=_TEST_MEDIA_ROOT)
class SiteImageApiTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(_TEST_MEDIA_ROOT, ignore_errors=True)

    def setUp(self):
        self.client = APIClient()

    def test_visible_image_is_served_with_absolute_url_and_alt_text(self):
        SiteImage.objects.create(
            slot=SiteImage.Slot.HOME_WHY_US, image=_generated_image(), alt_text='Counter at the T. Nagar shop',
        )
        res = self.client.get(reverse('site-image-list'))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        row = res.data[0]
        self.assertEqual(row['slot'], 'home_why_us')
        self.assertEqual(row['alt_text'], 'Counter at the T. Nagar shop')
        self.assertTrue(row['url'].startswith('http'))

    def test_hidden_image_is_not_served(self):
        SiteImage.objects.create(slot=SiteImage.Slot.HOME_WHY_US, image=_generated_image(), is_visible=False)
        res = self.client.get(reverse('site-image-list'))
        self.assertEqual(res.data, [])

    def test_no_write_endpoint_exists(self):
        # Read-only, like every other public content endpoint — uploads only
        # ever happen through the authenticated Django admin.
        res = self.client.post(reverse('site-image-list'), {'slot': 'home_why_us'})
        self.assertEqual(res.status_code, 405)


@PLAIN_STATIC
class SiteSettingAdminTests(TestCase):
    def setUp(self):
        self.staff = User.objects.create_superuser('admin', 'admin@example.com', 'password')
        self.client = APIClient()
        self.client.force_login(self.staff)

    def test_change_form_renders_with_new_contact_fields(self):
        setting = SiteSetting.load()
        res = self.client.get(reverse('admin:content_sitesetting_change', args=[setting.pk]))
        self.assertEqual(res.status_code, 200)
        self.assertContains(res, 'id_mobile_1')
        self.assertContains(res, 'id_address')


@PLAIN_STATIC
@override_settings(MEDIA_ROOT=_TEST_MEDIA_ROOT)
class SiteImageAdminTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(_TEST_MEDIA_ROOT, ignore_errors=True)

    def setUp(self):
        self.staff = User.objects.create_superuser('admin', 'admin@example.com', 'password')
        self.client = APIClient()
        self.client.force_login(self.staff)

    def test_changelist_renders(self):
        SiteImage.objects.create(slot=SiteImage.Slot.HOME_WHY_US, image=_generated_image())
        res = self.client.get(reverse('admin:content_siteimage_changelist'))
        self.assertEqual(res.status_code, 200)

    def test_add_form_renders(self):
        res = self.client.get(reverse('admin:content_siteimage_add'))
        self.assertEqual(res.status_code, 200)


@override_settings(MEDIA_ROOT=_TEST_MEDIA_ROOT)
class SeedSiteImagesTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(_TEST_MEDIA_ROOT, ignore_errors=True)

    def test_creates_one_row_per_slot(self):
        call_command('seed_site_images', stdout=io.StringIO())
        self.assertEqual(SiteImage.objects.count(), len(SiteImage.Slot.choices))
        for slot, _label in SiteImage.Slot.choices:
            self.assertTrue(SiteImage.objects.filter(slot=slot).exists())

    def test_generated_images_are_real_decodable_images(self):
        call_command('seed_site_images', stdout=io.StringIO())
        for obj in SiteImage.objects.all():
            with Image.open(obj.image.path) as img:
                img.verify()

    def test_never_overwrites_an_existing_slot(self):
        # A staff-uploaded photo already sits in this slot — re-running the
        # seed command (e.g. on every deploy) must leave it untouched.
        real_upload = SiteImage.objects.create(
            slot=SiteImage.Slot.HOME_WHY_US, image=_generated_image(), alt_text='The real shop',
        )
        original_name = real_upload.image.name

        call_command('seed_site_images', stdout=io.StringIO())

        real_upload.refresh_from_db()
        self.assertEqual(real_upload.image.name, original_name)
        self.assertEqual(real_upload.alt_text, 'The real shop')
        # Every other slot should still have been seeded.
        self.assertEqual(SiteImage.objects.count(), len(SiteImage.Slot.choices))

    def test_is_idempotent(self):
        call_command('seed_site_images', stdout=io.StringIO())
        call_command('seed_site_images', stdout=io.StringIO())  # must not error or duplicate
        self.assertEqual(SiteImage.objects.count(), len(SiteImage.Slot.choices))


class DebugModeHostAndCorsTests(TestCase):
    """Local dev runs with DEBUG=True (settings.py's default) — reached from addresses that
    change with every network switch (this machine, its LAN IP, a phone on the same WiFi) — so
    settings.py's DEBUG-conditional block sets ALLOWED_HOSTS/CORS_ALLOW_ALL_ORIGINS wide open
    rather than needing an .env edit per network.

    Note: Django's test runner always forces settings.DEBUG back to False once tests start
    (django.test.utils.setup_test_environment) — that's normal and doesn't affect these
    settings, since ALLOWED_HOSTS/CORS_ALLOW_ALL_ORIGINS were already computed from the real
    DEBUG=True (see .env.example) at settings-module import time, before that override runs.
    So these assert the derived values directly rather than re-checking settings.DEBUG."""

    def test_debug_mode_allows_any_host(self):
        # Django's test runner appends 'testserver' to ALLOWED_HOSTS itself
        # (for the test client's default SERVER_NAME) — assert '*' is present
        # rather than an exact list match.
        from django.conf import settings
        self.assertIn('*', settings.ALLOWED_HOSTS)

    def test_debug_mode_allows_any_cors_origin(self):
        from django.conf import settings
        self.assertTrue(settings.CORS_ALLOW_ALL_ORIGINS)

    def test_arbitrary_host_header_is_not_rejected(self):
        # A phone reaching the backend via a LAN IP sends exactly this kind of
        # non-localhost Host header — must not 400 with DisallowedHost.
        client = APIClient()
        res = client.get(reverse('site-settings'), SERVER_NAME='192.168.1.42')
        self.assertEqual(res.status_code, 200)
