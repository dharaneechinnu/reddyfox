"""Fetch logic for third-party reference rates.

Kept dependency-free (stdlib urllib, like backend/scripts/check_rate_apis.py) rather than adding
`requests` for what is one scheduled call a day.

Provider order, current as of the ExchangeRate-API integration:

  1. exchangerate-api.com — primary. A real vendor with an SLA and a quota dashboard, 161
     currencies (covers the whole board). Requires EXCHANGERATE_API_KEY; if that's unset, this
     provider is skipped immediately rather than attempted and failed.
  2. fawazahmed0/exchange-api — fallback. Free, keyless, also covers the whole board — the safety
     net if the key is missing, revoked, or the free quota (1,500 req/month; we use ~60) is somehow
     exhausted.
  3. Frankfurter — last resort, for whatever's still missing. Self-hostable, ECB data, but its
     dataset misses AED/SAR/QAR, which is why it was never primary. See
     docs/currency-rate-apis.md ("Verified findings") for the full comparison.
"""
import json
import logging
import urllib.error
import urllib.request

from django.conf import settings

logger = logging.getLogger(__name__)

TIMEOUT = 15

EXCHANGERATE_API_URL = 'https://v6.exchangerate-api.com/v6/{key}/latest/INR'

# fawazahmed0/exchange-api publishes through two independent free CDNs, mirrored, so one being
# down (jsDelivr has had regional outages before) doesn't take the fetch down with it.
FAWAZAHMED0_URLS = [
    'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/inr.json',
    'https://latest.currency-api.pages.dev/v1/currencies/inr.json',
]

FRANKFURTER_URL = 'https://api.frankfurter.dev/v1/latest?base=INR'


def _fetch_json(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'reddyforex-reference-rates/1.0'})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        return json.loads(resp.read().decode())


def fetch_exchangerateapi():
    """Returns {code: inr_rate} for the ~161 currencies it carries, or raises on failure.

    Response shape is {"result": "success", "base_code": "INR",
    "conversion_rates": {"USD": 0.0105, ...}} — same INR→currency inversion as every other
    provider here. A non-success result (bad key, quota-reached, inactive-account) raises with the
    vendor's own error-type in the message, so the log line distinguishes "no key configured" from
    "key rejected" from "quota used up" instead of them all looking like a generic failure.
    """
    api_key = settings.EXCHANGERATE_API_KEY
    if not api_key:
        raise RuntimeError('EXCHANGERATE_API_KEY is not set')

    payload = _fetch_json(EXCHANGERATE_API_URL.format(key=api_key))
    if payload.get('result') != 'success':
        raise RuntimeError(f'exchangerate-api error: {payload.get("error-type", "unknown")}')

    inr_to_foreign = payload['conversion_rates']
    return {
        code.upper(): 1 / rate
        for code, rate in inr_to_foreign.items()
        if rate
    }, 'exchangerate-api'


def fetch_fawazahmed0():
    """Returns {code: inr_rate} for every currency it knows, or raises on total failure.

    Response shape is {"date": "...", "inr": {"usd": 0.0105, ...}} — 1 INR = 0.0105 USD, so we
    invert to get 1 USD = X INR, the direction our board is priced in.
    """
    last_error = None
    for url in FAWAZAHMED0_URLS:
        try:
            payload = _fetch_json(url)
            inr_to_foreign = payload['inr']
            return {
                code.upper(): 1 / rate
                for code, rate in inr_to_foreign.items()
                if rate
            }, 'fawazahmed0'
        except (urllib.error.URLError, TimeoutError, KeyError, ValueError, ZeroDivisionError) as exc:
            last_error = exc
            logger.warning('fawazahmed0 fetch failed at %s: %s', url, exc)
    raise RuntimeError(f'fawazahmed0/exchange-api unreachable on all mirrors: {last_error}')


def fetch_frankfurter():
    """Returns {code: inr_rate} for the ~29 ECB currencies it carries, or raises on failure.

    Response shape is {"base": "INR", "rates": {"USD": 0.0105, ...}} — same inversion as above.
    """
    payload = _fetch_json(FRANKFURTER_URL)
    inr_to_foreign = payload['rates']
    return {
        code.upper(): 1 / rate
        for code, rate in inr_to_foreign.items()
        if rate
    }, 'frankfurter'


def fetch_reference_rates(codes):
    """Fetch INR reference rates for the given currency codes.

    Tries exchangerate-api first, then fawazahmed0 for whatever's still missing, then Frankfurter
    for whatever's still missing after that. Returns {code: (inr_rate, source)}. Never raises — a
    total outage across every provider returns an empty dict, and the caller logs/reports that.
    """
    codes = {c.upper() for c in codes}
    results = {}

    try:
        rates, source = fetch_exchangerateapi()
        for code in codes & rates.keys():
            results[code] = (rates[code], source)
    except (RuntimeError, urllib.error.URLError, TimeoutError, KeyError, ValueError) as exc:
        # Routine, not an error, until EXCHANGERATE_API_KEY is set — logged at info so a blank
        # key doesn't read as a production incident before the key has even been provisioned.
        logger.info('Primary reference-rate provider (exchangerate-api) unavailable: %s', exc)

    missing = codes - results.keys()
    if missing:
        try:
            rates, source = fetch_fawazahmed0()
            for code in missing & rates.keys():
                results[code] = (rates[code], source)
        except RuntimeError as exc:
            logger.error('Secondary reference-rate provider (fawazahmed0) failed: %s', exc)

    missing = codes - results.keys()
    if missing:
        try:
            rates, source = fetch_frankfurter()
            for code in missing & rates.keys():
                results[code] = (rates[code], source)
        except (urllib.error.URLError, TimeoutError, KeyError, ValueError) as exc:
            logger.warning('Tertiary reference-rate provider (Frankfurter) also failed: %s', exc)

    return results
