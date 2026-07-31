# Currency rate APIs: research and recommendation

Researched **July 2026**. Prices, limits and currency coverage change — re-verify before acting on
anything here.

> **How solid is this?** The section below was written from vendor documentation with no outbound
> access to verify it. It has since been **verified live** — see "Verified findings" — which
> changed the recommendation. Read that section first; the rest is kept for the reasoning.

---

## Verified findings (`backend/scripts/check_rate_apis.py`, run 2026-07-31)

Running the script settled both open questions from the original research:

| | Frankfurter | fawazahmed0/exchange-api | open.er-api.com |
|---|---|---|---|
| Currencies returned | **29** (confirms the smaller figure) | 339 | 166 |
| Covers our board (16 currencies) | **No — missing AED, SAR, QAR** | Yes, all 16 | Yes, all 16 |
| 1 USD = ? INR (same day) | 95.69 | 95.65 | 95.69 |

**This changes the recommendation.** Frankfurter's ECB-only dataset does not include the Gulf
currencies (AED, SAR, QAR) that are a real part of this board — self-hostability doesn't help if a
third of the board falls back to no reference at all. For the actual use case here (a typo guard
and a suggested value on *every* currency the desk prices), coverage matters more than
self-hosting.

**Revised recommendation: `fawazahmed0/exchange-api`, primary.** Free, no key, covers the whole
board, and one request (`GET .../v1/currencies/inr.json`) returns every rate needed in a single
call — the app inverts `INR→currency` to get the `currency→INR` figure the board is priced in.
Not self-hostable, so the implementation below treats a fetch failure as expected/routine (log and
keep the last known value) rather than something to alert on.

Frankfurter is kept in the code as a secondary/cross-check provider for the ~13 currencies it does
cover, since a second independent source is a stronger typo guard than one — but it is not the
primary, and nothing here waits on it.

---

## Read this first: market rates are not our rates

This matters more than any API choice.

Reddy Forex is an RBI-authorised money changer. **The buy and sell rates on our board are our own
commercial rates**, set at the counter, including our margin. Every API below returns *reference*
or *mid-market* rates — the midpoint banks quote each other, which no retail customer anywhere
gets.

So there is one thing we must never do:

> **Do not pipe an API's rate straight onto the public rate board.**

Doing so would advertise a rate the business does not actually offer. For a regulated financial
business that is a compliance and consumer-protection problem, not a rounding error — and it
collides directly with the content rule in `CLAUDE.md`: everything published must be something the
business can stand behind.

The existing architecture already says the same thing, in `README.md`:

> *If external data is ever pulled in (news, ECB reference rates), the correct shape is ingest on a
> schedule → store locally → serve from your own DB — never call a third party during page render.*

### What external rates are genuinely good for

| Use | Worth doing? | Why |
|---|---|---|
| **Typo guard on rate entry** | ⭐ **Strongest case** | Staff type rates by hand into `list_editable`. If someone enters `8.30` instead of `83.00`, nothing currently catches it — and a push alert fires to every subscriber announcing it. Comparing against a market reference and warning on a large divergence would catch that before it goes out. |
| **Pre-fill a suggested rate** | Good | Staff open the admin and see "market is ~83.4 today" next to the field, then set the counter rate from it. Speeds up the daily task without ever auto-publishing. |
| **Internal margin visibility** | Good | Show the desk how far our rate sits from market. Purely an internal number. |
| **Auto-setting the public board** | ❌ **No** | See above. |
| **A "market comparison" shown to customers** | Careful | Technically possible, but invites "why is your rate worse?" and needs a clear explanation of what a money changer's spread covers. A business decision, not a technical one. |

---

## The India-specific piece (commonly got wrong)

**The official INR reference rate is published by FBIL, not the RBI.**

Financial Benchmarks India Pvt. Ltd. (FBIL) took over computation and dissemination of the USD/INR
reference rate — and other major currency rates against the rupee — from the RBI with effect from
**10 July 2018**. Rates are published every weekday, excluding Saturdays, Sundays and Mumbai bank
holidays.

That reference rate is used for settling exchange-traded currency futures and options, for corporate
transfer pricing, and for the Government of India's forex transactions through the RBI.

Two consequences for us:

