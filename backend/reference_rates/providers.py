"""Fetch logic for third-party reference rates.

Kept dependency-free (stdlib urllib, like backend/scripts/check_rate_apis.py) rather than adding
`requests` for what is one scheduled call a day.

Provider order and the reasoning are in docs/currency-rate-apis.md ("Verified findings"):
fawazahmed0/exchange-api is primary because it's the only free/keyless option that actually covers
every currency on our board (Frankfurter's ECB dataset misses AED, SAR, QAR). Frankfurter is kept as
a secondary cross-check for the currencies it does cover.
"""
import json
import logging
import urllib.error
import urllib.request

logger = logging.getLogger(__name__)

TIMEOUT = 15

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

    Tries fawazahmed0 first (full board coverage); falls back to Frankfurter for whatever it can
    still cover if fawazahmed0 is entirely down. Returns {code: (inr_rate, source)}. Never raises —
    a total outage across both providers returns an empty dict, and the caller logs/reports that.
    """
    codes = {c.upper() for c in codes}
    results = {}

    try:
        rates, source = fetch_fawazahmed0()
        for code in codes & rates.keys():
            results[code] = (rates[code], source)
    except RuntimeError as exc:
        logger.error('Primary reference-rate provider failed: %s', exc)

    missing = codes - results.keys()
    if missing:
        try:
            rates, source = fetch_frankfurter()
            for code in missing & rates.keys():
                results[code] = (rates[code], source)
        except (urllib.error.URLError, TimeoutError, KeyError, ValueError) as exc:
            logger.warning('Secondary reference-rate provider (Frankfurter) also failed: %s', exc)

    return results
