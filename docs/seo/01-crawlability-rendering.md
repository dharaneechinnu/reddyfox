# Phase 1 — Crawlability & rendering

**Status:** Not started
**Blocks:** Phase 2 (structured data only reaches crawlers that render JS until this ships), Phase 3
**Depends on:** nothing — this is the foundation

## The problem

`frontend/src/components/Seo.jsx` writes title/description/OG/canonical/JSON-LD
to the DOM via `useEffect`, after React mounts and the route resolves. A
crawler that does not execute JavaScript only ever sees the static
`frontend/index.html` — one title, one description, one JSON-LD block,
**regardless of which URL it requested**. This is documented today in
[`../seo-and-ai-discoverability.md`](../seo-and-ai-discoverability.md#the-honest-limitation-this-is-a-client-rendered-spa)
as an accepted limitation. This phase is about closing it.

It's not publicly confirmed which AI crawlers (GPTBot, ClaudeBot,
PerplexityBot, Google-Extended) reliably render JS before extracting content
— treat "assume they don't" as the safe default given how much rides on
correct per-page facts for a regulated financial business.

## Current deployment shape (confirmed from repo)

- Frontend: Vite + React 19 + `react-router-dom` 7, `npm run build` → static
  assets, no SSR framework, no `render.yaml`/`vercel.json`/`netlify.toml` in
  the repo (deployed as a static site per Render, separate from the Django
  backend which serves `/api/`).
- Fixed, small route set (`frontend/src/App.jsx`): `/`, `/rates`, `/quote`,
  `/lock-rate`, `/services`, `/services/:id` (dynamic but a **known, small**
  set of ids from `frontend/src/data.js`), `/about`, `/faq`, `/contact`,
  `/login` (noindex), `404` (noindex).

That shape rules out a full SSR migration as the right first move — it's a
rewrite for a site with ~9 indexable routes. A **build-time prerender** step
fits this repo far better.

## Options considered

1. **Build-time prerendering** (recommended) — after `vite build`, spin up
   the built app, visit each known route with a headless browser, and save
   the fully-rendered HTML as that route's static file (e.g.
   `dist/services/forex-card/index.html`). Every crawler — JS or no JS — gets
   the real per-page title/meta/schema on the first response, no server
   changes needed, works on any static host.
   - Tooling: a small custom script using `puppeteer` (or `playwright`) is
     the least-magic option given this repo's size; `vite-plugin-ssg` /
     `@prerenderer/prerender-spa-plugin` are pre-built alternatives if we'd
     rather not hand-roll the crawl loop.
   - Route list must be generated from (or checked against) `App.jsx` +
     `data.js`'s service ids — not hand-maintained twice. Same principle
     already applied to keeping `sitemap.xml` in sync with `App.jsx`.
2. **Third-party prerender service** (Prerender.io-style: detect bot
   user-agents, proxy to a rendering service) — adds an external dependency
   and a bot-detection layer to maintain; more relevant if routes were
   dynamic/user-generated, which these aren't. Not recommended here.
3. **Full SSR/framework migration** (Next.js/Remix/Vite SSR) — solves this
   permanently and improves first paint, but is a rewrite of the whole
   frontend rendering model. Worth reconsidering only if the site's route
   count grows substantially (e.g. many programmatic city or currency pages
   — which, per the single-shop scope note, isn't the current direction).

## Tasks

- [ ] Confirm hosting: verify the frontend is in fact a Render **Static
      Site** (not served through the Django app) — changes which build hook
      can run the prerender step.
- [ ] Enumerate the full indexable route list programmatically (reuse/extend
      whatever already keeps `sitemap.xml` in sync with `App.jsx`) so the
      prerender crawl list can't silently drift from real routes.
- [ ] Prototype the prerender script against `npm run build` output for one
      route (`/`) and diff the resulting static HTML's `<title>`/meta/JSON-LD
      against what `Seo.jsx` sets client-side — they must match exactly.
- [ ] Extend to all indexable routes, including each `/services/:id`.
- [ ] Wire into the build (`npm run build` → prerender step, or a separate
      `npm run prerender` invoked by the Render build command).
- [ ] Verify with `curl -s https://reddyforex.com/faq | grep -i "<title>"` (no
      JS execution) for at least three routes, confirming distinct,
      route-correct output — not just the `index.html` defaults.
- [ ] Update [`../seo-and-ai-discoverability.md`](../seo-and-ai-discoverability.md)
      once shipped — the "honest limitation" section describes the
      *current* gap and should be rewritten to describe what's now true.

## Definition of done

`curl` (no JS) against every indexed route returns that route's real title,
meta description, canonical URL, and JSON-LD — not the generic `index.html`
fallback. Verified for all routes in `App.jsx` marked indexable in
`../seo-and-ai-discoverability.md`'s route table.
