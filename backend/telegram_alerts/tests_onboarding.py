import json
from unittest.mock import patch

from django.contrib.admin.sites import AdminSite
from django.test import Client, RequestFactory, TestCase, override_settings
from django.urls import reverse
from django.utils import timezone

from .admin import TelegramInviteAdmin
from .models import TelegramInvite, TelegramSubscriber


def _headers(secret='changeme-set-a-real-webhook-secret'):
    return {'HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN': secret}


def _start_update(token, chat_id=555, first_name='Ravi'):
    return json.dumps({
        'message': {
            'text': f'/start {token}',
            'chat': {'id': chat_id, 'type': 'private'},
            'from': {'id': chat_id, 'first_name': first_name},
        }
    }).encode()


class TelegramInviteModelTests(TestCase):
    def test_created_with_a_random_unique_token(self):
        a = TelegramInvite.objects.create(label='A')
        b = TelegramInvite.objects.create(label='B')
        self.assertNotEqual(a.token, b.token)
        self.assertGreater(len(a.token), 10)

    def test_defaults_to_pending_and_not_yet_expired(self):
        invite = TelegramInvite.objects.create(label='Ravi')
        self.assertEqual(invite.status, TelegramInvite.Status.PENDING)
        self.assertFalse(invite.is_expired)
        self.assertTrue(invite.is_claimable)

    def test_is_claimable_false_once_past_expiry(self):
        invite = TelegramInvite.objects.create(label='Ravi')
        TelegramInvite.objects.filter(pk=invite.pk).update(expires_at=timezone.now() - timezone.timedelta(hours=1))
        invite.refresh_from_db()
        self.assertTrue(invite.is_expired)
        self.assertFalse(invite.is_claimable)

    def test_is_claimable_false_once_claimed_even_if_not_expired(self):
        invite = TelegramInvite.objects.create(label='Ravi')
        invite.status = TelegramInvite.Status.CLAIMED
        invite.save()
        self.assertFalse(invite.is_claimable)

    @override_settings(TELEGRAM_BOT_USERNAME='')
    def test_deep_link_is_none_without_a_bot_username_configured(self):
        invite = TelegramInvite.objects.create(label='Ravi')
        self.assertIsNone(invite.deep_link)

    @override_settings(TELEGRAM_BOT_USERNAME='reddyforex_alerts_bot')
    def test_deep_link_encodes_the_token(self):
        invite = TelegramInvite.objects.create(label='Ravi')
        self.assertEqual(invite.deep_link, f'https://t.me/reddyforex_alerts_bot?start={invite.token}')


class TelegramInviteAdminTests(TestCase):
    """The QR image itself — rendered inline on the change form."""

    def setUp(self):
        self.admin = TelegramInviteAdmin(TelegramInvite, AdminSite())

    @override_settings(TELEGRAM_BOT_USERNAME='reddyforex_alerts_bot')
    def test_qr_code_renders_an_image_for_a_claimable_invite(self):
        invite = TelegramInvite.objects.create(label='Ravi')
        html = self.admin.qr_code_display(invite)
        self.assertIn('data:image/png;base64,', html)

    @override_settings(TELEGRAM_BOT_USERNAME='')
    def test_qr_code_shows_a_hint_without_a_bot_username(self):
        invite = TelegramInvite.objects.create(label='Ravi')
        self.assertEqual(self.admin.qr_code_display(invite), '—')

    @override_settings(TELEGRAM_BOT_USERNAME='reddyforex_alerts_bot')
    def test_qr_code_omitted_once_claimed(self):
        invite = TelegramInvite.objects.create(label='Ravi', status=TelegramInvite.Status.CLAIMED)
        html = self.admin.qr_code_display(invite)
        self.assertNotIn('data:image', html)

    def test_revoke_action_only_touches_pending_invites(self):
        pending = TelegramInvite.objects.create(label='A')
        claimed = TelegramInvite.objects.create(label='B', status=TelegramInvite.Status.CLAIMED)
        request = RequestFactory().post('/admin/telegram_alerts/telegraminvite/')
        request._messages = type('M', (), {'add': lambda *a, **k: None})()

        self.admin.revoke_invites(request, TelegramInvite.objects.filter(pk__in=[pending.pk, claimed.pk]))

        pending.refresh_from_db()
        claimed.refresh_from_db()
        self.assertEqual(pending.status, TelegramInvite.Status.REVOKED)
        self.assertEqual(claimed.status, TelegramInvite.Status.CLAIMED)  # untouched


