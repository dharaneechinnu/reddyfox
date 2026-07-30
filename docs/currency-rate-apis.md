# Currency rate APIs: research and recommendation

Researched **July 2026**. Prices, limits and currency coverage change — re-verify before acting on
anything here.

> **How solid is this?** Everything below comes from vendor documentation, project READMEs and
> search results. It was **not** possible to call these endpoints from the environment this
> research was done in — outbound requests to them are blocked by network policy (HTTP 403 at the
> proxy). So treat the shapes and claims as *documented*, not *verified*. Run
> `backend/scripts/check_rate_apis.py` (added alongside this doc) from a machine with normal
> internet to confirm each one before you rely on it.

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

## If we build this: the recommended shape

Deliberately conservative, and consistent with how this codebase already works.

1. **A management command, run on a schedule** — `python manage.py fetch_reference_rates`. Not a
   call during page render. Render Cron or a simple daily job.
2. **Store into a new `ReferenceRate` model**, *separate from* `Currency`. Never write to
   `Currency.buy_rate` / `sell_rate` — those stay staff-owned. This separation is the whole
   safeguard.
3. **Surface it in the admin as guidance**: next to each currency, "market ref: 83.42 (2h ago)".
4. **Warn, don't block, on divergence.** If a staff-entered rate is more than N% from the reference,
   show a warning on save. Blocking would be wrong — there are legitimate reasons for a wide spread,
   and the desk must stay in charge of its own pricing.
5. **Fail silently and visibly.** If the fetch fails, the board keeps working on the last
   staff-entered rates, and the admin shows the reference as stale. Same discipline as the
   notification code: an external dependency must never be able to take the site down.

Rough size: one model, one management command, one migration, an admin readonly field, and the
divergence check. Comparable to the priority-ordering work.

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

## Sources

- [Frankfurter](https://frankfurter.dev/) · [repo](https://github.com/lineofflight/frankfurter) · [deploy guide](https://frankfurter.dev/deploy/)
- [fawazahmed0/exchange-api](https://github.com/fawazahmed0/exchange-api) (note the migration from `currency-api`)
- [ExchangeRate-API open endpoint](https://open.er-api.com/v6/latest/USD)
- [ECB euro reference rates](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html)
- [FBIL](https://www.fbil.org.in/) — official INR benchmark publisher since 10 July 2018
- [RBI reference rate background](https://ies.gov.in/arthapedia/concept/rbi-reference-exchange-rate)
