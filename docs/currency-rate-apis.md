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

**Second revision, production setup: `exchangerate-api.com` promoted to primary.** By explicit
choice, once production readiness mattered more than staying keyless: exchangerate-api.com is a
real vendor (dashboard, quota alerts, SLA) rather than a single maintainer's free CDN. Free tier is
1,500 requests/month, 161 currencies (covers the whole board, Gulf currencies included — verified
live against the real endpoint), daily updates; our actual usage is ~60 requests/month from the
daily cron plus occasional manual fetches, comfortably inside the free tier. Requires
`EXCHANGERATE_API_KEY` (get one at exchangerate-api.com; blank in an environment without a key
skips straight to the fallback below, no error). Its terms permit caching for internal use like
ours but prohibit redistributing the data or using it to offer "programmatic or automatic access to
exchange rates" — `ReferenceRate` stays admin-only with no public serializer, which already
satisfies this.

**`fawazahmed0/exchange-api` is now the fallback**, not the primary — same free/keyless full-board
coverage, used automatically if the key is missing, revoked, or the free quota is somehow exceeded.
Frankfurter remains the last-resort provider, tried only for whatever's still missing after both of
the above.

**Third revision: the fetch functions moved to their own app, `fx_providers`, and which provider is
primary became a staff-editable setting instead of a fixed order in code.** `fx_providers` knows
nothing about currency boards or margins — just `fetch_exchangerateapi()` / `fetch_fawazahmed0()` /
`fetch_frankfurter()` and `fetch_with_fallback(codes, primary=...)`, so a future feature needing an
INR rate for something other than the reference-rate guard can reuse it without depending on
`reference_rates`. `ReferenceRateSettings.primary_provider` (editable on the same "Reference rates &
margins" admin screen as the margins) picks which one goes first; the other two are tried, in
`fx_providers.DEFAULT_ORDER`, for whatever the primary doesn't cover. See
`backend/fx_providers/providers.py` for the exact order and `backend/reference_rates/services.py`
for how the chosen primary reaches the fetch call.

---

## Read this first: market rates are not our rates

This matters more than any API choice.

Reddy Forex is an RBI-authorised money changer. **The buy and sell rates on our board are our own
commercial rates**, set at the counter, including our margin. Every API below returns *reference*
or *mid-market* rates — the midpoint banks quote each other, which no retail customer anywhere
gets.

So the default we ship with is:

> **An API's rate must never silently become the public rate.**

Piping a mid-market rate onto the board unchanged would advertise a rate the business doesn't
actually offer — a compliance and consumer-protection problem, not a rounding error, and it
collides with the content rule in `CLAUDE.md`: everything published must be something the business
can stand behind.

**Update, after building this (see "What got built" below):** by explicit request, the app *does*
support auto-setting `buy_rate`/`sell_rate` from the fetched market rate — but only when a staff
member turns it on (`ReferenceRateSettings.auto_update_enabled`, off by default), and only using a
margin that same staff member sets (`buy_margin`/`sell_margin`), applied identically to every
currency on the board. Nothing is ever published off a formula the desk didn't configure. Left off
— the default — every currency's rates stay 100% hand-entered, exactly as before.

The existing architecture already said the underlying shape, in `README.md`:

> *If external data is ever pulled in (news, ECB reference rates), the correct shape is ingest on a
> schedule → store locally → serve from your own DB — never call a third party during page render.*

That still holds: the fetch never happens during a request, whether triggered by the schedule or by
the manual admin action.

### What external rates are genuinely good for

| Use | Worth doing? | Why |
|---|---|---|
| **Typo guard on rate entry** | ⭐ **Strongest case** | Staff type rates by hand into `list_editable`. If someone enters `8.30` instead of `83.00`, nothing currently catches it — and a push alert fires to every subscriber announcing it. The admin's "Market ref" column flags a large divergence in red without blocking the save. |
| **Pre-fill a suggested rate** | Good | Staff open the admin and see "market ref: 83.4 (2h ago)" next to the field they're editing. |
| **Internal margin visibility** | Good | Show the desk how far our rate sits from market. Purely an internal number. |
| **Auto-setting buy/sell rate** | ⚠️ **Opt-in, staff-controlled** | Built as one global `ReferenceRateSettings.auto_update_enabled` + staff-set margins, off by default, applied to every currency alike. See below. |
| **A "market comparison" shown to customers** | Careful | Technically possible, but invites "why is your rate worse?" and needs a clear explanation of what a money changer's spread covers. A business decision, not a technical one — not built. |

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

Implemented in a dedicated `reference_rates` Django app:

1. **`ReferenceRate`**, its own model. Stores the fetched market rate per currency code, with its
   source and fetch time.
2. **`ReferenceRateSettings`, a singleton** (same `pk=1` pattern as `content.SiteSetting`) holding
   **one global config, applied to every currency alike**: `primary_provider` (which of
   `fx_providers`' three fetchers goes first), `auto_update_enabled`, `buy_margin`, `sell_margin`.
   There's deliberately no per-currency override — one desk-set config for the whole board,
   configured in one place.
3. **Its own admin surface, not a sub-page of `rates.CurrencyAdmin`.** `ReferenceRateSettingsAdmin`
   is registered in `reference_rates/admin.py` and fully overrides `changelist_view()` — Django's
   default add/change list for this model is replaced with one combined screen: the margin form,
   and, on the same page after saving, a table of the result. `rates.CurrencyAdmin` only keeps a
   "Reference rates & margins" *link* to it (`/admin/reference_rates/referenceratesettings/`), not
   any of the logic — moving that logic here means the Currency app doesn't need to know how
   reference rates work at all, only that this button exists.
4. **One shared entry point, three triggers.** `reference_rates/services.py::refresh_reference_rates()`
   does the fetch-store-apply work; the scheduled command, the manual admin action, and the settings
   page all call it, so any of the three always do exactly the same thing.
   - **Scheduled**: `python manage.py fetch_reference_rates`, once every 24h via a Render Cron Job
     (see below). Never runs during a request.
   - **Manual, quick**: a "Fetch reference rates now" action in the Currency admin's action
     dropdown — fetches with whatever margin is already saved, no screen change.
   - **Manual, with margin changes**: the **"Reference rates & margins" button** on the Currency
     changelist (`/admin/rates/currency/`) opens `/admin/reference_rates/referenceratesettings/`,
     with the provider picker, the auto-update toggle, and the two margin fields. Submitting it
     saves the settings, fetches the real market rate, and — on that same page — shows a table
     of the result: each
     currency's fetched market rate next to the buy/sell rate calculated from it
     (`market rate + margin`). One screen for the whole loop: configure, fetch, see the result.
4. **Auto-apply is opt-in and staff-configured, globally.** `ReferenceRateSettings.auto_update_enabled`
   defaults to **off** — until a staff member switches it on, `buy_rate`/`sell_rate` stay exactly as
   hand-entered, unaffected by this app entirely. Once on, every fetch (any of the three triggers)
   recalculates, for *every* currency:
   - `sell_rate = market_rate + sell_margin`
   - `buy_rate = market_rate + buy_margin`

   e.g. `sell_margin = 1.00`, `buy_margin = -1.00` sells ₹1 above and buys ₹1 below the fetched
   market rate, for the whole board at once. The desk sets both numbers on the settings screen;
   nothing is hardcoded.
5. **Currencies always still get the guard, whether or not auto-apply is on.** The read-only
   "Market ref" column on `CurrencyAdmin` shows every currency's latest reference rate, its age, and
   % divergence from `sell_rate` — colored red past `REFERENCE_RATE_DIVERGENCE_WARN_PCT` (default
   5%). This column never blocks a save; it's informational when auto-apply is off and a sanity
   check when it's on.
6. **Fails silently and visibly.** If both providers are down, `refresh_reference_rates()` reports
   `ok: False` and touches nothing — existing `ReferenceRate` rows and every `Currency` row are left
   as they were. The command exits non-zero (so a cron dashboard can flag it) and the admin surfaces
   a red error message. Same discipline as the notification apps: an external dependency must never
   be able to take the site, or a save, down.

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
