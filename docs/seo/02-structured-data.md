# Phase 2 — Structured data (schema.org)

**Status:** Not started
**Depends on:** Phase 1 (schema only reaches non-JS crawlers once prerendered/server-rendered)
**Related:** [`../seo-and-ai-discoverability.md#structured-data-reference`](../seo-and-ai-discoverability.md#structured-data-reference)

## Ground rule

Every field in every schema block must trace to `frontend/src/company.js`,
`frontend/src/data.js`, or a live DB-backed API response. If a schema type
"wants" a field we can't verify (e.g. `aggregateRating`, `priceRange`,
`foundingDate` beyond the published `since: 2000`), **omit the field**,
don't fill it with a plausible-looking placeholder. This is the exact
mistake an earlier draft made (fabricated RBI licence number, invented
certifications) — see root `CLAUDE.md`.

## What already exists (don't redo)

- `Organization`/`LocalBusiness`-ish JSON-LD in `frontend/index.html`, sourced
  from `company.js` — static, so it does **not** auto-update if `company.js`
  changes. Any edit to address/phone/socials needs both files touched.
- `FAQPage` JSON-LD generated live in `frontend/src/pages/Faq.jsx` from the
  backend FAQ content — already correct and already in step with what staff
  publish via `/admin/`.

## Gaps to fill

- [ ] **`BreadcrumbList`** — not yet implemented on any route. Add to
      `Seo.jsx` (or a shared helper it calls) for every non-home route,
      derived from the route path, not hand-written per page.
- [ ] **`Service`** schema on `/services/:id` — one entry per service in
      `data.js`. Only include fields present in that file (name, description);
      do not add `offers`/`price` unless `data.js` actually has pricing data.
- [ ] **`WebSite`** + `SearchAction` — only worth adding if the site actually
      has an internal search; confirm it doesn't before skipping this.
- [ ] Reconcile `index.html`'s static JSON-LD with whatever the future
      prerendered output emits per-page (Phase 1) — avoid **duplicate**
      `LocalBusiness` blocks once every page prerenders its own copy; the
      home page should own it, other pages should not repeat it wholesale.
- [ ] Fields to explicitly leave out until a real source exists (mark
      `[VERIFY]` if the business later confirms these): RBI licence/registration
      number, `aggregateRating`/review schema (unless pulling from a real,
      linkable review source — see Phase 5), `priceRange`.

## Tasks

- [ ] Audit `index.html` and `Faq.jsx` against schema.org's current
      `FinancialService`/`LocalBusiness` required vs. recommended properties;
      list what's missing vs. what's intentionally omitted (and why).
- [ ] Add `BreadcrumbList` — implement, verify with Google's Rich Results
      Test on at least `/services/:id` and `/faq`.
- [ ] Add per-service `Service` schema — implement, verify.
- [ ] Document final schema inventory in
      [`../seo-and-ai-discoverability.md`](../seo-and-ai-discoverability.md),
      replacing the current "Structured data reference" section.

## Definition of done

Google's Rich Results Test and the Schema Markup Validator both pass with
zero errors on `/`, `/faq`, and one `/services/:id` page, and every emitted
field can be pointed to its source in `company.js`/`data.js`/the DB.
