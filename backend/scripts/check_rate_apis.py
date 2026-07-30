#!/usr/bin/env python3
"""
Check which currency-rate APIs actually work, and whether each covers the
currencies on our board.

Written because the research in docs/currency-rate-apis.md could not be
verified from the environment it was done in — outbound calls to these hosts
were blocked. Run this from a machine with normal internet before relying on
anything in that document. In particular it settles two open questions:

  1. How many currencies Frankfurter really exposes (sources disagree:
     ~30 vs 201).
  2. Whether the Gulf currencies we deal in (AED, SAR, QAR) are available at
     all — an ECB-only dataset probably does not carry them.

No dependencies beyond the standard library, and no Django needed:

    python backend/scripts/check_rate_apis.py
"""
import json
import sys
import urllib.error
import urllib.request

TIMEOUT = 20

# The board as seeded by rates/management/commands/seed_rates.py. Whatever an
# API cannot supply is a currency the desk would still have to handle by hand.
OUR_CURRENCIES = [
    'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'CHF', 'JPY', 'SGD',
    'AED', 'SAR', 'QAR', 'HKD', 'MYR', 'THB', 'CNY', 'NZD',
]

GREEN, RED, YELLOW, DIM, RESET = '\033[32m', '\033[31m', '\033[33m', '\033[2m', '\033[0m'


def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'reddyforex-rate-check/1.0'})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        return json.loads(resp.read().decode())


def report_coverage(rates, base):
    """Print which of our board currencies this source can supply."""
    available = {c.upper() for c in rates}
    # The base itself is trivially covered but never appears in its own list.
    available.add(base.upper())

    have = [c for c in OUR_CURRENCIES if c in available]
    missing = [c for c in OUR_CURRENCIES if c not in available]

    print(f'  total currencies : {len(rates)}')
    print(f'  {GREEN}covers{RESET}           : {", ".join(have) or "none"}')
    if missing:
        print(f'  {RED}MISSING{RESET}          : {", ".join(missing)}')
    else:
        print(f'  {GREEN}covers our whole board{RESET}')
    return missing


def check(name, url, extract, note=''):
    print(f'\n{"=" * 66}\n{name}\n{DIM}{url}{RESET}')
    if note:
        print(f'  {YELLOW}note{RESET}: {note}')
    try:
        payload = fetch(url)
    except urllib.error.HTTPError as e:
        print(f'  {RED}HTTP {e.code}{RESET} — {e.reason}')
        return
    except Exception as e:                                   # noqa: BLE001
        print(f'  {RED}FAILED{RESET} — {type(e).__name__}: {e}')
        return

    try:
        base, rates, meta = extract(payload)
    except Exception as e:                                   # noqa: BLE001
        print(f'  {RED}unexpected response shape{RESET} — {type(e).__name__}: {e}')
        print(f'  {DIM}{json.dumps(payload)[:200]}{RESET}')
        return

    print(f'  {GREEN}OK{RESET}  base={base}  {meta}')
    report_coverage(rates, base)

    # The number that matters to the shop: what one unit is worth in rupees.
    inr = rates.get('INR') or rates.get('inr')
    if inr:
        print(f'  {GREEN}1 {base} = {inr} INR{RESET}')
    else:
        print(f'  {YELLOW}no INR in this response{RESET}')


def main():
    print('Checking currency-rate APIs against the Reddy Forex board.')
    print(f'Board currencies: {", ".join(OUR_CURRENCIES)}')

    check(
        '1. Frankfurter (ECB-backed, open source, self-hostable)',
        'https://api.frankfurter.dev/v1/latest?base=USD',
        lambda p: (p['base'], p['rates'], f"date={p.get('date')}"),
        note='settles the ~30 vs 201 currency-count discrepancy in the docs',
    )

    check(
        '2. fawazahmed0/exchange-api (jsDelivr CDN, 200+ currencies)',
        'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
        lambda p: ('USD', {k.upper(): v for k, v in p['usd'].items()}, f"date={p.get('date')}"),
        note='repo moved from currency-api to exchange-api — verify this URL is still current',
    )

    check(
        '3. open.er-api.com (ExchangeRate-API open access)',
        'https://open.er-api.com/v6/latest/USD',
        lambda p: (p['base_code'], p['rates'], f"updated={p.get('time_last_update_utc')}"),
    )

    check(
        '4. Frankfurter, INR base (what the shop actually thinks in)',
        'https://api.frankfurter.dev/v1/latest?base=INR',
        lambda p: (p['base'], p['rates'], f"date={p.get('date')}"),
    )

    print(f'\n{"=" * 66}')
    print('Reminder: these are REFERENCE / mid-market rates.')
    print('They are NOT our counter rates and must never be published as such.')
    print('See docs/currency-rate-apis.md.')


if __name__ == '__main__':
    sys.exit(main())
