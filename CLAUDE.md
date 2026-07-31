# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project purpose

The public website for **Reddy Forex Private Limited**, an RBI-authorised money changer with a single shop in T. Nagar, Chennai. React frontend + Django/PostgreSQL backend. Every piece of site content (rates, testimonials, FAQs) is edited by non-technical staff through the Django admin — there is no CMS, no separate content editor UI, and the public API is entirely read-only.

**Content rule (non-negotiable):** never invent a fact — a licence number, certification, branch count, rating, or executive name. Everything published must trace back to `frontend/src/company.js` / `frontend/src/data.js` or the database (edited via `/admin/`). This is a regulated financial business; an unverifiable claim is a legal risk, not just a copywriting shortcut. An earlier draft of this redesign shipped a fabricated RBI licence number, invented certifications, a fake branch count and fictional executives — all of it had to be ripped out. Don't repeat that.

## Commands

### Backend (`backend/`)

```bash
python -m venv venv && source venv/bin/activate   # venv\Scripts\activate on Windows
pip install -r requirements.txt

cp .env.example .env        # set DB_PASSWORD to match local Postgres
createdb foxexchange         # once, via psql/pgAdmin

python manage.py migrate
python manage.py seed_rates          # sample currency board
python manage.py seed_content        # real testimonials + FAQs (--replace wipes existing rows first)
python manage.py setup_teams         # creates/syncs the staff permission groups (see Architecture)
python manage.py fetch_reference_rates  # optional: pull market FX rates for the admin's typo guard
python manage.py createsuperuser
python manage.py runserver 0.0.0.0:8000   # 0.0.0.0 so a phone on the same WiFi can reach it
```

Run the whole backend test suite:

```bash
python manage.py test
```

Run one app's tests, or a single test:

```bash
python manage.py test notifications
python manage.py test notifications.tests.SendNotificationTests
python manage.py test notifications.tests.SendNotificationTests.test_urgent_bypasses_rate_limit
```

Other useful checks:

```bash
python manage.py check                      # system checks (also catches admin misconfiguration)
python manage.py makemigrations --check --dry-run   # fails if a model change is missing its migration
```

### Frontend (`frontend/`)

```bash
npm install
npm run dev       # Vite dev server; host: true, so it's also reachable on your LAN IP
npm run build
npm run lint      # oxlint — the only linter configured; there is no separate formatter
```

There is no frontend test runner configured (no Jest/Vitest) — `npm run lint` and `npm run build` are the only automated checks. Verify UI changes by running the dev server.

**Testing on a phone:** set `VITE_API_BASE_URL` (frontend `.env`) to the machine's LAN IP, not `localhost` — on a phone that resolves to the phone itself. Add that IP to `ALLOWED_HOSTS` and the frontend origin to `CORS_ALLOWED_ORIGINS` in the backend `.env`.

## Architecture

```
                       staff
                         │
                   /admin/  (Django admin — the only place content is edited)
                         │
                    PostgreSQL
                         │
              DRF read-only API  (/api/…)
                         │
              React SPA (fetches on mount, no caching layer)
```

### Backend: Django apps

- **`rates`** — `Currency` model: buy/sell rate, 24h change, region, `is_popular`, `is_visible`, `display_order`. Read-only `CurrencyViewSet` at `/api/rates/`.
- **`content`** — testimonials, FAQs, and the lead-capture system (see below). Also `SiteSetting`, a singleton row (`pk=1` enforced in `save()`) holding the customer-facing WhatsApp option and per-lead-type notification email overrides.
- **`notifications`** — Chrome push alerts to *customers* about currency rate changes, via Firebase Cloud Messaging. Independent of `content`'s email alerts.
- **`feature_flags`** — gates for rolling out site sections (e.g. the rates page/live board) without a deploy.
- **`reference_rates`** — third-party mid-market FX rates (`ReferenceRate`), fetched from `fawazahmed0/exchange-api` (primary — free, no key, covers every currency on our board) with Frankfurter as a secondary cross-check (its ECB-only dataset misses AED/SAR/QAR, which ruled it out as primary despite being self-hostable). `reference_rates.services.refresh_reference_rates()` is the single entry point — called by the scheduled `fetch_reference_rates` management command (a Render Cron Job in production, once/24h), by a "Fetch reference rates now" admin action on `rates.CurrencyAdmin`, and by this app's own admin screen at `/admin/reference_rates/referenceratesettings/` — so all three do the same thing. It always writes `ReferenceRate`, and surfaces a read-only "Market ref" column on `CurrencyAdmin` (a typo guard, red past `REFERENCE_RATE_DIVERGENCE_WARN_PCT`, never blocks a save). **Auto-applying to `Currency.buy_rate`/`sell_rate` is opt-in and global** — `ReferenceRateSettings` is a `content.SiteSetting`-style singleton (`auto_update_enabled`, default off, plus one `buy_margin`/`sell_margin` pair applied identically to every currency, no per-currency override). `ReferenceRateSettingsAdmin` fully overrides `changelist_view()` to be one combined screen — the settings form, and, after "Save & fetch now," a table right below it showing each currency's fetched market rate next to the buy/sell rate calculated from it — entirely owned by this app; `rates.CurrencyAdmin` only holds a link button to it, none of the logic. Read `docs/currency-rate-apis.md` before touching this app — it also covers why an unmodified market rate must never be the published one.

