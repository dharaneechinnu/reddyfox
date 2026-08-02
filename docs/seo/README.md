# SEO / AI-discoverability plan — phase tracker

This is the working plan for improving reddyforex.com's ranking on classic
search (Google, Bing) and citation by AI answer engines (Google AI Overview,
ChatGPT, Claude, Gemini, Perplexity, Bing Copilot). It replaces ad-hoc
requests with a phased, trackable backlog.

**Scope reality check, before anything else:** Reddy Forex is a **single
shop** in T. Nagar, Chennai (`frontend/src/company.js`) — there is no branch
network. Any plan or template that assumes multiple branch-city pages
(Coimbatore, Madurai, Salem, Vellore, Tambaram, etc.) does not apply here and
should be discarded. Local SEO for this site means "own T. Nagar / Chennai
forex search" thoroughly, not multi-location expansion.

**Content rule, non-negotiable (see root `CLAUDE.md`):** nothing published —
schema markup, meta descriptions, blog copy, FAQ answers — may state a fact
that isn't in `frontend/src/company.js`, `frontend/src/data.js`, or the
database via `/admin/`. No invented licence numbers, certifications, branch
counts, ratings, or executive names. A past draft did this and it all had to
be ripped out. Every phase doc below marks facts that still need a real
source as `[VERIFY]` rather than inventing one.

## How to use this

Each phase is its own file, `NN-name.md`, with:
- a **Status** line (`Not started` / `In progress` / `Blocked` / `Done`)
- a checklist of concrete tasks
- what it depends on / blocks
- links back to existing docs instead of duplicating them

Update the Status line and check off tasks as work happens — this index only
lists where things stand; the detail and reasoning lives in each phase file.

## Phases

| Phase | File | Status | One-line goal |
|---|---|---|---|
| 1 | [Crawlability & rendering](./01-crawlability-rendering.md) | Not started | Make every route's real title/meta/schema visible to a crawler that doesn't execute JavaScript — the blocker everything else sits behind. |
| 2 | [Structured data (schema.org)](./02-structured-data.md) | Not started | Verified-fact-only JSON-LD for Organization/LocalBusiness, FAQPage, BreadcrumbList, Service. |
| 3 | [On-page metadata audit](./03-on-page-metadata.md) | Not started | Per-route title/description/heading audit against real keyword targets. |
| 4 | [Technical SEO baseline](./04-technical-seo.md) | Not started | Sitemap, robots.txt, canonical URLs, Core Web Vitals, image optimization. |
| 5 | [Local SEO (single shop)](./05-local-seo.md) | Not started | Google Business Profile, NAP consistency, reviews, local schema — scoped to one location. |
| 6 | [Content & AI answer optimization](./06-content-ai-answers.md) | Not started | Extend the existing content strategy toward AEO/GEO-shaped content (direct-answer structure, entity clarity). |
| 7 | [Analytics & measurement](./07-analytics-measurement.md) | Not started | GSC, GA4, Bing Webmaster Tools wired up with the right KPIs to know if any of this is working. |

## Related docs (don't duplicate — link)

- [`../seo-and-ai-discoverability.md`](../seo-and-ai-discoverability.md) — what's already implemented today; Phase 1 and 2 extend this rather than replacing it.
- [`../keyword-targets.md`](../keyword-targets.md) — real search/AI-query targets this site writes for.
- [`../blog-content-strategy.md`](../blog-content-strategy.md) — content pillars and guardrails; Phase 6 builds on this.
- [`../product-reference.md`](../product-reference.md) — competitor/industry research; **research only, never a source of published claims**.
