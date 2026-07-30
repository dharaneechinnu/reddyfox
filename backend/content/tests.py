from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from rates.models import Currency
from .models import Enquiry, QuoteRequest, RateLock


def _make_usd():
    return Currency.objects.get_or_create(
        code='USD', defaults=dict(name='US Dollar', country_code='US', buy_rate='83.0', sell_rate='84.0'),
    )[0]


def _make_enquiry(**kwargs):
    defaults = dict(name='Deborah Beck', phone='9876543210', email='d@example.com', message='Need USD please')
    defaults.update(kwargs)
    return Enquiry.objects.create(**defaults)


class LeadReferenceTests(TestCase):
    def test_reference_is_generated_on_creation(self):
        lead = _make_enquiry()
        self.assertIsNotNone(lead.reference)
        self.assertEqual(len(lead.reference), 8)

    def test_reference_display_is_formatted_with_a_dash(self):
        lead = _make_enquiry()
        self.assertEqual(lead.reference_display, f'{lead.reference[:4]}-{lead.reference[4:]}')

    def test_reference_is_stable_across_saves(self):
        lead = _make_enquiry()
        original = lead.reference
        lead.status = Enquiry.Status.CONTACTED
        lead.save()
        lead.refresh_from_db()
        self.assertEqual(lead.reference, original)

    def test_references_are_unique(self):
        refs = {_make_enquiry(phone=f'98765{i:05d}').reference for i in range(20)}
        self.assertEqual(len(refs), 20)


class LeadCreateReturnsReferenceTests(TestCase):
    """The reference is the whole point of this feature — every create
    endpoint must hand one back so the customer can actually use /track."""

    def setUp(self):
        self.client = APIClient()

    def test_enquiry_response_includes_reference(self):
        res = self.client.post(reverse('enquiry-create'), {
            'name': 'Deborah Beck', 'phone': '9876543210', 'email': 'd@example.com', 'message': 'Need USD',
        })
        self.assertEqual(res.status_code, 201)
        self.assertRegex(res.data['reference'], r'^[A-Z0-9]{4}-[A-Z0-9]{4}$')

    def test_rate_lock_response_includes_reference_alongside_expiry(self):
        _make_usd()
        res = self.client.post(reverse('rate-lock-create'), {
            'name': 'Deborah Beck', 'phone': '9876543210', 'email': 'd@example.com',
            'from_currency': 'USD', 'to_currency': 'INR',
            'amount': '100', 'quoted_rate': '84.0000', 'converted_amount': '8400.00',
        })
        self.assertEqual(res.status_code, 201)
        self.assertIn('reference', res.data)
        self.assertIn('expires_at_display', res.data)


class TrackLeadViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.lead = _make_enquiry()

    def _track(self, phone, reference):
        return self.client.get(reverse('lead-track'), {'phone': phone, 'reference': reference})

    def test_correct_phone_and_reference_returns_status(self):
        res = self._track('9876543210', self.lead.reference_display)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['status'], 'new')
        self.assertEqual(res.data['kind'], 'enquiry')
        self.assertEqual(res.data['name'], 'Deborah Beck')

    def test_reference_without_dash_and_lowercase_also_works(self):
        res = self._track('9876543210', self.lead.reference.lower())
        self.assertEqual(res.status_code, 200)

    def test_wrong_phone_is_not_found(self):
        res = self._track('9111111111', self.lead.reference_display)
        self.assertEqual(res.status_code, 404)

    def test_wrong_reference_is_not_found(self):
        res = self._track('9876543210', 'ZZZZ-ZZZZ')
        self.assertEqual(res.status_code, 404)

    def test_missing_params_is_not_found_not_500(self):
        res = self.client.get(reverse('lead-track'))
        self.assertEqual(res.status_code, 404)

    def test_response_never_leaks_staff_only_fields(self):
        self.lead.internal_note = 'Difficult customer, handle with care'
        self.lead.assigned_to = None
        self.lead.save()
        res = self._track('9876543210', self.lead.reference_display)
        body = str(res.data)
        self.assertNotIn('internal_note', res.data)
        self.assertNotIn('assigned_to', res.data)
        self.assertNotIn('email', res.data)
        self.assertNotIn('source_ip', res.data)
        self.assertNotIn('Difficult customer', body)

    def test_spam_status_is_shown_as_closed_to_the_customer(self):
        self.lead.status = Enquiry.Status.SPAM
        self.lead.save()
        res = self._track('9876543210', self.lead.reference_display)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['status'], 'closed')
        self.assertEqual(res.data['status_display'], 'Closed')

    def test_quote_and_rate_lock_kinds_are_also_trackable(self):
        quote = QuoteRequest.objects.create(
            name='X', phone='9111111111', email='x@example.com',
            from_currency='USD', amount='500',
        )
        res = self._track('9111111111', quote.reference_display)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['kind'], 'quote')

        lock = RateLock.objects.create(
            name='Y', phone='9222222222', email='y@example.com',
            from_currency='USD', to_currency='INR', amount='100',
            quoted_rate='84.0000', converted_amount='8400.00',
        )
        res = self._track('9222222222', lock.reference_display)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['kind'], 'rate_lock')
        self.assertIn('expires_in', res.data)
