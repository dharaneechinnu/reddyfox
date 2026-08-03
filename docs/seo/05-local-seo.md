# Phase 5 — Local SEO (single shop)

**Status:** Not started
**Depends on:** Phase 2 (LocalBusiness schema) for consistency between GBP and on-site markup

## Scope reality check

One location: Shop No 105, Challa Mall, 17 Thyagaraya Road, T. Nagar, Chennai,
Tamil Nadu 600017 (`frontend/src/company.js`). This phase is about *owning*
that one listing thoroughly — verified GBP, consistent NAP everywhere,
review generation — not building branch pages for cities with no real
presence.

## Tasks

- [ ] **Google Business Profile** — confirm claimed/verified status
      `[VERIFY — ask business owner, not derivable from repo]`. If verified,
      audit: category (Currency Exchange Service / Money Order Service),
      hours, phone (must match `company.js` exactly), photos, and whether
      GBP posts are being used.
- [ ] **NAP consistency** — name/address/phone must match, character for
      character, across: `company.js` (source of truth), `index.html` JSON-LD,
      GBP, and any directory listings the business already has. Any mismatch
      actively hurts local ranking.
- [ ] **Reviews strategy** — a concrete, low-friction ask (e.g. a link sent
      post-visit) rather than a generic "get more reviews" note. Do not add
      `aggregateRating` schema until there's a real, linkable review count to
      cite (see Phase 2's ground rule).
- [ ] **Local schema** — confirmed via Phase 2's `LocalBusiness`/
      `FinancialService` block; this phase just ensures GBP and on-site data
      agree.
- [ ] **Local citations/directories** — audit which general business
      directories (JustDial, IndiaMart, Sulekha, etc.) already list this
      business `[VERIFY]`, and whether NAP is consistent there too. Only
      pursue *real* citations the business can claim — no fabricated
      directory submissions.
- [ ] **Local backlinks** — realistic for a single T. Nagar shop: Chennai
      travel bloggers, local business associations, T. Nagar-area
      publications. See `../product-reference.md` for any prior research on
      this before starting fresh.

## Definition of done

GBP verified and fully filled in, NAP confirmed identical across every
surface the business controls, a concrete (not generic) review-request flow
in place.
