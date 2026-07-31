# Phase 7 — Analytics & measurement

**Status:** Not started
**Depends on:** nothing technically, but numbers won't move until Phase 1 ships

## Why this matters given how leads actually work here

Per root `CLAUDE.md`, the product of this site is a phone number reaching the
T. Nagar desk, not an online sale. KPIs should reflect that — form
submissions and call/WhatsApp clicks matter more than raw traffic or
time-on-page.

## Tasks

- [ ] **Google Search Console** — verify property, submit `sitemap.xml`,
      confirm indexing status per route once Phase 1 ships (Coverage report
      should show every real route as "Indexed", not "Crawled - not
      indexed").
- [ ] **Google Analytics 4** — confirm install, and that conversion events
      exist for: enquiry submit, quote submit, rate-lock submit, phone-tap
      click, WhatsApp click (per `SiteSetting`'s WhatsApp option in
      `content` app).
- [ ] **Bing Webmaster Tools** — verify property, submit sitemap (feeds Bing
      Copilot's index too).
- [ ] **Microsoft Clarity** (optional) — session recordings/heatmaps if not
      already present; useful for the "why isn't the lead form converting"
      question rather than for SEO ranking directly.
- [ ] Define the KPI set to actually track going forward (fill in real
      numbers once measured — do not backfill from memory of the earlier
      generic template):
      - Organic sessions by landing page
      - Keyword rankings for the terms in `../keyword-targets.md`
      - Lead form submissions by kind (Enquiry/QuoteRequest/RateLock)
      - Phone/WhatsApp click-throughs
      - Core Web Vitals pass rate (from GSC, not just one-off Lighthouse runs)

## Definition of done

GSC, GA4, and Bing Webmaster Tools all verified and reporting; a short
recurring (e.g. monthly) check-in noted here comparing the KPI list above
against the prior month, once at least one full month of data exists.
