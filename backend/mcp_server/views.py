"""The single HTTP endpoint an MCP client connects to.

One POST carries one JSON-RPC message (or, for older clients, an array of
them) and gets one JSON response back. There is no session and nothing is kept
between requests, so a restart or a second worker picking up the next call
changes nothing.
"""
import json
import logging

from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt

from . import protocol
from .auth import token_from_request, within_rate_limit
from .models import McpCallLog
from .protocol import (
    INTERNAL_ERROR,
    INVALID_PARAMS,
    INVALID_REQUEST,
    METHOD_NOT_FOUND,
    PARSE_ERROR,
    JsonRpcError,
)
from .registry import ToolError, clean_arguments, get_tool, visible_tools

# Importing the tools module is what registers them — the @tool decorators run
# at import time. urls.py imports this module, so this happens once at startup.
from . import tools  # noqa: F401  (imported for the registration side effect)

logger = logging.getLogger(__name__)

MAX_AUDIT_DETAIL = 500


def _record(token, tool_name, status, detail=''):
    """Write one audit row. Never lets a logging problem fail the actual call."""
    try:
        McpCallLog.objects.create(
            token=token,
            token_name=token.name if token else '',
            tool=tool_name[:60],
            status=status,
            detail=detail[:MAX_AUDIT_DETAIL],
        )
    except Exception:
        logger.exception('Could not write an MCP audit log row for tool %s', tool_name)


def _text_result(payload, is_error=False):
    """Wrap a tool's return value in an MCP tool result.

    JSON inside a text block rather than the newer structuredContent field:
    every client and every protocol version this server accepts understands
    text, and models read JSON out of it reliably.
    """
    if not isinstance(payload, str):
        payload = json.dumps(payload, indent=2, ensure_ascii=False, default=str)
    return {'content': [{'type': 'text', 'text': payload}], 'isError': is_error}


def _call_tool(request, token, params):
    name = params.get('name')
    if not isinstance(name, str) or not name:
        raise JsonRpcError(INVALID_PARAMS, 'tools/call needs a "name".')

    spec = get_tool(name)
    # A tool the token has no scope for is reported as unknown rather than
    # forbidden: tools/list never offered it, so "no such tool" is the honest
    # answer from this caller's point of view, and it does not advertise the
    # existence of tools the credential cannot reach.
    if spec is None or not token.has_scope(spec.scope):
        available = ', '.join(item.name for item in visible_tools(token)) or '(none)'
        _record(token, name, McpCallLog.Status.DENIED, f'Unknown or out-of-scope tool: {name}')
        raise JsonRpcError(
            INVALID_PARAMS,
            f'Unknown tool: {name}. Tools available to this token: {available}.',
        )

    try:
        arguments = clean_arguments(spec, params.get('arguments'))
        result = spec.fn(arguments, {'request': request, 'token': token})
    except ToolError as exc:
        _record(token, name, McpCallLog.Status.ERROR, str(exc))
        return _text_result(f'{name} failed: {exc}', is_error=True)
    except Exception:
        # An unexpected crash is ours, not the model's. Log the traceback for
        # us; hand back something it can act on without leaking internals.
        logger.exception('MCP tool %s crashed', name)
        _record(token, name, McpCallLog.Status.ERROR, 'Unhandled exception (see server logs)')
        return _text_result(
            f'{name} failed unexpectedly on the server. The change was not saved.',
            is_error=True,
        )

    summary = result.get('summary') if isinstance(result, dict) else ''
    _record(token, name, McpCallLog.Status.OK, summary or 'ok')
    return _text_result(result)


def _dispatch(request, token, message):
    """Handle one JSON-RPC message, returning a response dict (or None)."""
    method, params = protocol.validate_envelope(message)
    request_id = message.get('id')

    if method == 'initialize':
        return protocol.success(request_id, protocol.initialize_result(params))

    if method.startswith('notifications/'):
        # Nothing to do for any of them, including notifications/initialized.
        # Notifications get no reply by definition.
        return None

    if method == 'ping':
        return protocol.success(request_id, {})

    if method == 'tools/list':
        listed = [spec.as_dict() for spec in visible_tools(token)]
        return protocol.success(request_id, {'tools': listed})

    if method == 'tools/call':
        return protocol.success(request_id, _call_tool(request, token, params))

    raise JsonRpcError(METHOD_NOT_FOUND, f'This server does not implement {method!r}.')


def _handle_message(request, token, message):
    """Dispatch one message, converting protocol failures into error responses."""
    try:
        response = _dispatch(request, token, message)
    except JsonRpcError as exc:
        request_id = message.get('id') if isinstance(message, dict) else None
        return protocol.failure(request_id, exc.code, exc.message, exc.data)
    except Exception:
        logger.exception('MCP dispatch failed')
        request_id = message.get('id') if isinstance(message, dict) else None
        return protocol.failure(request_id, INTERNAL_ERROR, 'Internal server error.')

    if response is None or protocol.is_notification(message):
        return None
    return response


def _json(payload, status=200):
    response = JsonResponse(payload, status=status, safe=not isinstance(payload, list))
    response['MCP-Protocol-Version'] = protocol.PREFERRED_PROTOCOL_VERSION
    return response


@csrf_exempt
def mcp_endpoint(request):
    """POST-only MCP Streamable HTTP endpoint.

    csrf_exempt because this is a token-authenticated machine API, not a
    browser form — there is no cookie session to forge a request against, and
    an MCP client has no way to obtain a CSRF token.
    """
    if request.method != 'POST':
        # The transport uses GET to open a server→client SSE stream. This
        # server never initiates messages, and the spec's answer for that is a
        # plain 405.
        response = HttpResponse(status=405)
        response['Allow'] = 'POST'
        return response

    token = token_from_request(request)
    if token is None:
        logger.warning('MCP request rejected: missing, unknown, revoked or expired token.')
        response = _json(
            protocol.failure(None, INVALID_REQUEST, 'Missing or invalid bearer token.'),
            status=401,
        )
        response['WWW-Authenticate'] = 'Bearer realm="reddy-forex-mcp"'
        return response

    if not within_rate_limit(token):
        _record(token, 'ratelimit', McpCallLog.Status.DENIED, 'Rate limit exceeded')
        response = _json(
            protocol.failure(
                None, INVALID_REQUEST,
                f'Rate limit exceeded ({settings.MCP_RATE_LIMIT_CALLS} calls per '
                f'{settings.MCP_RATE_LIMIT_WINDOW_SECONDS}s). Try again shortly.',
            ),
            status=429,
        )
        response['Retry-After'] = str(settings.MCP_RATE_LIMIT_WINDOW_SECONDS)
        return response

    try:
        body = json.loads(request.body.decode('utf-8'))
    except (ValueError, UnicodeDecodeError):
        return _json(protocol.failure(None, PARSE_ERROR, 'Request body is not valid JSON.'), status=400)

    token.touch()

    # A list is a JSON-RPC batch. Batching was dropped in the 2025-06-18 spec
    # but older clients may still send one, and answering it is cheaper than
    # failing a client that would otherwise work.
    if isinstance(body, list):
        if not body:
            return _json(protocol.failure(None, INVALID_REQUEST, 'Empty batch.'), status=400)
        responses = [r for r in (_handle_message(request, token, m) for m in body) if r is not None]
        if not responses:
            return HttpResponse(status=202)
        return _json(responses)

    response = _handle_message(request, token, body)
    if response is None:
        # A notification: accepted, nothing to say back.
        return HttpResponse(status=202)
    return _json(response)
