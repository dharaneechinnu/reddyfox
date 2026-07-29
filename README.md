# Reddy Forex Private Limited

React frontend + Django/PostgreSQL backend. All content is edited in the Django admin.

- `frontend/` — Vite + React + React Router. Pure presentation; fetches everything dynamic from the API.
- `backend/` — Django + DRF + PostgreSQL.

## Architecture

```
                       staff
                         │
                   /admin/  (Django admin)
        • Currency rates        • Testimonials
        • Enquiries (inbox)     • FAQs + FAQ categories
                         │
                    PostgreSQL
                         │
              DRF read-only API  (/api/…)
                         │
              React SPA (fetch on load)
```

One admin, one login: everything staff edit lives in the Django admin at
`/admin/`. Rates use Django's editable list grid, so many buy/sell rates can be
changed on one screen and saved at once.

### The pattern every content model follows

Consistency is what makes this maintainable — learn it once, it applies everywhere:

- **`is_visible`** — hide something from the website without deleting it. Nothing is ever destroyed to take it off the site; the API filters on this field.
- **`display_order`** — lower numbers appear first. Same field name and meaning on `Currency`, `Testimonial`, `Faq`, `FaqCategory`.
- **Read-only API.** Every public endpoint is `ReadOnlyModelViewSet`. The website can never write to the database; content changes only ever happen through an authenticated admin. That removes a whole class of security concerns.

`Faq` adds `show_on_homepage`, so the short homepage accordion and the full `/faq` page can differ without duplicating content.

### Industry-standard practices applied here

1. **Own database is the source of truth.** If external data is ever pulled in (news, ECB reference rates), the correct shape is *ingest on a schedule → store locally → serve from your own DB* — never call a third party during page render. A third-party outage, rate limit, or slow response must not be able to take your homepage down or make it slow.
2. **Config via environment, not code.** `python-decouple` + `.env`; `.env` is gitignored, `.env.example` documents every variable. Nothing secret in the repo.
3. **Migrations are the schema history.** Never edit the database by hand; every change is a reviewable migration file.
4. **Seed data as code.** `seed_rates` / `seed_content` management commands make a fresh environment reproducible in one command.
5. **Presentation is separate from content.** Copy lives in the database, layout lives in React. Staff change wording without a deploy; developers change layout without touching copy.

### Content sourcing — important

All site copy is taken from the **live reddyforex.com** (scraped July 2026):
`index.html`, `about-us.html`, `contact.html`, `faq.html`.

- `frontend/src/company.js` — company name, tagline, address, all phone numbers,
  email, vision, mission and the Facebook / X / YouTube profile URLs (all three
  scraped from the live site and verified live). **Single source of truth**:
  never hardcode a phone number, address or social URL in a component.
- `frontend/src/data.js` — services, why-us points, hero/stat figures, nav and
  footer links, compliance statements.
- Database (via `/admin/`) — currency rates, converter fee, testimonials, FAQs.

**Do not invent claims.** The earlier draft of this redesign contained a
fabricated RBI licence number ("AD-II 44/2019"), invented ISO 27001 / FIU-IND /
FEDAI certifications, "24 branches", a "4.8/5 from 2,140 reviews" rating and
four fictional executives. All of it has been removed. This is a regulated money
changer with **one shop** in T. Nagar; unverifiable claims are a legal risk.
If a fact is not on reddyforex.com or given to you by the business, leave it out.

**When to move static content into the database:** when a non-developer needs to
change it, or it changes more than a few times a year. `Testimonial`/`Faq` are the
template to copy — model with `is_visible` + `display_order`, serializer,
`ReadOnlyModelViewSet`, register in `content/urls.py`, then swap the static
import in the React page for a `useApi(...)` call.

## Backend setup

```
cd backend
python -m venv venv
venv\Scripts\activate                # Windows
pip install -r requirements.txt

copy .env.example .env               # then set DB_PASSWORD to match your local Postgres
# create the database once: createdb foxexchange   (or via psql / pgAdmin)

python manage.py migrate
python manage.py seed_rates          # sample currency board
python manage.py seed_content        # real testimonials + FAQs from reddyforex.com
#   ...use --replace to wipe existing content rows first
python manage.py createsuperuser
python manage.py runserver 0.0.0.0:8000
```

Bind to `0.0.0.0` (not the default `127.0.0.1`) if you want to open the site from a phone on the same WiFi.

### Admin

Everything is at **http://localhost:8000/admin/** :

