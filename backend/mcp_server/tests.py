import base64
import io
import json
import shutil
import tempfile
from datetime import timedelta

from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone

from content.models import Faq, FaqCategory, SiteImage, Testimonial

from .models import McpCallLog, McpToken, generate_token, hash_token

ENDPOINT = '/mcp/'

#: Distinct from None, which the helpers below take to mean "send no
#: Authorization header at all".
DEFAULT_TOKEN = object()

MEDIA_ROOT = tempfile.mkdtemp(prefix='mcp-tests-')


def make_token(**kwargs):
    """Create a token and hand back both the row and its raw secret."""
    raw = generate_token()
    defaults = dict(name='Test client', can_read=True, can_write_images=True, can_write_content=True)
    defaults.update(kwargs)
    token = McpToken(**defaults)
    token.set_token(raw)
    token.save()
    return token, raw


def png_bytes(size=(40, 30), fmt='PNG'):
    from PIL import Image
    buffer = io.BytesIO()
    Image.new('RGB', size, (200, 120, 40)).save(buffer, format=fmt)
    return buffer.getvalue()


def png_base64(**kwargs):
    return base64.b64encode(png_bytes(**kwargs)).decode()


class McpTestCase(TestCase):
    """Shared plumbing: an authenticated client and JSON-RPC helpers."""

    def setUp(self):
        super().setUp()
        cache.clear()
        self.token, self.raw = make_token()

    def post(self, payload, raw=DEFAULT_TOKEN, **extra):
        headers = {}
        secret = self.raw if raw is DEFAULT_TOKEN else raw
        if secret is not None:
            headers['HTTP_AUTHORIZATION'] = f'Bearer {secret}'
        headers.update(extra)
        return self.client.post(
            ENDPOINT, data=json.dumps(payload), content_type='application/json', **headers
        )

    def rpc(self, method, params=None, request_id=1, raw=DEFAULT_TOKEN):
        message = {'jsonrpc': '2.0', 'id': request_id, 'method': method}
        if params is not None:
            message['params'] = params
        response = self.post(message, raw=raw)
        return response, (response.json() if response.content else None)

    def call_tool(self, name, arguments=None, raw=DEFAULT_TOKEN):
        response, body = self.rpc('tools/call', {'name': name, 'arguments': arguments or {}}, raw=raw)
        return response, body

    def tool_payload(self, name, arguments=None):
        """Call a tool and return its parsed JSON result, asserting success."""
        response, body = self.call_tool(name, arguments)
        self.assertEqual(response.status_code, 200)
        self.assertNotIn('error', body, body)
        result = body['result']
        self.assertFalse(result['isError'], result['content'][0]['text'])
        return json.loads(result['content'][0]['text'])

    def tool_error(self, name, arguments=None):
        """Call a tool expected to fail, returning the error text."""
        response, body = self.call_tool(name, arguments)
        self.assertEqual(response.status_code, 200)
        result = body['result']
        self.assertTrue(result['isError'], result)
        return result['content'][0]['text']


# --- authentication ---------------------------------------------------------

class AuthenticationTests(McpTestCase):
    def test_no_authorization_header_is_rejected(self):
        response = self.post({'jsonrpc': '2.0', 'id': 1, 'method': 'ping'}, raw=None)
        self.assertEqual(response.status_code, 401)
        self.assertIn('Bearer', response['WWW-Authenticate'])

    def test_unknown_token_is_rejected(self):
        response, _ = self.rpc('ping', raw='rfx_mcp_not-a-real-token')
        self.assertEqual(response.status_code, 401)

    def test_revoked_token_is_rejected(self):
        self.token.is_active = False
        self.token.save()
        response, _ = self.rpc('ping')
        self.assertEqual(response.status_code, 401)

    def test_expired_token_is_rejected(self):
        self.token.expires_at = timezone.now() - timedelta(minutes=1)
        self.token.save()
        response, _ = self.rpc('ping')
        self.assertEqual(response.status_code, 401)

    def test_future_expiry_still_works(self):
        self.token.expires_at = timezone.now() + timedelta(days=1)
        self.token.save()
        response, _ = self.rpc('ping')
        self.assertEqual(response.status_code, 200)

    def test_non_bearer_scheme_is_rejected(self):
        response = self.client.post(
            ENDPOINT, data=json.dumps({'jsonrpc': '2.0', 'id': 1, 'method': 'ping'}),
            content_type='application/json', HTTP_AUTHORIZATION=f'Basic {self.raw}',
        )
        self.assertEqual(response.status_code, 401)

    def test_token_is_stored_hashed_never_in_plain_text(self):
        self.assertNotIn(self.raw, self.token.token_hash)
        self.assertEqual(self.token.token_hash, hash_token(self.raw))
        self.assertEqual(len(self.token.token_hash), 64)

    def test_successful_call_records_last_used(self):
        self.assertIsNone(self.token.last_used_at)
        self.rpc('ping')
        self.token.refresh_from_db()
        self.assertIsNotNone(self.token.last_used_at)

    def test_get_is_not_allowed(self):
        response = self.client.get(ENDPOINT, HTTP_AUTHORIZATION=f'Bearer {self.raw}')
        self.assertEqual(response.status_code, 405)