### Who leads are *for* — the thing to keep in mind

Every lead form on the site (enquiry, quote, rate lock) exists to put a customer's **phone number in front of a dealer**, so a person at the T. Nagar counter can ring them back. Nothing is sold online. The customer-facing confirmation is a courtesy; the product is the alert to the desk.

That reframes what "done" means for anything in this area: the measure is **how few minutes pass between submission and callback**, not how good the success screen looks. Rate locks are the sharpest case — `SiteSetting.rate_lock_hours` is a promise with a deadline, so a lock the desk sees late is worse than useless. See `docs/team-notifications.md` for the reasoning, what's built, and the costed options for getting louder.

### The `Lead` model: one table, three admin-facing identities

`content.models.Lead` backs the contact form, "get a quote", and "lock this rate" — three different customer requests that share ~80% of their fields (who the customer is, workflow state, audit trail). Rather than duplicating that, there's one concrete table and three **proxy models** (`Enquiry`, `QuoteRequest`, `RateLock`), each:

- filtered to its own `Lead.Kind` via a `KindManager`,
- forced to that kind in an overridden `save()`,
- registered separately in `content/admin.py` so each shows its own admin list, its own columns, and (via `setup_teams`) its own permissions.

**If you add a fourth lead type**, add a `Lead.Kind` choice, a proxy model + `KindManager`, a serializer/view pair (mirroring `EnquiryCreateSerializer`/`EnquiryCreateView`), and an admin registration — don't create a new top-level model for it.

Signals in other apps that need to react to *one specific* lead kind (not all `Lead` saves) must connect on the proxy class, not `Lead` itself — Django sends `post_save` with `sender` set to whichever proxy class actually called `.save()`.

### Staff permissions: groups, not custom roles

`content/management/commands/setup_teams.py` defines named groups (`Rates desk`, `Quotes desk`, `Front office`, `Manager`) and syncs Django model permissions onto them. There's no custom permission/dashboard code — Django admin already hides any model a user lacks permission for, so group membership alone produces a different admin per role. Re-running the command is safe and intended: it's the source of truth, so adding a model to a team means editing `TEAMS` in that file and re-running it.

### The pattern every content model follows

- **`is_visible`** — hide something from the site without deleting it; every public API queryset filters on it.
- **`display_order`** — lower numbers first; same field name/meaning on `Currency`, `Testimonial`, `Faq`, `FaqCategory`.
- **Read-only API** — every public endpoint is a `ReadOnlyModelViewSet` (or a deliberately create-only view for leads). The website can never write to the database outside of submitting a lead; content changes only happen through an authenticated admin session.

When something currently hardcoded in `frontend/src/data.js` needs to become staff-editable, `Testimonial`/`Faq` are the template: model with `is_visible` + `display_order`, serializer, `ReadOnlyModelViewSet`, register in `content/urls.py`, then swap the static import in the page for a `useApi(...)` call.

### Dual validation: client mirrors server, server is the real gate

`frontend/src/validation.js` and `backend/content/validators.py` implement the *same* phone/email/spam rules independently. The frontend copy is a UX convenience; the backend copy is what actually protects the data, because anyone can `curl` the API directly. **Keep them in step** — a rule change (e.g. loosening the phone regex) needs both files touched.

