import json
from unittest.mock import patch

from django.test import TestCase, override_settings

from content.models import CallbackRequest, Enquiry, QuoteRequest

from .models import TelegramDelivery, TelegramSubscriber
from .services import format_message, notify_team_telegram


def _callback(**kw):
    d = dict(name='Deborah Beck', phone='9876543210', from_currency='USD', to_currency='INR', amount='500')
    d.update(kw)
    return CallbackRequest.objects.create(**d)


def _enquiry(**kw):
    d = dict(name='Deborah Beck', phone='9876543210', email='d@example.com', message='Need USD')
    d.update(kw)
    return Enquiry.objects.create(**d)


def _quote(**kw):
    d = dict(
        name='Deborah Beck', phone='9876543210', email='d@example.com',
        from_currency='USD', to_currency='INR', amount='500',
        service='Foreign Exchange', needed_by='2026-08-15',
    )
    d.update(kw)
    return QuoteRequest.objects.create(**d)


def _subscriber(**kw):
    d = dict(name='Ravi', chat_id='111111')
    d.update(kw)
    return TelegramSubscriber.objects.create(**d)


class FormatMessageTests(TestCase):
    def test_includes_currency_pair_when_present(self):
        lead = _callback(from_currency='USD', to_currency='INR', amount='500')
        text = format_message(lead)
        self.assertIn('USD', text)
        self.assertIn('INR', text)
        self.assertIn('500.00', text)
        self.assertIn('Deborah Beck', text)
        self.assertIn('9876543210', text)

    def test_omits_currency_line_when_not_converting(self):
        lead = _callback(from_currency='', to_currency='', amount=None)
        text = format_message(lead)
        self.assertNotIn('Converting', text)

    def test_quote_request_includes_service_and_needed_by(self):
        lead = _quote(service='Money Transfer', needed_by='2026-09-01')
        text = format_message(lead)
        self.assertIn('Service  : Money Transfer', text)
        self.assertIn('Needed by: 2026-09-01', text)
        # Still gets the generic currency/amount line too, not replaced by the quote-specific one.
        self.assertIn('Converting', text)

    def test_quote_request_with_blank_service_and_needed_by_shows_placeholder(self):
        lead = _quote(service='', needed_by=None)
        text = format_message(lead)
        self.assertIn('Service  : (not specified)', text)
        self.assertIn('Needed by: (not specified)', text)

    def test_non_quote_leads_do_not_get_the_service_needed_by_block(self):
        lead = _callback()
        text = format_message(lead)
        self.assertNotIn('Service  :', text)
        self.assertNotIn('Needed by:', text)


@override_settings(TELEGRAM_BOT_TOKEN='test-token')
class NotifyTeamTelegramTests(TestCase):
    def test_no_token_configured_skips_without_sending(self):
        _subscriber()
        lead = _callback()
        with override_settings(TELEGRAM_BOT_TOKEN=''):
            with patch('telegram_alerts.services._send_one') as send:
                result = notify_team_telegram(lead)
        send.assert_not_called()
        self.assertEqual(result, 0)
        self.assertEqual(TelegramDelivery.objects.count(), 0)

    def test_no_subscribers_skips_without_sending(self):
        lead = _callback()
        with patch('telegram_alerts.services._send_one') as send:
            result = notify_team_telegram(lead)
        send.assert_not_called()
        self.assertEqual(result, 0)

    def test_enquiry_kind_is_skipped_by_the_alert_routing_rule(self):
        _subscriber()
        lead = _enquiry()
        with patch('telegram_alerts.services._send_one') as send:
            result = notify_team_telegram(lead)
        send.assert_not_called()
        self.assertEqual(result, 0)
        self.assertEqual(TelegramDelivery.objects.count(), 0)

    def test_only_active_subscribers_are_targeted(self):
        active = _subscriber(name='Active', chat_id='111')
        _subscriber(name='Inactive', chat_id='222', is_active=False)
        lead = _callback()

        with patch('telegram_alerts.services._send_one') as send:
            result = notify_team_telegram(lead)

        send.assert_called_once_with('test-token', active.chat_id, format_message(lead))
        self.assertEqual(result, 1)

    def test_successful_send_records_delivery(self):
        subscriber = _subscriber()
        lead = _callback()

        with patch('telegram_alerts.services._send_one') as send:
            result = notify_team_telegram(lead)

        send.assert_called_once()
        self.assertEqual(result, 1)
        delivery = TelegramDelivery.objects.get(lead=lead, subscriber=subscriber)
        self.assertEqual(delivery.status, TelegramDelivery.Status.SUCCESS)
        self.assertEqual(delivery.error_message, '')

    def test_failed_send_is_logged_not_raised(self):
        subscriber = _subscriber()
        lead = _callback()

        with patch('telegram_alerts.services._send_one', side_effect=RuntimeError('chat not found')):
            result = notify_team_telegram(lead)  # must not raise

        self.assertEqual(result, 0)
        delivery = TelegramDelivery.objects.get(lead=lead, subscriber=subscriber)
        self.assertEqual(delivery.status, TelegramDelivery.Status.FAILED)
        self.assertIn('chat not found', delivery.error_message)

    def test_one_subscriber_failing_does_not_stop_the_others(self):
        _subscriber(name='Broken', chat_id='111')
        _subscriber(name='Fine', chat_id='222')
        lead = _callback()

        def side_effect(token, chat_id, text):
            if chat_id == '111':
                raise RuntimeError('blocked the bot')

        with patch('telegram_alerts.services._send_one', side_effect=side_effect):
            result = notify_team_telegram(lead)

        self.assertEqual(result, 1)
        self.assertEqual(TelegramDelivery.objects.filter(status=TelegramDelivery.Status.FAILED).count(), 1)
        self.assertEqual(TelegramDelivery.objects.filter(status=TelegramDelivery.Status.SUCCESS).count(), 1)


