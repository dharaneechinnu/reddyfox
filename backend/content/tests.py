from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from rates.models import Currency
from .models import Enquiry, Lead, QuoteRequest, RateLock

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


def _rate_lock(**kw):
    d = dict(
        name='Deborah Beck', phone='9876543210', email='d@example.com',
        from_currency='USD', to_currency='INR',
        amount='500', quoted_rate='84.0000', converted_amount='42000.00',
    )
    d.update(kw)
    return RateLock.objects.create(**d)


class PriorityOnArrivalTests(TestCase):
    """A rate lock is the only lead type with a deadline, so it should reach
    the desk already flagged. Everything else arrives Normal."""

    def test_rate_lock_arrives_urgent(self):
        self.assertEqual(_rate_lock().priority, Lead.Priority.URGENT)

    def test_enquiry_arrives_normal(self):
        self.assertEqual(_enquiry().priority, Lead.Priority.NORMAL)

    def test_quote_request_arrives_normal(self):
        quote = QuoteRequest.objects.create(name='X', phone='9876543210', email='x@example.com')
        self.assertEqual(quote.priority, Lead.Priority.NORMAL)

    def test_explicit_priority_is_respected_on_creation(self):
        self.assertEqual(_enquiry(priority=Lead.Priority.HIGH).priority, Lead.Priority.HIGH)

    def test_staff_can_lower_a_rate_lock_and_it_sticks(self):
        lock = _rate_lock()
        lock.priority = Lead.Priority.LOW
        lock.save()
        lock.refresh_from_db()
        self.assertEqual(lock.priority, Lead.Priority.LOW)

    def test_later_saves_never_re_raise_priority(self):
        # The regression that matters: staff demote a lead, then any
        # unrelated edit must not silently promote it back to Urgent.
        lock = _rate_lock()
        lock.priority = Lead.Priority.NORMAL
        lock.save()
        lock.status = Lead.Status.CONTACTED
        lock.save()
        lock.refresh_from_db()
        self.assertEqual(lock.priority, Lead.Priority.NORMAL)


class PriorityOrderingTests(TestCase):
    def test_urgent_sorts_above_newer_normal_leads(self):
        _rate_lock(phone='9876500001')                      # urgent, oldest
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
        lock = _rate_lock()
        self.assertFalse(lock.is_overdue, 'just-arrived lead is not overdue')

        Lead.objects.filter(pk=lock.pk).update(
            created_at=lock.created_at - timedelta(hours=2)
        )
        lock.refresh_from_db()
        self.assertTrue(lock.is_overdue)

    def test_a_handled_lead_is_never_overdue(self):
        lock = _rate_lock(status=Lead.Status.CONTACTED)
        Lead.objects.filter(pk=lock.pk).update(
            created_at=lock.created_at - timedelta(hours=5)
        )
        lock.refresh_from_db()
        self.assertFalse(lock.is_overdue)

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


class LeadSubmissionStillWorksTests(TestCase):
    """Priority must not disturb the existing public create endpoints."""

    def setUp(self):
        self.client = APIClient()

    def test_enquiry_submission_unaffected(self):
        res = self.client.post(reverse('enquiry-create'), {
            'name': 'Deborah Beck', 'phone': '9876543210', 'email': 'd@example.com', 'message': 'Need USD',
        })
        self.assertEqual(res.status_code, 201)
        self.assertEqual(Enquiry.objects.get().priority, Lead.Priority.NORMAL)

    def test_rate_lock_submission_arrives_urgent(self):
        _make_usd()
        res = self.client.post(reverse('rate-lock-create'), {
            'name': 'Deborah Beck', 'phone': '9876543210', 'email': 'd@example.com',
            'from_currency': 'USD', 'to_currency': 'INR',
            'amount': '100', 'quoted_rate': '84.0000', 'converted_amount': '8400.00',
        })
        self.assertEqual(res.status_code, 201)
        self.assertEqual(RateLock.objects.get().priority, Lead.Priority.URGENT)

    def test_priority_is_not_settable_from_the_public_api(self):
        # A customer must not be able to promote their own lead.
        self.client.post(reverse('enquiry-create'), {
            'name': 'Chancer', 'phone': '9876543211', 'email': 'c@example.com',
            'message': 'Need USD', 'priority': 1,
        })
        self.assertEqual(Enquiry.objects.get().priority, Lead.Priority.NORMAL)