@override_settings(
    TELEGRAM_WEBHOOK_SECRET='changeme-set-a-real-webhook-secret',
    TELEGRAM_BOT_TOKEN='test-token',
)
class TelegramWebhookTests(TestCase):
    def setUp(self):
        self.client = Client(enforce_csrf_checks=True)  # the view must work despite this
        self.url = reverse('telegram-webhook')

    def test_missing_secret_header_is_rejected(self):
        response = self.client.post(self.url, data=b'{}', content_type='application/json')
        self.assertEqual(response.status_code, 403)

    def test_wrong_secret_header_is_rejected(self):
        response = self.client.post(
            self.url, data=b'{}', content_type='application/json',
            **_headers(secret='wrong'),
        )
        self.assertEqual(response.status_code, 403)

    def test_malformed_json_body_still_returns_200(self):
        response = self.client.post(
            self.url, data=b'not json', content_type='application/json', **_headers(),
        )
        self.assertEqual(response.status_code, 200)

    def test_non_start_message_is_ignored(self):
        body = json.dumps({'message': {'text': 'hello', 'chat': {'id': 1}, 'from': {'id': 1}}}).encode()
        with patch('telegram_alerts.updates._send_one') as send:
            response = self.client.post(self.url, data=body, content_type='application/json', **_headers())
        self.assertEqual(response.status_code, 200)
        send.assert_not_called()
        self.assertEqual(TelegramSubscriber.objects.count(), 0)

    def test_valid_start_claims_the_invite_and_creates_a_subscriber(self):
        invite = TelegramInvite.objects.create(label='Ravi')
        with patch('telegram_alerts.updates._send_one') as send:
            response = self.client.post(
                self.url, data=_start_update(invite.token, chat_id=555), content_type='application/json', **_headers(),
            )

        self.assertEqual(response.status_code, 200)
        invite.refresh_from_db()
        self.assertEqual(invite.status, TelegramInvite.Status.CLAIMED)

        subscriber = TelegramSubscriber.objects.get(chat_id='555')
        self.assertEqual(subscriber.name, 'Ravi')
        self.assertTrue(subscriber.is_active)
        self.assertEqual(invite.claimed_by, subscriber)
        send.assert_called_once()
        self.assertIn("you're all set", send.call_args[0][2].lower())

    def test_unknown_token_does_not_create_a_subscriber(self):
        with patch('telegram_alerts.updates._send_one') as send:
            response = self.client.post(
                self.url, data=_start_update('does-not-exist', chat_id=999), content_type='application/json', **_headers(),
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(TelegramSubscriber.objects.count(), 0)
        send.assert_called_once()
        self.assertIn('expired', send.call_args[0][2].lower())

    def test_expired_invite_is_rejected(self):
        invite = TelegramInvite.objects.create(label='Ravi')
        TelegramInvite.objects.filter(pk=invite.pk).update(expires_at=timezone.now() - timezone.timedelta(hours=1))

        with patch('telegram_alerts.updates._send_one'):
            self.client.post(
                self.url, data=_start_update(invite.token, chat_id=555), content_type='application/json', **_headers(),
            )

        self.assertEqual(TelegramSubscriber.objects.count(), 0)
        invite.refresh_from_db()
        self.assertEqual(invite.status, TelegramInvite.Status.PENDING)  # untouched, not silently claimed

    def test_already_claimed_invite_cannot_be_claimed_again(self):
        invite = TelegramInvite.objects.create(label='Ravi')
        with patch('telegram_alerts.updates._send_one'):
            self.client.post(
                self.url, data=_start_update(invite.token, chat_id=555), content_type='application/json', **_headers(),
            )
        first_subscriber_count = TelegramSubscriber.objects.count()

        # A second person (different chat) somehow replays the same token.
        with patch('telegram_alerts.updates._send_one') as send:
            self.client.post(
                self.url, data=_start_update(invite.token, chat_id=777), content_type='application/json', **_headers(),
            )

        self.assertEqual(TelegramSubscriber.objects.count(), first_subscriber_count)  # no second subscriber
        self.assertIn('expired', send.call_args[0][2].lower())

    def test_rescanning_reactivates_an_existing_subscriber_instead_of_erroring(self):
        """A chat_id that already has a (possibly deactivated) subscriber row shouldn't hit the
        unique constraint on chat_id — it should just be reactivated."""
        existing = TelegramSubscriber.objects.create(name='Old Name', chat_id='555', is_active=False)
        invite = TelegramInvite.objects.create(label='New Name')

        with patch('telegram_alerts.updates._send_one'):
            response = self.client.post(
                self.url, data=_start_update(invite.token, chat_id=555), content_type='application/json', **_headers(),
            )

        self.assertEqual(response.status_code, 200)
        existing.refresh_from_db()
        self.assertTrue(existing.is_active)
        self.assertEqual(TelegramSubscriber.objects.count(), 1)

    def test_reply_failure_does_not_prevent_the_claim(self):
        invite = TelegramInvite.objects.create(label='Ravi')
        with patch('telegram_alerts.updates._send_one', side_effect=RuntimeError('blocked')):
            response = self.client.post(
                self.url, data=_start_update(invite.token, chat_id=555), content_type='application/json', **_headers(),
            )
        self.assertEqual(response.status_code, 200)
        invite.refresh_from_db()
        self.assertEqual(invite.status, TelegramInvite.Status.CLAIMED)

    def test_get_is_not_allowed(self):
        response = self.client.get(self.url, **_headers())
        self.assertEqual(response.status_code, 405)


@override_settings(TELEGRAM_BOT_TOKEN='test-token')
class HandleUpdateDirectTests(TestCase):
    """handle_update() exercised directly, the way telegram_poll_dev calls it — not through the
    webhook view, since the whole point of extracting it is that both callers share this exact
    function. Also covers the "never raises" contract on a thoroughly malformed update."""

    def test_claims_a_valid_invite(self):
        from .updates import handle_update

        invite = TelegramInvite.objects.create(label='Ravi')
        with patch('telegram_alerts.updates._send_one') as send:
            handle_update(json.loads(_start_update(invite.token, chat_id=321)))

        invite.refresh_from_db()
        self.assertEqual(invite.status, TelegramInvite.Status.CLAIMED)
        self.assertTrue(TelegramSubscriber.objects.filter(chat_id='321').exists())
        send.assert_called_once()

    def test_completely_malformed_update_does_not_raise(self):
        from .updates import handle_update

        handle_update({'unexpected': 'shape'})  # must not raise
        handle_update({})
        handle_update({'message': {'text': '/start', 'chat': {}, 'from': {}}})  # no chat id at all
        self.assertEqual(TelegramSubscriber.objects.count(), 0)


class TelegramPollDevCommandTests(TestCase):
    """The local-dev long-poll command — just the getUpdates parsing/error handling, not the
    infinite loop itself (that's exercised by hand when actually testing locally)."""

    @override_settings(TELEGRAM_BOT_TOKEN='test-token')
    def test_get_updates_parses_a_successful_response(self):
        from telegram_alerts.management.commands.telegram_poll_dev import Command

        payload = {'ok': True, 'result': [{'update_id': 5, 'message': {}}]}
        with patch('telegram_alerts.management.commands.telegram_poll_dev.urllib.request.urlopen') as urlopen:
            urlopen.return_value.__enter__.return_value.read.return_value = json.dumps(payload).encode()
            updates = Command()._get_updates('test-token', 0)

        self.assertEqual(updates, payload['result'])

    @override_settings(TELEGRAM_BOT_TOKEN='test-token')
    def test_get_updates_raises_on_a_telegram_error_response(self):
        from telegram_alerts.management.commands.telegram_poll_dev import Command

        payload = {'ok': False, 'description': 'Unauthorized'}
        with patch('telegram_alerts.management.commands.telegram_poll_dev.urllib.request.urlopen') as urlopen:
            urlopen.return_value.__enter__.return_value.read.return_value = json.dumps(payload).encode()
            with self.assertRaisesMessage(ValueError, 'Unauthorized'):
                Command()._get_updates('test-token', 0)

    @override_settings(TELEGRAM_BOT_TOKEN='')
    def test_requires_a_bot_token(self):
        from django.core.management import call_command
        from django.core.management.base import CommandError

        with self.assertRaises(CommandError):
            call_command('telegram_poll_dev')


class SetTelegramWebhookCommandTests(TestCase):
    @override_settings(TELEGRAM_BOT_TOKEN='')
    def test_requires_a_bot_token(self):
        from django.core.management import call_command
        from django.core.management.base import CommandError

        with self.assertRaises(CommandError):
            call_command('set_telegram_webhook')

    @override_settings(TELEGRAM_BOT_TOKEN='test-token', ADMIN_BASE_URL='http://localhost:8000')
    def test_refuses_a_non_https_admin_base_url(self):
        from django.core.management import call_command
        from django.core.management.base import CommandError

        with self.assertRaisesMessage(CommandError, 'not HTTPS'):
            call_command('set_telegram_webhook')

    @override_settings(TELEGRAM_BOT_TOKEN='test-token')
    def test_delete_calls_delete_webhook_not_set_webhook(self):
        import io

        from django.core.management import call_command

        with patch('telegram_alerts.management.commands.set_telegram_webhook.urllib.request.urlopen') as urlopen:
            urlopen.return_value.__enter__.return_value.read.return_value = json.dumps({'ok': True}).encode()
            call_command('set_telegram_webhook', '--delete', stdout=io.StringIO())

        called_url = urlopen.call_args[0][0].full_url
        self.assertIn('deleteWebhook', called_url)