@override_settings(MCP_RATE_LIMIT_CALLS=3, MCP_RATE_LIMIT_WINDOW_SECONDS=60)
class RateLimitTests(McpTestCase):
    def test_calls_over_the_limit_are_throttled(self):
        for _ in range(3):
            response, _ = self.rpc('ping')
            self.assertEqual(response.status_code, 200)

        response, _ = self.rpc('ping')
        self.assertEqual(response.status_code, 429)
        self.assertEqual(response['Retry-After'], '60')

    def test_limit_is_per_token_not_global(self):
        for _ in range(3):
            self.rpc('ping')
        _, other_raw = make_token(name='Someone else')
        response, _ = self.rpc('ping', raw=other_raw)
        self.assertEqual(response.status_code, 200)


# --- protocol ---------------------------------------------------------------

class ProtocolTests(McpTestCase):
    def test_initialize_returns_capabilities_and_server_info(self):
        response, body = self.rpc('initialize', {'protocolVersion': '2025-06-18'})
        self.assertEqual(response.status_code, 200)
        result = body['result']
        self.assertEqual(result['protocolVersion'], '2025-06-18')
        self.assertIn('tools', result['capabilities'])
        self.assertEqual(result['serverInfo']['name'], 'reddy-forex-content')
        # The instructions are what keep a model from inventing content.
        self.assertIn('Never invent a fact', result['instructions'])

    def test_initialize_echoes_a_supported_older_version(self):
        _, body = self.rpc('initialize', {'protocolVersion': '2024-11-05'})
        self.assertEqual(body['result']['protocolVersion'], '2024-11-05')

    def test_initialize_falls_back_for_an_unknown_version(self):
        _, body = self.rpc('initialize', {'protocolVersion': '1999-01-01'})
        self.assertEqual(body['result']['protocolVersion'], '2025-06-18')

    def test_notification_gets_202_and_no_body(self):
        response = self.post({'jsonrpc': '2.0', 'method': 'notifications/initialized'})
        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.content, b'')

    def test_ping_returns_empty_result(self):
        _, body = self.rpc('ping')
        self.assertEqual(body['result'], {})

    def test_unknown_method_is_method_not_found(self):
        _, body = self.rpc('resources/list')
        self.assertEqual(body['error']['code'], -32601)

    def test_malformed_json_is_a_parse_error(self):
        response = self.client.post(
            ENDPOINT, data='{not json', content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {self.raw}',
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['error']['code'], -32700)

    def test_wrong_jsonrpc_version_is_an_invalid_request(self):
        response = self.post({'jsonrpc': '1.0', 'id': 1, 'method': 'ping'})
        self.assertEqual(response.json()['error']['code'], -32600)

    def test_missing_method_is_an_invalid_request(self):
        response = self.post({'jsonrpc': '2.0', 'id': 1})
        self.assertEqual(response.json()['error']['code'], -32600)

    def test_batch_of_requests_returns_a_list_of_responses(self):
        response = self.post([
            {'jsonrpc': '2.0', 'id': 1, 'method': 'ping'},
            {'jsonrpc': '2.0', 'id': 2, 'method': 'ping'},
        ])
        body = response.json()
        self.assertEqual([item['id'] for item in body], [1, 2])

    def test_batch_of_only_notifications_returns_202(self):
        response = self.post([{'jsonrpc': '2.0', 'method': 'notifications/initialized'}])
        self.assertEqual(response.status_code, 202)

    def test_response_carries_the_protocol_version_header(self):
        response, _ = self.rpc('ping')
        self.assertEqual(response['MCP-Protocol-Version'], '2025-06-18')

    def test_request_id_is_echoed_back(self):
        _, body = self.rpc('ping', request_id='abc-123')
        self.assertEqual(body['id'], 'abc-123')


