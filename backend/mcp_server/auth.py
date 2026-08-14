"""Bearer-token authentication and per-token rate limiting for the MCP endpoint."""
import time

from django.conf import settings
from django.core.cache import cache

from .models import McpToken


def token_from_request(request):
    """Pull the bearer token out of the Authorization header, or None.

    Header only — never a query parameter. A token in a URL ends up in access
    logs, browser history and Referer headers, and this one can write to the
    site.
    """
    header = request.META.get('HTTP_AUTHORIZATION', '')
    scheme, _, value = header.partition(' ')
    if scheme.lower() != 'bearer' or not value.strip():
        return None
    return McpToken.resolve(value.strip())


def within_rate_limit(token):
    """Fixed-window counter, per token.

    Backed by Django's cache. With the default local-memory cache and more than
    one gunicorn worker the window is counted per worker, so the effective
    ceiling is the limit times the worker count — this bounds a runaway
    assistant, which is what it is for, rather than being a precise quota. Point
    CACHES at a shared backend if you need it exact.
    """
    window = settings.MCP_RATE_LIMIT_WINDOW_SECONDS
    limit = settings.MCP_RATE_LIMIT_CALLS
    if limit <= 0:
        return True

    key = f'mcp:ratelimit:{token.pk}:{int(time.time() // window)}'
    # add() then incr() rather than get/set: two requests arriving together
    # both increment the same counter instead of overwriting each other.
    cache.add(key, 0, window + 5)
    try:
        used = cache.incr(key)
    except ValueError:
        # The key expired between add() and incr(). Treat as the first call of
        # a fresh window rather than failing the request.
        cache.set(key, 1, window + 5)
        used = 1
    return used <= limit
