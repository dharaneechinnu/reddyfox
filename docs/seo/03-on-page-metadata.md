# Phase 3 — On-page metadata audit

**Status:** Not started
**Depends on:** Phase 1 (so the audit reflects what crawlers actually see, not just what `Seo.jsx` sets client-side)
**Related:** [`../keyword-targets.md`](../keyword-targets.md), [`../seo-and-ai-discoverability.md#route--metadata-table`](../seo-and-ai-discoverability.md#route--metadata-table)

## Scope

Re-check every route's title, meta description, H1/H2 hierarchy, and internal
links against the real keyword targets already documented in
`../keyword-targets.md` — this is a review pass, not new infrastructure.

## Tasks

- [ ] For each indexable route (table in `seo-and-ai-discoverability.md`),
      confirm: unique `<title>` under ~60 chars, unique meta description
      under ~160 chars, exactly one `<h1>`, and that both mention the
      relevant term from `keyword-targets.md`.
- [ ] Check heading hierarchy doesn't skip levels (h1 → h3 with no h2) on any
      page — quick manual pass per route.
- [ ] Check internal linking: does every marketing page link toward
      `/quote`, `/lock-rate`, or `/contact`? (Reminder from `CLAUDE.md`: the
      entire point of a lead form is a phone number in front of the T. Nagar
      desk — pages that don't funnel toward a lead form are underperforming
      regardless of ranking.)
- [ ] Check image `alt` text repo-wide — real, descriptive, not keyword-stuffed.
- [ ] Check for duplicate `<title>`/description across routes (common bug:
      copy-pasted `Seo` props).
- [ ] Cross-check `/services/:id` pages individually — each must have its own
      distinct title/description, not one shared template with the id
      interpolated blandly.

## Definition of done

A markdown table (in this file, appended below) listing every route's final
title/description/H1, confirmed unique and keyword-aligned, with any fixes
already applied — not just identified.
