# SEO & AI discoverability

## Goal

When someone searches "forex exchange T Nagar" on Google, or asks ChatGPT,
Claude or Perplexity "where can I exchange currency in Chennai", this site
should be found, and — just as importantly — described *accurately*: a real,
RBI-authorised money changer at a specific T. Nagar address, not a generic or
invented answer.

Two audiences, one set of changes:

- **Classic search** (Google, Bing) — crawls pages, reads structured data,
  ranks by relevance and authority.
- **AI answer engines** (ChatGPT, Claude, Perplexity, Google's AI Overviews)
  — crawl and index similarly, but weigh clearly-structured facts (schema.org
  markup, FAQ Q&A pairs, plain-text summaries) more heavily than prose, because
  they're extracting a specific fact or quote, not ranking a page.

This is sometimes called GEO (Generative Engine Optimization) or AEO (Answer
Engine Optimization) — same underlying work as SEO, with an extra emphasis on
structured, directly-quotable facts.

## What's implemented

| File / component | Purpose |
|---|---|
| `frontend/index.html` | Static `<head>` — title, meta description, Open Graph/Twitter tags, canonical URL, and an `Organization`/`LocalBusiness` JSON-LD block. This is the **only** thing a crawler that doesn't execute JavaScript ever sees (see [Limitations](#the-honest-limitation-this-is-a-client-rendered-spa) below), so it's written to stand on its own rather than as a generic fallback. |
| `frontend/src/components/Seo.jsx` | Per-page `<title>`, meta description, canonical URL, and OG/Twitter tags, set via `useEffect` after each route mounts. No new dependency (e.g. `react-helmet`) — just direct DOM writes, consistent with how small this site is. |
| `frontend/src/pages/*.jsx` | Every route renders `<Seo title=... description=... path=... />` with unique, keyword-relevant copy — see the [route table](#route--metadata-table) below. |
| `frontend/src/pages/Faq.jsx` | Builds `FAQPage` JSON-LD from the live FAQ data (question/answer pairs from the backend) and passes it to `<Seo jsonLd=... />`. This is the single highest-value piece of structured data here: both Google's rich results and AI engines parse this exact shape to quote an answer directly. |
| `frontend/src/pages/Login.jsx`, `NotFound.jsx` | `<Seo noindex />` — the client-portal login is a non-functional placeholder and the 404 page is not real content; neither should be indexed or cited as if it were. |
| `frontend/public/robots.txt` | Explicitly **allows** `GPTBot`, `ChatGPT-User`, `OAI-SearchBot`, `ClaudeBot`, `Claude-Web`, `anthropic-ai`, `PerplexityBot` and `Google-Extended`, in addition to the default allow-all. Several of these are blocked by default on many sites (some SEO boilerplate blocks them defensively) — here the goal is the opposite, so they're listed by name. |
| `frontend/public/sitemap.xml` | Every real route, hand-maintained (there's no SPA build-time route generator). Referenced from `robots.txt`. |
| `frontend/public/llms.txt` | Follows the [llms.txt convention](https://llmstxt.org) — a curated, plain-text summary of the business (what it is, key pages, facts worth quoting directly) aimed specifically at AI assistants, so an LLM doesn't have to infer or guess facts from rendered UI it may not fully see. |

## Route & metadata table

Keep this in sync with `frontend/src/App.jsx` and `frontend/public/sitemap.xml` — when you add a route, add it in all three places.

| Route | Title | Indexed? |
|---|---|---|
| `/` | Foreign Currency Exchange in Chennai | Yes |
| `/rates` | Today's Foreign Exchange Rates | Yes |
| `/converter` | Currency Converter | Yes |
| `/quote` | Get a Free Forex Quote | Yes |
| `/lock-rate` | Lock Today's Exchange Rate | Yes |
| `/services` | Forex Services | Yes |
| `/services/:id` | (service title, e.g. "Foreign Exchange") | Yes |
| `/about` | About Us | Yes |
| `/faq` | FAQs | Yes |
| `/contact` | Contact Us | Yes |
| `/login` | Client Portal Sign In | **No** — placeholder, `noindex` |
| `*` (404) | Page Not Found | **No** — `noindex` |

## The honest limitation: this is a client-rendered SPA

Everything in `Seo.jsx` is written to the DOM *after* React mounts and the
route resolves. A crawler that does not execute JavaScript — and it's not
publicly confirmed which AI crawlers reliably do — only ever sees the static
`index.html` described above: one title, one description, one JSON-LD block,
regardless of which URL it requested.

That's exactly why:

- `index.html`'s defaults are written to be strong on their own, not generic.
- `robots.txt`, `sitemap.xml` and `llms.txt` matter *more* than usual here —
  they're static files, always served as-is, immune to this limitation
  entirely.
- The FAQ page's structured data is the best-effort case, not the safe case:
  it's real and correct for any crawler that renders JS, but not guaranteed
  to reach one that doesn't.

**The real fix, if this matters enough to invest in:** server-side rendering
or prerendering, so each route serves its own fully-formed HTML (title, meta
tags, JSON-LD included) on the very first response. Options, roughly in
order of effort:

1. **Static prerendering** of the handful of marketing routes (`/`, `/services/*`,
   `/about`, `/faq`) at build time (e.g. `vite-plugin-ssg`, or a prerendering
   service such as Prerender.io in front of the existing SPA). Smallest
   change, biggest win for the pages that matter most for search/AI.
2. **Migrate to a framework with SSR** (Next.js, Remix, or Vite SSR) for the
   whole frontend. Much larger effort — a rewrite, not an incremental change
   — but solves this permanently and gets faster first paint too.

Neither is in this PR; it's scoped to what's achievable without changing the
frontend's rendering model.

## Structured data reference

- **FinancialService / LocalBusiness** (`index.html`): name, address, phone,
  email, `sameAs` (social profiles). Every value is sourced from
  `frontend/src/company.js` — nothing here is invented. If you change the
  address/phone/socials in `company.js`, update the JSON-LD in `index.html`
  to match (it's static, so it doesn't pick up `company.js` changes
  automatically).
- **FAQPage** (`Faq.jsx`): generated live from the backend FAQ content, so it
  never goes stale relative to what staff actually publish in the admin.

Validate either with Google's
[Rich Results Test](https://search.google.com/test/rich-results) or the
[Schema.org validator](https://validator.schema.org/).

## Maintaining this

- **New route added** → add a `<Seo>` call with a unique title/description,
  add it to `sitemap.xml`, and add a row to the route table above.
- **Company facts change** (address, phone, socials) → update
  `frontend/src/company.js` (single source of truth for the rendered site)
  **and** the static JSON-LD in `frontend/index.html` (it won't pick up the
  change automatically, since it's plain HTML, not generated from JS).
- **New FAQ added in the admin** → nothing to do; the FAQ page's structured
  data is generated from live data automatically.

## Verifying it's working

- [Google Search Console](https://search.google.com/search-console): submit
  `sitemap.xml`, watch for indexing/coverage issues.
- [Bing Webmaster Tools](https://www.bing.com/webmasters): Bing's index also
  feeds Copilot's answers.
- Periodically ask ChatGPT, Claude and Perplexity directly — e.g. "where can
  I exchange US dollars in T Nagar, Chennai" — and check whether the answer
  is accurate and (where the assistant cites sources) whether this site is
  one of them.

## Recommended next steps (not in this PR)

These move the needle further but are separate decisions/work, not
technical debt from this change:

- **Google Business Profile**: a claimed, verified listing is often a bigger
  ranking factor for "near me" searches than on-site SEO.
- **Genuine customer reviews** on Google — both a ranking signal and
  something AI assistants surface directly.
- **Backlinks**: other Chennai/finance/travel sites linking here.
- **Long-tail content**: a small number of genuinely useful pages (e.g. "how
  much foreign currency can I carry legally", "documents needed to exchange
  currency in India") tend to be exactly what AI assistants quote — but only
  write these if the business can keep them accurate over time.
- **Prerendering/SSR** — see [above](#the-honest-limitation-this-is-a-client-rendered-spa).
