# Documentation

Project documentation for the Reddy Forex website lives here, in `docs/`, at
the repo root — not scattered across `frontend/` and `backend/` READMEs.
Add new docs to this folder and link them below.

## Contents

- [Reaching the desk](./team-notifications.md) — how the team hears about a
  new lead, why minutes matter commercially, what's built today, and a costed
  comparison of the remaining options. **Start here** for anything about
  notifications.
- [Telegram staff alerts](./telegram-bot.md) — setup (bot creation, staff
  onboarding), the admin-approval model, message format, and failure handling
  for the Telegram channel added alongside the email alert.
- [Lead relay](./lead-relay.md) — the independent fallback (`relay/`) that
  pages the desk on Telegram and keeps retrying the real save when Django
  itself is unreachable at submit time. What it handles, what it doesn't,
  and the one tradeoff it accepts.
- [Product reference](./product-reference.md) — researched, dated reference
  points from comparable real-world businesses (competitors, industry
  findings, channel costs), plus ideas consciously parked and why. Research
  only — never a source of published claims.
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
- [Blog & free-resource content strategy](./blog-content-strategy.md) —
  educational content pillars (regulatory guides, glossary, traveller
  guides), free-resource formats worth building, and the guardrails for
  writing any of it without drifting into unverifiable claims.
- [SEO plan — phase tracker](./seo/README.md) — the trackable, phased backlog
  for turning `seo-and-ai-discoverability.md`'s current state into better
  ranking and AI citation: crawlability/rendering fix first, then structured
  data, on-page audit, technical baseline, local SEO, AEO content shaping,
  and analytics. **Start here** for "what's the next SEO task."
