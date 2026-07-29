from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from content.models import Enquiry, QuoteRequest
from .models import TeamAlert, TeamAlertDelivery, TeamPushSubscriber
from .services import notify_new_enquiry, send_team_alert


def _make_staff_user(**kwargs):
    defaults = dict(username='staffer', is_staff=True)
    defaults.update(kwargs)
    user = User.objects.create(**defaults)
    user.set_password('pw')
    user.save()
    return user


def _make_subscriber(user, **kwargs):
    defaults = dict(fcm_token='tok-' + str(id(kwargs)) + 'x' * 20)
    defaults.update(kwargs)
    return TeamPushSubscriber.objects.create(user=user, **defaults)


def _make_enquiry(**kwargs):
    defaults = dict(name='Deborah Beck', phone='9876543210', email='d@example.com', service='Currency exchange')
    defaults.update(kwargs)
    return Enquiry.objects.create(**defaults)


class SendTeamAlertTests(TestCase):
    """FCM isn't configured in tests, so every send exercises the graceful
    failure path — the same path production hits if the credential is ever
    missing or wrong. What's really under test is the accounting
    (target/success/fail/skipped) and the per-subscriber delivery rows."""

    def setUp(self):
        self.user = _make_staff_user()

    def test_urgent_bypasses_rate_limit(self):
        subscriber = _make_subscriber(self.user, last_notified_at=timezone.now())
        alert = TeamAlert.objects.create(title='x', body='y', priority=TeamAlert.Priority.URGENT)

        send_team_alert(alert)

        alert.refresh_from_db()
        self.assertEqual(alert.target_count, 1)
        self.assertEqual(alert.skipped_count, 0)
        delivery = TeamAlertDelivery.objects.get(alert=alert, subscriber=subscriber)
        self.assertEqual(delivery.status, TeamAlertDelivery.Status.FAILED)  # no FCM configured
        self.assertIn('not configured', delivery.error_message)

    def test_normal_priority_skips_recently_notified_subscriber(self):
        recently = _make_subscriber(self.user, fcm_token='a' * 25, last_notified_at=timezone.now())
        other = _make_staff_user(username='staffer2')
        stale = _make_subscriber(other, fcm_token='b' * 25, last_notified_at=timezone.now() - timezone.timedelta(hours=2))
        alert = TeamAlert.objects.create(title='x', body='y', priority=TeamAlert.Priority.NORMAL)

        send_team_alert(alert)

        alert.refresh_from_db()
        self.assertEqual(alert.target_count, 1)
        self.assertEqual(alert.skipped_count, 1)
        self.assertEqual(
            TeamAlertDelivery.objects.get(subscriber=recently).status,
            TeamAlertDelivery.Status.SKIPPED,
        )
        self.assertEqual(
            TeamAlertDelivery.objects.get(subscriber=stale).status,
            TeamAlertDelivery.Status.FAILED,  # attempted, but FCM unconfigured
        )

    def test_inactive_subscribers_are_never_targeted(self):
        _make_subscriber(self.user, fcm_token='c' * 25, is_active=False)
        alert = TeamAlert.objects.create(title='x', body='y', priority=TeamAlert.Priority.URGENT)

        send_team_alert(alert)

        alert.refresh_from_db()
        self.assertEqual(alert.target_count, 0)
        self.assertEqual(alert.status, TeamAlert.Status.FAILED)
        self.assertEqual(TeamAlertDelivery.objects.count(), 0)

    def test_priority_ordering_puts_urgent_first(self):
        TeamAlert.objects.create(title='Normal one', body='x', priority=TeamAlert.Priority.NORMAL)
        TeamAlert.objects.create(title='Urgent one', body='x', priority=TeamAlert.Priority.URGENT)

        self.assertEqual(TeamAlert.objects.first().priority, TeamAlert.Priority.URGENT)


class NotifyNewEnquiryTests(TestCase):
    def test_creates_urgent_alert_linked_to_the_enquiry(self):
        # Creating the enquiry already fires the signal once (see
        # EnquirySignalTests below) — call the service directly to test it
        # in isolation, independent of that side effect.
        enquiry = _make_enquiry()
        TeamAlert.objects.all().delete()

        notify_new_enquiry(enquiry)

        alert = TeamAlert.objects.get(lead=enquiry)
        self.assertEqual(alert.priority, TeamAlert.Priority.URGENT)
        self.assertIn(enquiry.name, alert.title)


