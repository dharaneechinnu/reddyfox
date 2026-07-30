# Product reference: what comparable businesses do

A running file of researched, real-world reference points for deciding what to build next.
The rule from `CLAUDE.md` applies here too: **nothing in this file is a claim the business
makes**. It is competitor and industry research, kept separate from anything customer-facing.

Last researched: **July 2026.** Re-verify before acting on a price or a feature claim.

---

## Who we are comparing against

Reddy Forex is a **single-counter, RBI-authorised money changer in T. Nagar, Chennai**,
operating since 2000. That shapes every judgement below: features that assume multiple
branches, a logistics fleet, an in-house dev team, or thousands of transactions a day are
noted but marked out of scope rather than copied.

### Orient Exchange — the realistic benchmark

RBI Category-II Authorised Dealer, multi-city India. Mature online flow.

| What they do | Our position |
|---|---|
| Live order tracking, placement → delivery | **Adopted, scoped down.** PR #15: reference code + `/track` status page. No delivery stage, because we do not deliver. |
| Rate lock frozen ~48h for a 2% advance | **Not adopted.** Ours is a free, non-binding reservation with a dealer callback. A paid binding hold needs online payments and a compliance decision. |
| Doorstep delivery or branch pickup, same-day in some cities | **Not adopted.** A logistics commitment, not a website feature. Do not imply it exists. |
| KYC docs (passport/visa/ticket) uploaded before visiting | **Good candidate.** Shortens the counter visit, needs no new licence. Storage and retention need thought — these are identity documents. |
| Wide currency range incl. exotics, forex cards, remittance, hedging | Largely matched already; see `SERVICES` in `frontend/src/data.js`. |
| Native iOS + Android retail apps | **Out of scope.** But a service worker already ships for push, so an installable PWA would get much of the feel cheaply. |
| "Encrypted and secure" trust messaging | **Partially adopted.** Worth an honest trust section (RBI authorisation, HTTPS) — nothing unverifiable. |

---

## Industry findings worth remembering

### Speed-to-lead decides who gets the customer

- Responding within **5 minutes** vs. 30 makes a lead roughly **21× more likely to qualify**
  (MIT / InsideSales Lead Response Management study).
- Odds fall off sharply again between **5 and 10 minutes** (Harvard Business Review, *The
  Short Life of Online Sales Leads* — 15,000 leads, 100,000 call attempts).
- Around **78% of customers buy from whoever responds first.**
- Average response time across industries is measured in **tens of hours**, and a large share
  of leads are never contacted at all.

Treat the exact multipliers as directional. The direction is not disputed, and it is the
whole reason `docs/team-notifications.md` exists: a lead the desk does not see quickly is
commercially close to a lead never received.

### Messaging channel costs (India, mid-2026)

| Channel | Cost shape | Note |
|---|---|---|
| Telegram Bot API | Free, no per-message fee | No verification or approval process. Best value for internal alerts. |
| Firebase Cloud Messaging (web push) | Free | Already integrated; needs a project switching on. |
| WhatsApp Business API | ~₹1,500+/mo platform + ~₹0.12/utility message | Meta has repriced repeatedly; BSP fees vary widely. Verify current rates. |
| SMS | Per message | Main advantage is working without internet. |
| `wa.me` deep links | Free | Already used for staff→customer replies. No API, no approval. Underrated. |

---

## Ideas parked, with the reason

Not a backlog — a record of things considered and consciously deferred, so they are not
re-litigated from scratch.

| Idea | Why parked |
|---|---|
| Paid, binding rate lock | Needs online payment collection + compliance review of what "binding" commits the business to. |
| Doorstep delivery | Business/logistics decision, not a website feature. |
| Customer WhatsApp notifications (not just deep links) | Real business case, but needs consent handling, template approval, and recurring cost. |
| Native mobile app | Cost/benefit poor at this scale; PWA is the cheaper 80%. |
| Prerendering / SSR | Documented in `seo-and-ai-discoverability.md`; needs a decision on approach first. |
| Multi-branch features | Single shop. Revisit only if that changes. |

---

## How to use and extend this file

- Add a row rather than rewriting one, and **date what you researched**.
- Prices and competitor features go stale fast — treat anything older than ~6 months as
  needing re-verification before it informs a decision.
- Keep the separation clean: research lives here, **published claims live in
  `frontend/src/company.js` and `data.js` and must be independently verifiable.**
