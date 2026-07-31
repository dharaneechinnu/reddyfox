# Phase 4 — Technical SEO baseline

**Status:** Not started
**Depends on:** Phase 1 for anything crawler-facing; independent otherwise

## Tasks

- [ ] **Sitemap** — confirm `frontend/public/sitemap.xml` lists every route in
      `App.jsx` including each `/services/:id`, and drop `/login` (noindex —
      shouldn't be in the sitemap at all). Automate the sync check if
      feasible (a small script comparing `App.jsx` routes to `sitemap.xml`
      entries, run in CI or `npm run lint`-adjacent), since it's currently
      hand-maintained per `../seo-and-ai-discoverability.md`.
- [ ] **robots.txt** — already explicitly allows AI crawlers (GPTBot,
      ClaudeBot, PerplexityBot, etc.) per the existing doc; just confirm no
      regressions and that `/login` and any admin-adjacent paths are
      disallowed.
- [ ] **Canonical URLs** — confirm `Seo.jsx` sets a canonical on every route
      and it matches the sitemap entry (no trailing-slash mismatches).
- [ ] **Core Web Vitals / page speed** — run PageSpeed Insights / Lighthouse
      against the production URL for `/`, `/rates`, and one `/services/:id`;
      record LCP/CLS/INP scores here as a baseline before further changes.
- [ ] **Image optimization** — check image formats/sizes served (WebP?
      responsive `srcset`?) on pages with real photos (About, Services).
- [ ] **HTTPS/security headers** — confirm HSTS, no mixed content, and that
      Render's TLS cert covers the production domain.
- [ ] **Broken links** — run a link checker against the deployed site once
      Phase 1 ships (checking prerendered output, not just the SPA shell).
- [ ] **hreflang** — confirm not needed (single-market, single-language site);
      explicitly skip rather than leaving unaddressed.

## Definition of done

A baseline Lighthouse/PageSpeed report recorded in this file, sitemap/robots
verified against the live route list, zero broken internal links.