class ToolListingTests(McpTestCase):
    def test_lists_every_tool_with_a_schema(self):
        _, body = self.rpc('tools/list')
        tools = body['result']['tools']
        self.assertEqual(len(tools), 10)
        for entry in tools:
            self.assertTrue(entry['description'])
            self.assertEqual(entry['inputSchema']['type'], 'object')

    def test_read_only_token_sees_only_read_tools(self):
        _, raw = make_token(name='Read only', can_write_images=False, can_write_content=False)
        _, body = self.rpc('tools/list', raw=raw)
        names = {entry['name'] for entry in body['result']['tools']}
        self.assertEqual(
            names,
            {'get_content_overview', 'list_image_slots', 'list_testimonials', 'list_faqs'},
        )

    def test_read_only_token_cannot_call_a_write_tool(self):
        _, raw = make_token(name='Read only', can_write_images=False, can_write_content=False)
        response, body = self.call_tool('create_testimonial', {'quote': 'x' * 20, 'name': 'A'}, raw=raw)
        self.assertEqual(body['error']['code'], -32602)
        self.assertEqual(Testimonial.objects.count(), 0)

    def test_refused_call_is_recorded_as_denied(self):
        _, raw = make_token(name='Read only', can_write_images=False, can_write_content=False)
        self.call_tool('create_testimonial', {'quote': 'x' * 20, 'name': 'A'}, raw=raw)
        log = McpCallLog.objects.get(tool='create_testimonial')
        self.assertEqual(log.status, McpCallLog.Status.DENIED)

    def test_unknown_tool_is_invalid_params(self):
        _, body = self.call_tool('delete_everything')
        self.assertEqual(body['error']['code'], -32602)


class ArgumentValidationTests(McpTestCase):
    def test_missing_required_argument_is_reported(self):
        message = self.tool_error('create_testimonial', {'name': 'Deborah Beck'})
        self.assertIn('"quote"', message)

    def test_unknown_argument_is_rejected(self):
        message = self.tool_error(
            'create_testimonial',
            {'quote': 'x' * 20, 'name': 'Deborah', 'is_visible': True},
        )
        self.assertIn('Unknown argument', message)

    def test_wrong_type_is_rejected(self):
        message = self.tool_error('update_testimonial', {'id': 'not-a-number'})
        self.assertIn('must be a integer', message)

    def test_value_outside_enum_is_rejected(self):
        message = self.tool_error('list_faqs', {'filter': 'everything'})
        self.assertIn('must be one of', message)

    def test_too_short_string_is_rejected(self):
        message = self.tool_error('create_testimonial', {'quote': 'short', 'name': 'Deborah'})
        self.assertIn('at least 10 characters', message)

    def test_defaults_are_applied_when_omitted(self):
        payload = self.tool_payload('list_image_slots')
        self.assertEqual(payload['count'], len(SiteImage.Slot.choices))


# --- read tools -------------------------------------------------------------

class ReadToolTests(McpTestCase):
    def test_overview_counts_published_and_unpublished_separately(self):
        Testimonial.objects.create(quote='Great service', name='A', is_visible=True)
        Testimonial.objects.create(quote='Also great', name='B', is_visible=False)
        payload = self.tool_payload('get_content_overview')
        self.assertEqual(payload['testimonials']['published'], 1)
        self.assertEqual(payload['testimonials']['awaiting_review'], 1)
        self.assertEqual(payload['images']['slots_filled'], 0)

    def test_list_image_slots_marks_empty_slots(self):
        payload = self.tool_payload('list_image_slots', {'filter': 'empty'})
        self.assertEqual(payload['count'], len(SiteImage.Slot.choices))
        self.assertFalse(payload['slots'][0]['has_image'])

    def test_list_faqs_filters_by_category(self):
        category = FaqCategory.objects.create(name='Payments')
        FaqCategory.objects.create(name='Travel cards')
        Faq.objects.create(question='How do I pay?', answer='Cash or card.', category=category)
        Faq.objects.create(question='Unrelated?', answer='No category here.')

        payload = self.tool_payload('list_faqs', {'category': 'payments'})
        self.assertEqual(payload['count'], 1)
        self.assertEqual(payload['faqs'][0]['category'], 'Payments')

    def test_list_faqs_rejects_an_unknown_category_and_names_the_real_ones(self):
        FaqCategory.objects.create(name='Payments')
        message = self.tool_error('list_faqs', {'category': 'Nonsense'})
        self.assertIn("'Payments'", message)

    def test_listing_includes_unpublished_items(self):
        Testimonial.objects.create(quote='Hidden for now', name='A', is_visible=False)
        payload = self.tool_payload('list_testimonials', {'filter': 'awaiting_review'})
        self.assertEqual(payload['count'], 1)
        self.assertFalse(payload['testimonials'][0]['is_published'])


