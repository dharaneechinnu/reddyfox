"""The MCP wire protocol: JSON-RPC 2.0 over HTTP.

Written against the Streamable HTTP transport rather than pulled in as a
dependency. The reason is deployment, not preference: the official Python SDK
is ASGI, this project runs gunicorn/WSGI, and swapping the app server to gain
one endpoint would put every other request on a new stack. The subset a
tools-only server actually needs — initialize, tools/list, tools/call, ping —
is a few hundred lines of JSON-RPC, all of it testable with Django's own test
client.

The transport spec permits answering each POST with a single JSON response
instead of an SSE stream, which is what this does. Nothing here needs to push
to the client, so there is no stream to keep open and no session to track.
"""

# Versions this server can speak, newest first. `initialize` echoes back the
# client's version when it is one of these, so an older client is not forced to
# upgrade; when it isn't, the client is told our preferred version and decides.
SUPPORTED_PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05']
PREFERRED_PROTOCOL_VERSION = SUPPORTED_PROTOCOL_VERSIONS[0]

SERVER_NAME = 'reddy-forex-content'
SERVER_VERSION = '1.0.0'

# JSON-RPC 2.0 error codes.
PARSE_ERROR = -32700
INVALID_REQUEST = -32600
METHOD_NOT_FOUND = -32601
INVALID_PARAMS = -32602
INTERNAL_ERROR = -32603


class JsonRpcError(Exception):
    """A protocol-level failure — malformed call, unknown method, bad params.

    Distinct from a tool that ran and failed: that comes back as a normal
    result with isError set, so the model can read what went wrong and try
    again. This class is for calls that never got as far as a tool.
    """

    def __init__(self, code, message, data=None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.data = data


def success(request_id, result):
    return {'jsonrpc': '2.0', 'id': request_id, 'result': result}


def failure(request_id, code, message, data=None):
    error = {'code': code, 'message': message}
    if data is not None:
        error['data'] = data
    return {'jsonrpc': '2.0', 'id': request_id, 'error': error}


def is_notification(message):
    """True for a JSON-RPC notification — a call with no id, expecting no reply."""
    return isinstance(message, dict) and 'id' not in message


def negotiate_protocol_version(requested):
    if requested in SUPPORTED_PROTOCOL_VERSIONS:
        return requested
    return PREFERRED_PROTOCOL_VERSION


def initialize_result(params):
    return {
        'protocolVersion': negotiate_protocol_version((params or {}).get('protocolVersion')),
        # listChanged is false: the tool set is defined in code, so it cannot
        # change while the server is running and there is nothing to notify.
        'capabilities': {'tools': {'listChanged': False}},
        'serverInfo': {'name': SERVER_NAME, 'version': SERVER_VERSION},
        'instructions': (
            'Content tools for the Reddy Forex website (an RBI-authorised money changer in '
            'Chennai). Call get_content_overview first to see what is on the site and what is '
            'waiting for review.\n\n'
            'This is a regulated financial business. Never invent a fact — a licence number, a '
            'certification, a branch count, a rating, a customer quote or an exchange rate. Only '
            'write content the business has actually given you. Testimonials are real customers: '
            'writing a plausible-sounding one is fabricating a review, not drafting copy.'
        ),
    }


def validate_envelope(message):
    """Check the JSON-RPC shape of one message, raising JsonRpcError if wrong."""
    if not isinstance(message, dict):
        raise JsonRpcError(INVALID_REQUEST, 'A JSON-RPC message must be an object.')
    if message.get('jsonrpc') != '2.0':
        raise JsonRpcError(INVALID_REQUEST, 'Only JSON-RPC 2.0 is supported ("jsonrpc": "2.0").')
    method = message.get('method')
    if not isinstance(method, str) or not method:
        raise JsonRpcError(INVALID_REQUEST, 'A JSON-RPC message must carry a "method" string.')
    params = message.get('params', {})
    if params is None:
        params = {}
    if not isinstance(params, dict):
        raise JsonRpcError(INVALID_PARAMS, '"params" must be an object.')
    return method, params
