"""Generic INR-denominated FX rate fetchers, plus a fetch-with-fallback helper.

Deliberately just the fetch functions and an order to try them in — not a plugin framework. Kept
dependency-free (stdlib urllib, like backend/scripts/check_rate_apis.py) rather than adding
`requests` for what is a handful of calls a day.

Originally built for reference_rates (the currency-board typo guard / auto-pricing), pulled into
its own app so any future feature that needs an INR exchange rate — not just that one — can call
`fetch_with_fallback()` without depending on the reference_rates app.
"""
import json
import logging
import urllib.error
import urllib.request

from django.conf import settings
from django.db import models

logger = logging.getLogger(__name__)

TIMEOUT = 15

EXCHANGERATE_API_URL = 'https://v6.exchangerate-api.com/v6/{key}/latest/{base}'

# fawazahmed0/exchange-api publishes through two independent free CDNs, mirrored, so one being
# down (jsDelivr has had regional outages before) doesn't take the fetch down with it.
FAWAZAHMED0_URLS = [
    'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/{base}.json',
    'https://latest.currency-api.pages.dev/v1/currencies/{base}.json',
]

FRANKFURTER_URL = 'https://api.frankfurter.dev/v1/latest?base={base}'


class Provider(models.TextChoices):
    """Reusable choices for any model that needs to let staff pick a primary provider."""
    EXCHANGERATE_API = 'exchangerate-api', 'ExchangeRate-API (exchangerate-api.com)'
    FAWAZAHMED0 = 'fawazahmed0', 'fawazahmed0/exchange-api'
    FRANKFURTER = 'frankfurter', 'Frankfurter'


def _fetch_json(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'reddyforex-fx-providers/1.0'})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        return json.loads(resp.read().decode())


def fetch_exchangerateapi(base='INR'):
    """Returns {code: base_rate} for the ~161 currencies it carries, or raises on failure.

    Response shape is {"result": "success", "base_code": base,
    "conversion_rates": {"USD": 0.0105, ...}} — inverted so the caller gets "1 USD = X <base>"
    rather than "1 <base> = X USD". A non-success result (bad key, quota-reached,
    inactive-account) raises with the vendor's own error-type in the message, so the log line
    distinguishes "no key configured" from "key rejected" from "quota used up" instead of them all
    looking like a generic failure.
    """
    api_key = settings.EXCHANGERATE_API_KEY
    if not api_key:
        raise RuntimeError('EXCHANGERATE_API_KEY is not set')

    payload = _fetch_json(EXCHANGERATE_API_URL.format(key=api_key, base=base))
    if payload.get('result') != 'success':
        raise RuntimeError(f'exchangerate-api error: {payload.get("error-type", "unknown")}')

    base_to_foreign = payload['conversion_rates']
    return {
        code.upper(): 1 / rate
        for code, rate in base_to_foreign.items()
        if rate
    }, Provider.EXCHANGERATE_API


def fetch_fawazahmed0(base='INR'):
    """Returns {code: base_rate} for every currency it knows, or raises on total failure.

    Response shape is {"date": "...", base.lower(): {"usd": 0.0105, ...}} — 1 base = 0.0105 USD,
    so we invert to get 1 USD = X base.
    """
    last_error = None
    for url_template in FAWAZAHMED0_URLS:
        try:
            payload = _fetch_json(url_template.format(base=base.lower()))
            base_to_foreign = payload[base.lower()]
            return {
                code.upper(): 1 / rate
                for code, rate in base_to_foreign.items()
                if rate
            }, Provider.FAWAZAHMED0
        except (urllib.error.URLError, TimeoutError, KeyError, ValueError, ZeroDivisionError) as exc:
            last_error = exc
            logger.warning('fawazahmed0 fetch failed at %s: %s', url_template, exc)
    raise RuntimeError(f'fawazahmed0/exchange-api unreachable on all mirrors: {last_error}')


def fetch_frankfurter(base='INR'):
    """Returns {code: base_rate} for the ~29 ECB currencies it carries, or raises on failure.

    Response shape is {"base": base, "rates": {"USD": 0.0105, ...}} — same inversion as above.
    """
    payload = _fetch_json(FRANKFURTER_URL.format(base=base))
    base_to_foreign = payload['rates']
    return {
        code.upper(): 1 / rate
        for code, rate in base_to_foreign.items()
        if rate
    }, Provider.FRANKFURTER


# Order tried when the caller doesn't specify (or after the chosen primary has had its turn) —
# also the definition of "fallback order" for fetch_with_fallback below.
DEFAULT_ORDER = [Provider.EXCHANGERATE_API, Provider.FAWAZAHMED0, Provider.FRANKFURTER]


def fetch_with_fallback(codes, primary=None, base='INR'):
    """Fetch {base}-denominated rates for the given currency codes, trying providers in order.

    `primary` (a Provider value) is tried first if given; every other provider is then tried, in
    DEFAULT_ORDER, for whatever codes are still missing. Returns {code: (rate, source)}. Never
    raises — a total outage across every provider returns an empty dict, and the caller
    logs/reports that; each provider failing individually is logged here as it happens.
    """
    codes = {c.upper() for c in codes}
    results = {}

    # Built fresh on every call (not a module-level constant) so it always resolves the *current*
    # fetch_exchangerateapi/fetch_fawazahmed0/fetch_frankfurter — matters for tests, which patch
    # those names on this module; a dict built once at import time would keep the original
    # (real, network-calling) function objects forever, silently ignoring the patch.
    provider_funcs = {
        Provider.EXCHANGERATE_API: fetch_exchangerateapi,
        Provider.FAWAZAHMED0: fetch_fawazahmed0,
        Provider.FRANKFURTER: fetch_frankfurter,
    }

    order = list(DEFAULT_ORDER)
    if primary and primary in order:
        order.remove(primary)
        order.insert(0, primary)

    for provider in order:
        missing = codes - results.keys()
        if not missing:
            break
        fetch_func = provider_funcs[provider]
        try:
            rates, source = fetch_func(base=base)
            for code in missing & rates.keys():
                results[code] = (rates[code], source)
        except (RuntimeError, urllib.error.URLError, TimeoutError, KeyError, ValueError) as exc:
            # A blank EXCHANGERATE_API_KEY hitting this branch is routine, not an incident, so this
            # stays at info/warning rather than error — the caller decides whether an empty overall
            # result (every provider failed) is worth escalating.
            level = logging.INFO if provider == Provider.EXCHANGERATE_API else logging.WARNING
            logger.log(level, '%s unavailable: %s', provider, exc)

    return results