# --- content tools ----------------------------------------------------------

class TestimonialToolTests(McpTestCase):
    def test_created_testimonial_is_hidden_by_default(self):
        payload = self.tool_payload(
            'create_testimonial',
            {'quote': 'Excellent and prompt service.', 'name': 'Deborah Beck'},
        )
        obj = Testimonial.objects.get(pk=payload['id'])
        self.assertFalse(obj.is_visible)
        self.assertIn('hidden', payload['note'])

    def test_publish_true_makes_it_live(self):
        payload = self.tool_payload(
            'create_testimonial',
            {'quote': 'Excellent and prompt service.', 'name': 'Deborah Beck', 'publish': True},
        )
        self.assertTrue(Testimonial.objects.get(pk=payload['id']).is_visible)

    def test_created_testimonial_goes_to_the_end_of_the_order(self):
        Testimonial.objects.create(quote='First one here', name='Aisha Khan', display_order=7)
        payload = self.tool_payload(
            'create_testimonial', {'quote': 'Second one here', 'name': 'Bella Roy'},
        )
        self.assertEqual(payload['display_order'], 8)

    def test_update_changes_only_what_was_passed(self):
        obj = Testimonial.objects.create(quote='Original quote here', name='Deborah', role='Google review')
        self.tool_payload('update_testimonial', {'id': obj.pk, 'name': 'Deborah Beck'})
        obj.refresh_from_db()
        self.assertEqual(obj.name, 'Deborah Beck')
        self.assertEqual(obj.quote, 'Original quote here')
        self.assertEqual(obj.role, 'Google review')

    def test_update_can_publish(self):
        obj = Testimonial.objects.create(quote='Waiting for review', name='A', is_visible=False)
        self.tool_payload('update_testimonial', {'id': obj.pk, 'is_published': True})
        obj.refresh_from_db()
        self.assertTrue(obj.is_visible)

    def test_update_with_no_fields_is_an_error(self):
        obj = Testimonial.objects.create(quote='Something here', name='A')
        self.assertIn('Nothing to update', self.tool_error('update_testimonial', {'id': obj.pk}))

    def test_update_of_a_missing_row_is_an_error(self):
        self.assertIn('No testimonial with id', self.tool_error('update_testimonial', {'id': 999}))


class FaqToolTests(McpTestCase):
    def test_created_faq_is_hidden_by_default(self):
        payload = self.tool_payload(
            'create_faq',
            {'question': 'What documents do I need?', 'answer': 'Your passport and visa.'},
        )
        self.assertFalse(Faq.objects.get(pk=payload['id']).is_visible)

    def test_faq_can_be_filed_under_an_existing_category(self):
        FaqCategory.objects.create(name='Documents & KYC')
        payload = self.tool_payload('create_faq', {
            'question': 'What documents do I need?',
            'answer': 'Your passport and visa.',
            'category': 'documents & kyc',
        })
        self.assertEqual(payload['category'], 'Documents & KYC')

    def test_unknown_category_is_refused_rather_than_created(self):
        message = self.tool_error('create_faq', {
            'question': 'What documents do I need?',
            'answer': 'Your passport and visa.',
            'category': 'Invented Category',
        })
        self.assertIn('No FAQ category', message)
        self.assertEqual(FaqCategory.objects.count(), 0)
        self.assertEqual(Faq.objects.count(), 0)

    def test_update_can_move_category_and_publish(self):
        first = FaqCategory.objects.create(name='Payments')
        FaqCategory.objects.create(name='Limits & rules')
        obj = Faq.objects.create(question='Cash limit?', answer='Rs 49,999.', category=first, is_visible=False)

        self.tool_payload('update_faq', {'id': obj.pk, 'category': 'Limits & rules', 'is_published': True})
        obj.refresh_from_db()
        self.assertEqual(obj.category.name, 'Limits & rules')
        self.assertTrue(obj.is_visible)


