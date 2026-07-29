from unittest.mock import patch

from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from rates.models import Currency
from .models import Notification, NotificationDelivery, PushSubscriber
from .services import notify_rate_change, send_notification


def _make_currency(**kwargs):
    defaults = dict(
        code='USD', name='US Dollar', country_code='US',
        buy_rate='83.0000', sell_rate='84.0000', is_visible=True,
    )
    defaults.update(kwargs)
    return Currency.objects.create(**defaults)


def _make_subscriber(**kwargs):
    defaults = dict(fcm_token='token-' + str(id(kwargs)) + 'x' * 20)
    defaults.update(kwargs)
    return PushSubscriber.objects.create(**defaults)


class SendNotificationTests(TestCase):
    """FCM isn't configured in tests (no FIREBASE_CREDENTIALS_JSON), so every
    send exercises the graceful-failure path — the same path production hits
    if the credential is ever missing or wrong. What we're really asserting is
    that the accounting (target/success/fail/skipped) and the per-subscriber
    NotificationDelivery rows are always correct."""

    def test_urgent_bypasses_rate_limit(self):
        subscriber = _make_subscriber(last_notified_at=timezone.now())
        notification = Notification.objects.create(title='USD', body='moved', priority=Notification.Priority.URGENT)

        send_notification(notification)

        notification.refresh_from_db()
        self.assertEqual(notification.target_count, 1)
        self.assertEqual(notification.skipped_count, 0)
        delivery = NotificationDelivery.objects.get(notification=notification, subscriber=subscriber)
        self.assertEqual(delivery.status, NotificationDelivery.Status.FAILED)  # no FCM configured
        self.assertIn('not configured', delivery.error_message)

    def test_normal_priority_skips_recently_notified_subscriber(self):
        recently = _make_subscriber(fcm_token='a' * 25, last_notified_at=timezone.now())
        stale = _make_subscriber(fcm_token='b' * 25, last_notified_at=timezone.now() - timezone.timedelta(hours=2))
        notification = Notification.objects.create(title='USD', body='moved', priority=Notification.Priority.NORMAL)

        send_notification(notification)

        notification.refresh_from_db()
        self.assertEqual(notification.target_count, 1)
        self.assertEqual(notification.skipped_count, 1)
        self.assertEqual(
            NotificationDelivery.objects.get(subscriber=recently).status,
            NotificationDelivery.Status.SKIPPED,
        )
        self.assertEqual(
            NotificationDelivery.objects.get(subscriber=stale).status,
            NotificationDelivery.Status.FAILED,  # attempted, but FCM unconfigured
        )

    def test_inactive_subscribers_are_never_targeted(self):
        _make_subscriber(fcm_token='c' * 25, is_active=False)
        notification = Notification.objects.create(title='USD', body='moved', priority=Notification.Priority.URGENT)

        send_notification(notification)

        notification.refresh_from_db()
        self.assertEqual(notification.target_count, 0)
        self.assertEqual(notification.status, Notification.Status.FAILED)
        self.assertEqual(NotificationDelivery.objects.count(), 0)

    def test_priority_ordering_puts_urgent_first(self):
        Notification.objects.create(title='Normal one', body='x', priority=Notification.Priority.NORMAL)
        Notification.objects.create(title='Urgent one', body='x', priority=Notification.Priority.URGENT)

        first = Notification.objects.first()
        self.assertEqual(first.priority, Notification.Priority.URGENT)


class NotifyRateChangeTests(TestCase):
    @override_settings(RATE_ALERT_URGENT_THRESHOLD_PCT=1.0)
    def test_big_move_is_urgent(self):
        currency = _make_currency(buy_rate='84.0000', sell_rate='85.0000')
        notify_rate_change(currency, previous_buy=83, previous_sell=84)
        notification = Notification.objects.get(currency=currency)
        self.assertEqual(notification.priority, Notification.Priority.URGENT)

    @override_settings(RATE_ALERT_URGENT_THRESHOLD_PCT=5.0)
    def test_small_move_is_normal(self):
        currency = _make_currency(buy_rate='83.0500', sell_rate='84.0500')
        notify_rate_change(currency, previous_buy=83, previous_sell=84)
        notification = Notification.objects.get(currency=currency)
        self.assertEqual(notification.priority, Notification.Priority.NORMAL)


class CurrencySignalTests(TestCase):
    """Editing a currency's rate in admin (list_editable buy/sell rate) must
    raise an alert automatically, with no extra wiring required."""

    def test_rate_change_creates_notification(self):
        currency = _make_currency()
        self.assertEqual(Notification.objects.count(), 0)

        currency.buy_rate = '83.5000'
        currency.save()

        self.assertEqual(Notification.objects.filter(currency=currency).count(), 1)

    def test_unchanged_save_creates_no_notification(self):
        currency = _make_currency()
        currency.name = 'US Dollar (renamed)'
        currency.save()
        self.assertEqual(Notification.objects.count(), 0)

    def test_hidden_currency_does_not_notify(self):
        currency = _make_currency(is_visible=False, code='HID')
        currency.buy_rate = '83.5000'
        currency.save()
        self.assertEqual(Notification.objects.count(), 0)


class SubscribeViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_subscribe_creates_subscriber(self):
        res = self.client.post(reverse('notification-subscribe'), {'fcm_token': 'x' * 40, 'user_agent': 'Chrome/1.0'})
        self.assertEqual(res.status_code, 201)
        self.assertTrue(PushSubscriber.objects.filter(fcm_token='x' * 40, is_active=True).exists())

    def test_resubscribe_reactivates_existing_token(self):
        PushSubscriber.objects.create(fcm_token='y' * 40, is_active=False, failure_count=5)
        res = self.client.post(reverse('notification-subscribe'), {'fcm_token': 'y' * 40})
        self.assertEqual(res.status_code, 201)
        subscriber = PushSubscriber.objects.get(fcm_token='y' * 40)
        self.assertTrue(subscriber.is_active)
        self.assertEqual(subscriber.failure_count, 0)
        self.assertEqual(PushSubscriber.objects.filter(fcm_token='y' * 40).count(), 1)

    def test_short_token_rejected(self):
        res = self.client.post(reverse('notification-subscribe'), {'fcm_token': 'short'})
        self.assertEqual(res.status_code, 400)

    def test_unsubscribe_deactivates(self):
        PushSubscriber.objects.create(fcm_token='z' * 40, is_active=True)
        res = self.client.post(reverse('notification-unsubscribe'), {'fcm_token': 'z' * 40})
        self.assertEqual(res.status_code, 200)
        self.assertFalse(PushSubscriber.objects.get(fcm_token='z' * 40).is_active)
