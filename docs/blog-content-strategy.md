# Blog & free-resource content strategy

A working reference for planning **educational content** (blog posts, FAQ
entries, downloadable guides) for the forex/money-changer business — topics
that build search visibility and answer real customer questions, without
making any claim about *this specific company* that isn't already verified
in `frontend/src/company.js` / `frontend/src/data.js` or the database.

**Read `CLAUDE.md`'s "Content rule" before writing any page copy from this
doc.** Everything below is general industry/regulatory knowledge — useful
for topic selection and for explaining *how forex exchange works in India*
in generic terms. None of it is a substitute for verifying a company-specific
fact (licence number, hours, exact fees, staff, awards). If a blog draft
needs a company-specific detail this doc doesn't provide, get it from the
site owner or the admin-editable content — don't infer or estimate it.

## Why a blog/resources section at all

- **Educational SEO.** People searching "how much cash can I carry abroad
  India" or "LRS limit 2026" are pre-purchase and easy to convert once they
  trust the source — this is a much larger search volume than
  transactional "forex near me" queries alone (see
  `docs/keyword-targets.md`).
- **AI-assistant citability.** `docs/seo-and-ai-discoverability.md` already
  covers `llms.txt` and structured data; long-form educational content is
  what LLMs actually quote from when a user asks "how does currency
  exchange work in India" — thin service pages rarely get cited.
- **Trust for a regulated business.** Explaining RBI rules accurately (LRS,
  cash limits, KYC) signals legitimacy better than marketing copy — and
  it's content that doesn't need embellishment to be compelling.

## Content pillars (topic buckets)

### 1. Regulatory / "how it works" (highest trust value)

These map to real RBI/FEMA rules and are safe to write about **as general
public information**, citing RBI as the source — not as a claim about what
this company specifically does beyond what's already in `data.js`.

- Liberalised Remittance Scheme (LRS): the ₹/USD 250,000-per-financial-year
  limit, what it covers (education, travel, medical, gifts, investments)
- Cash vs. non-cash limits for buying foreign exchange (the existing
  ₹49,999 cash / above-₹50,000-by-cheque-or-bank-transfer rule already
  appears in `data.js` — verify current figures against RBI's latest
  Master Direction before publishing, rules are periodically revised)
- What "RBI Authorised Money Changer" (AMC) actually means and how to
  verify one (RBI publishes an AMC list) — useful trust content, distinct
  from *claiming* a specific licence number that isn't published
- KYC documents needed to exchange currency or send money abroad
  (PAN, passport, visa, ticket — for larger transactions)
- Tax Collected at Source (TCS) on outward remittances/forex purchases —
  thresholds and rates change by budget year, so date-stamp any post and
  flag it for a periodic recheck
- Difference between money changer, bank, and online forex platforms

### 2. Practical traveller guides

- "How to get the best forex rate before an international trip" (compare
  early booking vs. airport exchange — airport counters are consistently
  the worst rate, a well-documented and safe general claim)
- Currency exchange checklist for first-time travellers
- What to do with leftover foreign currency after a trip (re-conversion
  rules, receipts needed)
- Multi-currency prepaid forex card vs. cash vs. international debit card —
  pros/cons, ties to the "Forex Card" service already in `data.js`
- City/country-specific "how much cash should I carry" guides (safe as
  general travel-budgeting advice; don't invent specific rate numbers —
  today's rate lives on `/api/rates/`, link to the live rate board instead
  of hardcoding a number that will go stale)

### 3. Remittance & money-transfer education

- Western Union vs. MoneyGram vs. bank wire transfer vs. RIA — how each
  works, typical use case (matches the Money Transfer / Remittance
  services already in `data.js`)
- Sending money for a child studying abroad: what documents a university
  remittance needs
- Inward remittance: receiving money from family abroad in India — process
  and limits
- SWIFT transfer basics: what it is, how long it takes, what a
  correspondent bank does

### 4. Glossary / reference content (evergreen, good for AI citation)

A `/resources/glossary` style page answering one term per entry — this is
the "free resource" format that ages best and needs the least maintenance:

- Exchange rate, buy rate vs. sell rate, spread
- LRS, FEMA, AMC (Authorised Money Changer), AD-II licence category
- TCS (Tax Collected at Source)
- Demand draft, telegraphic transfer / TT, SWIFT code
- Travellers cheque (legacy term, still searched)
- Forex card, multi-currency card

### 5. Local/Chennai-specific

- "Currency exchange in T. Nagar: what to know" — genuinely local content,
  ties to the existing local-SEO keyword targets
- Comparing money-changer vs. bank vs. airport exchange specifically for
  someone flying out of Chennai

## Free-resource formats worth building (beyond blog posts)

- **Downloadable pre-trip checklist (PDF)** — documents + cash-limit
  reminders; strong lead-magnet candidate, could gate behind the existing
  `Lead` capture flow (`content.models.Lead`, kind could reuse `Enquiry` or
  need a 4th `Lead.Kind` per `CLAUDE.md`'s guidance if it becomes its own
  tracked funnel — start ungated unless there's a reason to gate it)
- **Rate-alert signup** — already exists via the `notifications` app (FCM
  push on rate change); the blog can promote this rather than duplicate it
- **Glossary page** — see pillar 4 above
- **FAQ expansion** — the `Faq`/`FaqCategory` models already support
  staff-editable FAQs; broader educational questions (LRS, TCS, KYC) belong
  there or in blog posts, whichever fits the existing FAQ categories better

## Guardrails when actually writing a post

1. **Cite regulator facts as regulator facts.** "Per RBI's LRS guidelines,
   ..." not "We allow customers to remit up to ...". Don't imply a company
   policy that's actually a national rule, and vice versa.
2. **Date-stamp anything with a number that changes** (LRS limit, TCS rate,
   cash-transaction threshold) and note "verify current limit with RBI" —
   these are revised via budget/circular and a stale figure is worse than
   no figure.
3. **Never invent what this company specifically offers, charges, or has
   achieved.** If a post needs a company-specific fact not already in
   `company.js`/`data.js`/the database, that's a real question to route to
   the site owner — not something to phrase confidently and hope is close
   enough.
4. **Link, don't hardcode, anything that's already live data** — today's
   rate lives at `/api/rates/`; link to the rate board page instead of
   quoting a number in blog copy.
5. **No fabricated authorship/credentials** — a "Written by our compliance
   team" byline is exactly the kind of unverifiable claim `CLAUDE.md`
   already flags as a legal risk for this business; keep authorship
   generic ("Reddy Forex") unless a real named, approved author exists.

## Implementation note

There is currently no blog/CMS model in `backend/content` — publishing any
of this would need a new content type (or reuse of a simple flat-page
pattern) added the same way `Testimonial`/`Faq` were: model with
`is_visible` + `display_order`, serializer, `ReadOnlyModelViewSet`,
registered in `content/urls.py`, admin registration, then a frontend page.
That's a separate implementation task from this content-planning doc.
