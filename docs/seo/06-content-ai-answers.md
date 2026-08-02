# Phase 6 — Content & AI answer optimization (AEO/GEO)

**Status:** Not started
**Depends on:** Phase 1 (content only helps AI crawlers once it's actually reachable without JS)
**Do not duplicate:** [`../blog-content-strategy.md`](../blog-content-strategy.md) already
defines content pillars and guardrails. This phase is about *shaping* that
content for AI-answer extraction, not proposing a new calendar from scratch.

## Why this is different from classic content SEO

AI answer engines (Google AI Overview, ChatGPT, Perplexity, Gemini, Bing
Copilot) tend to extract a single quotable fact or short passage rather than
rank a whole page. Content that states facts plainly, with clear entities
("Reddy Forex is an RBI-authorised money changer at..." not "we pride
ourselves on..."), and answers one question per section, gets quoted more
reliably than dense marketing prose.

## Tasks

- [ ] Review existing FAQ content (`Faq.jsx` + backend `Faq`/`FaqCategory`
      models) for direct-answer structure: question as a real question,
      answer as a self-contained 1–3 sentence fact, not "click here to learn
      more."
- [ ] Cross-check `frontend/public/llms.txt` is current against
      `company.js`/`data.js` — this file exists specifically so an LLM
      doesn't have to infer facts it might get wrong; stale content here is
      worse than none.
- [ ] Apply the same direct-answer lens to any new content proposed in
      `../blog-content-strategy.md` — flag pieces that are marketing-voice
      rather than fact-first, and note the fix.
- [ ] Topic clustering: confirm `/faq`, `/services`, `/rates`, and any future
      blog posts internally link around 2–3 core entities ("forex cash
      exchange in T. Nagar", "forex card", "rate lock") rather than reading
      as disconnected pages.
- [ ] E-E-A-T signals: confirm every page that makes a factual claim links
      back to a verifiable source already in this repo (`company.js`, RBI
      authorisation language) rather than restating it without attribution.

## Definition of done

FAQ and llms.txt content reviewed and confirmed direct-answer-shaped;
`../blog-content-strategy.md` cross-checked with specific pieces flagged (or
confirmed clean) against the AEO/GEO lens above.