class EnquirySignalTests(TestCase):
    """A brand-new enquiry must always raise a push alert automatically —
    with no extra wiring — but other lead kinds and enquiry edits must not."""

    def test_new_enquiry_creates_alert(self):
        self.assertEqual(TeamAlert.objects.count(), 0)
        _make_enquiry()
        self.assertEqual(TeamAlert.objects.count(), 1)

    def test_editing_an_existing_enquiry_does_not_notify_again(self):
        enquiry = _make_enquiry()
        self.assertEqual(TeamAlert.objects.count(), 1)

        enquiry.status = Enquiry.Status.CONTACTED
        enquiry.save()

        self.assertEqual(TeamAlert.objects.count(), 1)

    def test_quote_request_does_not_notify(self):
        QuoteRequest.objects.create(name='X', phone='9876543210', email='x@example.com')
        self.assertEqual(TeamAlert.objects.count(), 0)


class TeamSubscribeViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff = _make_staff_user()

    def test_anonymous_is_rejected(self):
        res = self.client.post(reverse('team-alerts-subscribe'), {'fcm_token': 'x' * 40})
        self.assertIn(res.status_code, (401, 403))

    def test_non_staff_is_rejected(self):
        non_staff = User.objects.create(username='customer', is_staff=False)
        self.client.force_authenticate(user=non_staff)
        res = self.client.post(reverse('team-alerts-subscribe'), {'fcm_token': 'x' * 40})
        self.assertEqual(res.status_code, 403)

    def test_staff_can_subscribe(self):
        self.client.force_authenticate(user=self.staff)
        res = self.client.post(reverse('team-alerts-subscribe'), {'fcm_token': 'x' * 40, 'user_agent': 'Chrome/1.0'})
        self.assertEqual(res.status_code, 201)
        subscriber = TeamPushSubscriber.objects.get(fcm_token='x' * 40)
        self.assertEqual(subscriber.user, self.staff)
        self.assertTrue(subscriber.is_active)

    def test_resubscribe_reactivates_existing_token(self):
        other = _make_staff_user(username='staffer2')
        TeamPushSubscriber.objects.create(user=other, fcm_token='y' * 40, is_active=False, failure_count=5)

        self.client.force_authenticate(user=self.staff)
        res = self.client.post(reverse('team-alerts-subscribe'), {'fcm_token': 'y' * 40})

        self.assertEqual(res.status_code, 201)
        subscriber = TeamPushSubscriber.objects.get(fcm_token='y' * 40)
        self.assertTrue(subscriber.is_active)
        self.assertEqual(subscriber.failure_count, 0)
        self.assertEqual(subscriber.user, self.staff)  # reassigned to whoever just (re)subscribed
        self.assertEqual(TeamPushSubscriber.objects.filter(fcm_token='y' * 40).count(), 1)

    def test_unsubscribe_only_affects_own_token(self):
        other = _make_staff_user(username='staffer2')
        TeamPushSubscriber.objects.create(user=other, fcm_token='z' * 40, is_active=True)

        self.client.force_authenticate(user=self.staff)
        self.client.post(reverse('team-alerts-unsubscribe'), {'fcm_token': 'z' * 40})

        # Not this staff member's token — must remain untouched.
        self.assertTrue(TeamPushSubscriber.objects.get(fcm_token='z' * 40).is_active)

    def test_unsubscribe_own_token(self):
        TeamPushSubscriber.objects.create(user=self.staff, fcm_token='w' * 40, is_active=True)
        self.client.force_authenticate(user=self.staff)
        res = self.client.post(reverse('team-alerts-unsubscribe'), {'fcm_token': 'w' * 40})
        self.assertEqual(res.status_code, 200)
        self.assertFalse(TeamPushSubscriber.objects.get(fcm_token='w' * 40).is_active)


class EnableAlertsPageTests(TestCase):
    def test_anonymous_is_redirected_to_login(self):
        res = self.client.get(reverse('team-alerts-enable'))
        self.assertEqual(res.status_code, 302)

    def test_staff_can_view_the_page(self):
        staff = _make_staff_user()
        self.client.force_login(staff)
        res = self.client.get(reverse('team-alerts-enable'))
        self.assertEqual(res.status_code, 200)


class ServiceWorkerViewTests(TestCase):
    def test_served_as_javascript_even_with_no_firebase_config(self):
        res = self.client.get(reverse('team-alerts-sw'))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res['Content-Type'], 'application/javascript')