# --- image tools ------------------------------------------------------------

@override_settings(MEDIA_ROOT=MEDIA_ROOT)
class ImageToolTests(McpTestCase):
    slot = SiteImage.Slot.ABOUT_COUNTER

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(MEDIA_ROOT, ignore_errors=True)
        super().tearDownClass()

    def test_upload_creates_a_visible_image(self):
        payload = self.tool_payload('upload_site_image', {
            'slot': self.slot, 'image_base64': png_base64(), 'alt_text': 'Our counter in T. Nagar',
        })
        obj = SiteImage.objects.get(slot=self.slot)
        self.assertTrue(obj.is_visible)
        self.assertEqual(obj.alt_text, 'Our counter in T. Nagar')
        self.assertFalse(payload['replaced_existing'])
        self.assertTrue(payload['url'])

    def test_upload_accepts_a_data_uri(self):
        self.tool_payload('upload_site_image', {
            'slot': self.slot, 'image_base64': f'data:image/png;base64,{png_base64()}',
        })
        self.assertTrue(SiteImage.objects.filter(slot=self.slot).exists())

    def test_upload_tolerates_whitespace_in_the_payload(self):
        chunked = '\n'.join(png_base64()[i:i + 40] for i in range(0, 400, 40)) + png_base64()[400:]
        self.tool_payload('upload_site_image', {'slot': self.slot, 'image_base64': chunked})
        self.assertTrue(SiteImage.objects.filter(slot=self.slot).exists())

    def test_upload_can_be_held_back_from_the_site(self):
        self.tool_payload('upload_site_image', {
            'slot': self.slot, 'image_base64': png_base64(), 'publish': False,
        })
        self.assertFalse(SiteImage.objects.get(slot=self.slot).is_visible)

    def test_unknown_slot_is_refused(self):
        message = self.tool_error('upload_site_image', {
            'slot': 'not_a_real_slot', 'image_base64': png_base64(),
        })
        self.assertIn('Unknown slot', message)

    def test_invalid_base64_is_refused(self):
        message = self.tool_error('upload_site_image', {
            'slot': self.slot, 'image_base64': 'this is not base64!!',
        })
        self.assertIn('not valid base64', message)

    def test_a_non_image_is_refused(self):
        payload = base64.b64encode(b'I am a text file, not a picture at all.').decode()
        message = self.tool_error('upload_site_image', {'slot': self.slot, 'image_base64': payload})
        self.assertIn('not a valid image', message)
        self.assertFalse(SiteImage.objects.exists())

    def test_an_unsupported_format_is_refused(self):
        message = self.tool_error('upload_site_image', {
            'slot': self.slot, 'image_base64': base64.b64encode(png_bytes(fmt='BMP')).decode(),
        })
        self.assertIn('Unsupported image format', message)

    @override_settings(MCP_MAX_IMAGE_MB=0.0001)
    def test_an_oversized_image_is_refused(self):
        message = self.tool_error('upload_site_image', {
            'slot': self.slot, 'image_base64': png_base64(size=(400, 400)),
        })
        self.assertIn('over the', message)

    def test_replacing_a_slot_deletes_the_previous_file(self):
        self.tool_payload('upload_site_image', {'slot': self.slot, 'image_base64': png_base64()})
        obj = SiteImage.objects.get(slot=self.slot)
        first_name = obj.image.name
        self.assertTrue(obj.image.storage.exists(first_name))

        payload = self.tool_payload('upload_site_image', {
            'slot': self.slot, 'image_base64': png_base64(size=(50, 50)),
        })
        self.assertTrue(payload['replaced_existing'])
        obj.refresh_from_db()
        self.assertNotEqual(obj.image.name, first_name)
        self.assertFalse(obj.image.storage.exists(first_name), 'the replaced file should be cleaned up')
        # And exactly one row per slot, still.
        self.assertEqual(SiteImage.objects.filter(slot=self.slot).count(), 1)

    def test_update_alt_text_without_reuploading(self):
        self.tool_payload('upload_site_image', {'slot': self.slot, 'image_base64': png_base64()})
        self.tool_payload('update_site_image', {'slot': self.slot, 'alt_text': 'A new description'})
        self.assertEqual(SiteImage.objects.get(slot=self.slot).alt_text, 'A new description')

    def test_update_can_hide_an_image(self):
        self.tool_payload('upload_site_image', {'slot': self.slot, 'image_base64': png_base64()})
        self.tool_payload('update_site_image', {'slot': self.slot, 'is_visible': False})
        self.assertFalse(SiteImage.objects.get(slot=self.slot).is_visible)

    def test_updating_an_empty_slot_is_an_error(self):
        message = self.tool_error('update_site_image', {'slot': self.slot, 'alt_text': 'x'})
        self.assertIn('No photo has been uploaded', message)

    def test_alt_text_falls_back_to_the_slot_label(self):
        payload = self.tool_payload('upload_site_image', {'slot': self.slot, 'image_base64': png_base64()})
        self.assertEqual(payload['alt_text'], SiteImage.Slot(self.slot).label)