### Lead-capture forms share one state machine

`frontend/src/hooks/useLeadForm.js` is the shared form logic behind all three lead forms (`EnquiryForm`, `QuoteForm`, `RateLockForm` in `components/`) — validate on blur, clear an error as soon as the field becomes valid while typing, focus the first invalid field on a failed submit, and map server-side field errors back onto the right input (the API re-validates independently and can catch things the client can't, e.g. an unknown currency code). A new lead-type form should reuse this hook rather than reimplementing form state.

Order of operations on every lead submission is deliberate: **save to the database first, then notify** (`content/notifications.py`'s `notify_team`, and separately `notifications.services.send_notification` for the FCM path). A failure in either notification path is caught and logged — it must never lose or block the underlying lead.

### Currency/converter state: one context, one fetch

`frontend/src/context/FxContext.jsx` fetches `/api/rates/` once on mount and derives everything else (converter calculation, favourites, filters, search) from that single `rates` object client-side — there's no per-page refetch. `useFx()` is how every page reads or mutates this state.

### `notifications` app: customer-facing push, not the email alerts

Triggered automatically by a `post_save` signal on `rates.Currency` (see `notifications/signals.py`) whenever `buy_rate`/`sell_rate` changes — including through the rate table's `list_editable` inline admin edit. Priority (`Normal` vs `Urgent`) is based on how far the rate moved (`RATE_ALERT_URGENT_THRESHOLD_PCT`); `Urgent` alerts bypass the per-customer rate limit (`NOTIFICATION_RATE_LIMIT_MINUTES`) entirely. Every send attempt — success, failure, or rate-limit skip — is written as a `NotificationDelivery` row, visible/searchable in `/admin/`.

With `FIREBASE_CREDENTIALS_JSON` unset (the default), subscribers still register and every send is recorded as a logged `FAILED` delivery rather than raising — the same "never let a missing credential break a request" pattern `content/notifications.py`'s email alert already uses. Don't add a `try/except` around calls into this app; the graceful-failure handling is already inside it.

**A note on anything hooked to a `post_save` signal:** an exception raised in a signal receiver rolls back the save that triggered it. So a bug in alert-building code doesn't just lose the alert — it destroys the customer's lead. Keep the "never raises" guarantee at the boundary of the notification code itself (not at each call site), so callers can fire-and-forget. Two real crashes of exactly this kind were fixed in the `team_alerts` work: a customer name long enough to overflow a title column, and a value that was still a `str` rather than a `Decimal` when the signal fired.

### SEO / AI-assistant discoverability

`frontend/src/components/Seo.jsx` sets per-route title/description/canonical/OG tags via `useEffect` (no `react-helmet` dependency). **Important caveat, documented in `docs/seo-and-ai-discoverability.md`:** this is a client-rendered SPA, so those tags only reach crawlers that execute JavaScript — a crawler that doesn't only ever sees the static defaults in `frontend/index.html`. `robots.txt`, `sitemap.xml` and `llms.txt` (in `frontend/public/`) are hand-maintained and must be updated whenever a route is added in `App.jsx`.

### `docs/`

Project documentation beyond this file lives in `docs/` at the repo root (not scattered into `frontend/`/`backend/` READMEs) — see `docs/README.md` for the index. Two are worth reading before starting related work:

- **`team-notifications.md`** — how the desk hears about a lead, why response time is the metric that matters commercially, and a costed comparison of the channels not yet built. Read before adding any notification channel.
- **`product-reference.md`** — dated research on comparable businesses (competitors, industry findings, messaging costs) and a record of ideas consciously parked with the reason. Read before proposing a feature; it may already have been considered and deferred. It is **research only** — never a source of claims to publish, which still must trace to `company.js`/`data.js`.

### Config and deployment

All settings come from environment variables via `python-decouple` (`backend/.env`, gitignored; `.env.example` documents every variable — frontend has its own `.env`/`.env.example` for Vite). Deployed on Render: `DATABASE_URL` (parsed by `dj-database-url`) and `RENDER_EXTERNAL_HOSTNAME` are only set there, `whitenoise` serves static files in production, and `gunicorn` is the app server — all three are harmless no-ops locally. Migrations are the only way the schema changes; there's no hand-editing the database.