1. If we ever need an *authoritative Indian* figure — for a dispute, an audit, or an internal
   benchmark — **FBIL is the source**, not a third-party API mirroring ECB data.
2. None of the open-source APIs below are FBIL. They are ECB-derived or aggregated. Good enough for
   a sanity check; not the number to cite in a regulatory context.

---

## The options

### 1. Frankfurter — recommended

Open source, no API key, no signup, self-hostable.

| | |
|---|---|
| **Source data** | European Central Bank reference rates |
| **Cost** | Free |
| **API key** | None |
| **Self-host** | Yes — Docker image, Postgres backing store |
| **Repo** | `lineofflight/frankfurter` |
| **Site** | `frankfurter.dev` |

```
GET https://api.frankfurter.dev/v1/latest?base=USD&symbols=INR,EUR,GBP
GET https://api.frankfurter.dev/v1/2026-07-29?base=EUR&symbols=INR
```

**Why it's the recommendation:** self-hosting is the deciding factor. Every other free option is
someone else's uptime. `docker run` with a Postgres URL gives a rate service we control, which fits
the "own database is the source of truth" rule this project already follows. If it goes down, that's
our incident to fix rather than an outage we can only wait out.

**⚠️ Unresolved discrepancy in the sources.** One source describes Frankfurter as tracking **~30
currencies** from ECB reference rates; another claims **201 currencies from 84 central banks back to
1948**. These cannot both describe the same dataset, and I could not call the API to settle it.
ECB's own reference set has historically been ~30 currencies, which makes the smaller figure more
plausible — but **check `https://frankfurter.dev/currencies/` before assuming a currency we deal in
is covered.** Several of our board currencies (AED, SAR, QAR, HKD) are the ones most likely to be
missing from an ECB-only set.

**Update cadence:** ECB publishes once per business day, around 16:00 CET. There is no intraday
movement and nothing on weekends or ECB holidays. Fine for a daily counter rate; useless for
anything trading-like.

### 2. fawazahmed0 exchange-api — widest coverage

| | |
|---|---|
| **Coverage** | 200+ currencies, plus crypto and metals |
| **Cost** | Free, no key, served over jsDelivr CDN |
| **Rate limits** | None advertised |
| **Update** | Daily |

```
GET https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json
```

**⚠️ The repo moved.** `fawazahmed0/currency-api` → `fawazahmed0/exchange-api`, and there is a
`MIGRATION.md` in the new repo. Tutorials and older answers still cite the old paths. Start from
`fawazahmed0/exchange-api` and follow the current README, or you will wire up a deprecated URL.

**Trade-off:** far better currency coverage than an ECB-only set, likely including the Gulf
currencies we actually deal in. But it is a single maintainer publishing through a public CDN — no
SLA, no support, and not self-hostable in the way Frankfurter is. Good as a **secondary source** or
a cross-check; riskier as the only one.

### 3. open.er-api.com (ExchangeRate-API open access)

Free open endpoint, no key, ~160 currencies, documented daily refresh, and the response carries
`time_next_update_utc` so a scheduler knows when to come back.

```
GET https://open.er-api.com/v6/latest/USD
```

Not open source — it is a commercial product's free tier. Usable, but the vendor can change terms,
which is exactly the risk self-hosting Frankfurter avoids.

### 4. ECB XML feed direct

The upstream Frankfurter wraps. No dependency on anyone's API layer at all, at the cost of parsing
XML and handling the ECB's own quirks yourself.

```
https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml
```

Worth knowing about as the ultimate fallback: if every wrapper disappears, this is still there.

### Not recommended for us

- **Fixer.io / exchangeratesapi.io** — freemium with hard call caps and key management; the free
  tiers historically restricted base currency to EUR, which is awkward when everything we do is
  INR-denominated.
- **Anything requiring a paid key at this volume.** We need one number per currency per day. Paying
  for a real-time feed would be buying precision the business model does not use.

---

## Comparison