# --- audit trail ------------------------------------------------------------

class AuditLogTests(McpTestCase):
    def test_successful_call_is_logged_with_a_summary(self):
        self.tool_payload('create_testimonial', {'quote': 'Excellent service here', 'name': 'Deborah'})
        log = McpCallLog.objects.get(tool='create_testimonial')
        self.assertEqual(log.status, McpCallLog.Status.OK)
        self.assertEqual(log.token_name, 'Test client')
        self.assertIn('Deborah', log.detail)

    def test_failed_call_is_logged_with_the_reason(self):
        self.tool_error('update_testimonial', {'id': 999})
        log = McpCallLog.objects.get(tool='update_testimonial')
        self.assertEqual(log.status, McpCallLog.Status.ERROR)
        self.assertIn('No testimonial with id', log.detail)

    def test_log_survives_the_token_being_deleted(self):
        self.tool_payload('get_content_overview')
        self.token.delete()
        log = McpCallLog.objects.get(tool='get_content_overview')
        self.assertIsNone(log.token)
        self.assertEqual(log.token_name, 'Test client')

    def test_image_upload_does_not_store_the_base64_payload(self):
        with override_settings(MEDIA_ROOT=MEDIA_ROOT):
            image = png_base64()
            self.tool_payload('upload_site_image', {
                'slot': SiteImage.Slot.ABOUT_TEAM, 'image_base64': image,
            })
        log = McpCallLog.objects.get(tool='upload_site_image')
        self.assertNotIn(image[:60], log.detail)
        self.assertLessEqual(len(log.detail), 500)
        shutil.rmtree(MEDIA_ROOT, ignore_errors=True)


class ManagementCommandTests(TestCase):
    def test_create_mcp_token_prints_the_secret_once_and_stores_a_hash(self):
        from io import StringIO

        from django.core.management import call_command

        out = StringIO()
        call_command('create_mcp_token', 'Claude desktop', '--images', stdout=out)
        printed = out.getvalue()

        token = McpToken.objects.get()
        self.assertTrue(token.can_read)
        self.assertTrue(token.can_write_images)
        self.assertFalse(token.can_write_content)

        raw = next(word for word in printed.split() if word.startswith('rfx_mcp_'))
        self.assertEqual(token.token_hash, hash_token(raw))
        self.assertNotIn(raw, token.token_hint)
        self.assertEqual(McpToken.resolve(raw), token)


class PublicApiIsStillReadOnlyTests(TestCase):
    """The MCP endpoint must not have loosened anything on the public API."""

    def test_public_content_endpoints_still_reject_writes(self):
        for path in ('/api/testimonials/', '/api/faqs/', '/api/site-images/'):
            response = self.client.post(path, data={}, content_type='application/json')
            self.assertIn(
                response.status_code, (401, 403, 405),
                f'{path} accepted an unauthenticated POST ({response.status_code})',
            )

    def test_mcp_endpoint_is_not_under_the_public_api_prefix(self):
        response = self.client.post(
            '/api/mcp/', data=json.dumps({'jsonrpc': '2.0', 'id': 1, 'method': 'ping'}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 404)