| Section | What you edit |
|---|---|
| Rates → Currencies | Buy/sell rate, 24h change, `is_popular`, `is_visible`, sort order |
| Content → Testimonials | Customer quotes shown on the homepage |
| Content → FAQs | Questions and answers (plain text; blank line = new paragraph) |
| Content → FAQ categories | Sidebar groupings on the `/faq` page |
| Content → Enquiries | The team's inbox of website enquiries (see below) |

### Enquiries — the team's inbox

Website contact-form submissions land in **Content → Enquiries**. It works as a
lead inbox rather than a plain table:

- **Status workflow**: New → Contacted → Quoted → Closed (plus Spam), shown as a
  colour badge. A `New` enquiry older than an hour turns its timestamp red —
  those are the ones losing business.
- **Reply in one tap**: every row and detail page carries a `wa.me` WhatsApp
  deep-link (pre-written greeting), a `tel:` link and a `mailto:` link. No
  WhatsApp Business API, no Meta approval — just links.
- **Assign** an enquiry to a staff user inline from the list.
- **Bulk actions** to mark several Contacted / Quoted / Closed / Spam at once.
- **Filter** by status, service, assignee or date; **search** by name, phone,
  email or message text.
- The customer's own words are **read-only**. Staff edit only status, assignee
  and the internal note, so there is never a dispute about what was asked for.
- **No "Add enquiry" button** — these only ever arrive from the website form.

Order of operations on submit is deliberate: **save to the database first, then
notify.** A broken SMTP password logs an error and leaves the lead safely in the
admin; it never loses it.

#### Email alerts

Set `ENQUIRY_NOTIFY_EMAILS` in `.env` and the team is emailed on every enquiry,
with the details plus those one-tap reply links.

With `EMAIL_HOST_USER` blank (the default) Django prints the email to the
console instead of sending it — so you can test the whole flow with no
credentials. To send for real via Gmail you need an **App Password**
(Google Account → Security → App passwords), not the normal account password.

#### Spam protection

Three layers, all server-side so `curl` cannot bypass them:

1. **Honeypot** — a `display:none` field named `enquiry_ref`. Filled = bot,
   rejected with a generic message that never explains the trap. Deliberately
   *not* named `website`/`url`/`company`: browser autofill recognises those and
   would populate it, silently blocking a real customer.
2. **Rate limit** — `ENQUIRY_THROTTLE_RATE` (default `5/hour` per IP) on its own
   throttle scope, so other API traffic cannot raise it.
3. **Content heuristics** — two or more links, known spam keywords, or an
   unbroken 60+ character token.

Everything is tuned to prefer letting a spam row through (the team marks it Spam
in one click) over rejecting a genuine customer.

### API

All read endpoints are `GET`-only and return just the records with
`is_visible=True`, ordered by `display_order`. The one write endpoint
(`/api/enquiries/`) is **create-only on purpose**: `GET` returns 405, so
customer names, phone numbers and emails can never be read back out over the
public API. Staff read enquiries in the admin.

| Endpoint | Returns |
|---|---|
| `/api/rates/` | Currency board |
| `/api/rates/<CODE>/` | One currency, e.g. `/api/rates/USD/` |
| `/api/testimonials/` | Customer voices |
| `/api/faqs/` | All FAQs |
| `/api/faqs/?homepage=true` | Only FAQs flagged for the homepage accordion |
| `/api/faq-categories/` | FAQ sidebar categories |
| `POST /api/enquiries/` | Contact form submission — **create only** |

## Frontend setup

```
cd frontend
npm install
npm run dev
```

Reads the API base URL from `VITE_API_BASE_URL` (`frontend/.env`). Vite is configured with `host: true`, so it also serves on your LAN IP for mobile testing.

**Testing on a phone:** set `VITE_API_BASE_URL` to your machine's LAN IP (e.g. `http://192.168.1.4:8000/api`) — not `localhost`, which on a phone means the phone itself — and add that IP to `ALLOWED_HOSTS` plus the frontend origin to `CORS_ALLOWED_ORIGINS` in `backend/.env`.

## Notes

- **No authentication on the public site.** The "Client login" page is a static mockup; there is no customer account system. `/admin/` is staff-only Django auth.
- FAQ answers are stored as **plain text**. The API escapes them and converts blank-line-separated blocks into `<p>` paragraphs (`answer_html`), which the frontend renders. Staff never write HTML, and staff input cannot inject markup.
- The frontend fetches on mount with no caching layer. Fine at this traffic level; add HTTP cache headers or React Query if it grows.