| | Frankfurter | fawazahmed0 | open.er-api | ECB direct |
|---|---|---|---|---|
| Open source | ✅ | ✅ | ❌ | n/a (public data) |
| Self-hostable | ✅ | ⚠️ static files | ❌ | n/a |
| API key | None | None | None | None |
| Currency count | ~30 *(disputed — verify)* | 200+ | ~160 | ~30 |
| INR supported | ✅ | ✅ | ✅ | ✅ |
| Gulf currencies (AED/SAR/QAR) | ⚠️ verify | ✅ likely | ✅ likely | ❌ unlikely |
| Update frequency | Daily (ECB) | Daily | Daily | Daily |
| Historical data | ✅ | ✅ | Limited | ✅ |
| Single point of failure | No (self-host) | Yes | Yes | Yes |

---

## Built: `reference_rates` app

This shape is implemented, in a dedicated `reference_rates` Django app — deliberately conservative,
and consistent with how this codebase already works:

1. **A management command, run on a schedule** — `python manage.py fetch_reference_rates`. Not a
   call during page render. See `docs/team-notifications.md`-style deployment notes below for the
   Render Cron Job.
2. **Stores into `ReferenceRate`**, its own model in its own app — *separate from* `rates.Currency`.
   Nothing ever writes to `Currency.buy_rate` / `sell_rate`; those stay staff-owned. This separation
   is the whole safeguard.
3. **Surfaced in the admin as guidance**: a read-only "Market ref" column on `CurrencyAdmin` shows
   the latest reference rate, its age, and % divergence from our sell rate.
4. **Warns, never blocks, on divergence.** Divergence beyond `REFERENCE_RATE_DIVERGENCE_WARN_PCT`
   (default 5%) renders in red in the admin list. Saving is never prevented — there are legitimate
   reasons for a wide spread, and the desk stays in charge of its own pricing.
5. **Fails silently and visibly.** A fetch failure is logged and the command exits non-zero (so a
   cron dashboard can flag it); the board keeps working off the last staff-entered rates, and the
   admin column shows the reference as stale by its age. Same discipline as the notification apps:
   an external dependency must never be able to take the site, or a save, down.

See `backend/reference_rates/` and its app-level notes for the provider/fallback details and the
production cron setup.

---

## Verifying this research

`backend/scripts/check_rate_apis.py` calls each API, prints what comes back, and reports which of
*our* board currencies each one actually covers. Run it from a machine with normal internet:

```bash
python backend/scripts/check_rate_apis.py
```

It settles the Frankfurter currency-count discrepancy and tells you whether AED, SAR, QAR and HKD
are available before any of this gets built.

---

## Running it in production: Render Cron Job

`fetch_reference_rates` is a management command, not a web process — it has no route and nothing
calls it during a request. On Render, wire it up as a **Cron Job**, a separate service type from
the web service:

1. Render dashboard → New → Cron Job, pointed at the same repo/branch as the web service.
2. **Build command:** `pip install -r backend/requirements.txt`
3. **Command:** `cd backend && python manage.py fetch_reference_rates`
4. **Schedule:** once a day is enough — every source here refreshes daily, so anything tighter
   just spends the free instance's minutes for no new data. `0 3 * * *` (03:00 UTC = 08:30 IST,
   before the desk opens) is a reasonable default.
5. **Environment:** same `DATABASE_URL` as the web service (same Postgres instance) — the cron job
   needs to write to `ReferenceRate` in the same database the admin reads from. It does not need
   `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, or any of the web-only settings.

A missed or failed run is never an outage: the admin's "Market ref" column shows the age of the
last successful fetch and marks it stale past `REFERENCE_RATE_STALE_AFTER_HOURS`, and the rate
board itself never reads this table at all. Render's own Cron Job run history is the place to
notice a run is failing repeatedly (the command exits 1 when both providers are down).

Locally / in any environment without a scheduler, running the command by hand is exactly the same:

```bash
python manage.py fetch_reference_rates
```

---

## Sources

- [Frankfurter](https://frankfurter.dev/) · [repo](https://github.com/lineofflight/frankfurter) · [deploy guide](https://frankfurter.dev/deploy/)
- [fawazahmed0/exchange-api](https://github.com/fawazahmed0/exchange-api) (note the migration from `currency-api`)
- [ExchangeRate-API open endpoint](https://open.er-api.com/v6/latest/USD)
- [ECB euro reference rates](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html)
- [FBIL](https://www.fbil.org.in/) — official INR benchmark publisher since 10 July 2018
- [RBI reference rate background](https://ies.gov.in/arthapedia/concept/rbi-reference-exchange-rate)
