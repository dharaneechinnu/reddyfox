# Documentation

Project documentation for the Reddy Forex website lives here, in `docs/`, at
the repo root — not scattered across `frontend/` and `backend/` READMEs.
Add new docs to this folder and link them below.

## Contents

- [Currency rate APIs](./currency-rate-apis.md) — researched options for
  fetching world exchange rates (Frankfurter, fawazahmed0, ECB), why FBIL is
  the authoritative Indian source, and **why an API rate must never be
  published as our counter rate**. Read before wiring up any external rate
  feed. Verify with `backend/scripts/check_rate_apis.py`.
- [SEO & AI discoverability](./seo-and-ai-discoverability.md) — what's
  implemented so the site ranks well in search and gets cited correctly by
  AI assistants (ChatGPT, Claude, Perplexity) when someone asks about forex
  in Chennai, what its limits are, and what to do next.
- [Keyword & query targets](./keyword-targets.md) — the real searches and
  AI-assistant questions this site's content is written to answer.