class SendOnePayloadTests(TestCase):
    """The actual HTTP call — mocked at urlopen, not at _send_one, so the JSON payload and
    Telegram API response handling get real coverage too."""

    def test_posts_expected_payload_and_parses_ok_response(self):
        from telegram_alerts import services

        class FakeResponse:
            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

            def read(self):
                return json.dumps({'ok': True, 'result': {'message_id': 42}}).encode()

        with patch('telegram_alerts.services.urllib.request.urlopen', return_value=FakeResponse()) as urlopen:
            services._send_one('tok', '999', 'hello')

        request = urlopen.call_args[0][0]
        self.assertIn('tok', request.full_url)
        self.assertEqual(json.loads(request.data), {'chat_id': '999', 'text': 'hello'})

    def test_raises_on_not_ok_response(self):
        from telegram_alerts import services

        class FakeResponse:
            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

            def read(self):
                return json.dumps({'ok': False, 'description': 'chat not found'}).encode()

        with patch('telegram_alerts.services.urllib.request.urlopen', return_value=FakeResponse()):
            with self.assertRaisesMessage(RuntimeError, 'chat not found'):
                services._send_one('tok', '999', 'hello')


class CallbackTriggersTelegramAlertTests(TestCase):
    """Wiring check: submitting a lead through the public API calls notify_team_telegram, the
    same way it already calls notify_team. Not the sending logic itself (covered above)."""

    def setUp(self):
        # The lead-creation endpoints share a per-IP throttle scope (LeadRateThrottle) backed by
        # Django's cache, which persists across TestCase classes within one test run — clear it so
        # these two real POSTs never depend on how many other tests already used the same scope.
        from django.core.cache import cache
        cache.clear()

    def test_callback_submission_calls_notify_team_telegram(self):
        from django.urls import reverse
        from rest_framework.test import APIClient

        client = APIClient()
        with patch('content.views.notify_team_telegram') as telegram_notify:
            res = client.post(reverse('callback-create'), {'name': 'Deborah Beck', 'phone': '9876543210'})

        self.assertEqual(res.status_code, 201, res.data)
        telegram_notify.assert_called_once()
        lead_arg = telegram_notify.call_args[0][0]
        self.assertEqual(lead_arg.name, 'Deborah Beck')

    def test_quote_submission_also_calls_notify_team_telegram(self):
        """Every lead kind gets a Telegram alert, same as email — not just the homepage callback.
        perform_create() has no branch on lead.kind, so this just confirms a second kind wires up
        the same way rather than re-testing the sending logic itself."""
        from django.urls import reverse
        from rest_framework.test import APIClient

        from rates.models import Currency

        Currency.objects.update_or_create(
            code='USD',
            defaults=dict(name='US Dollar', country_code='US', buy_rate='83.0', sell_rate='84.0', is_visible=True),
        )
        client = APIClient()
        with patch('content.views.notify_team_telegram') as telegram_notify:
            res = client.post(reverse('quote-create'), {
                'name': 'Ravi Kumar', 'phone': '9876543210', 'email': 'r@example.com',
                'from_currency': 'USD', 'amount': '500',
            })

        self.assertEqual(res.status_code, 201, res.data)
        telegram_notify.assert_called_once()
