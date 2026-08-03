# Reaching the desk: how the team hears about a new lead

## The problem this solves

A customer on the website asks for a quote, sends an enquiry, or requests a callback, and
leaves their mobile number. **Those details are for the dealers, not for the customer.**
Nobody is buying anything online — the entire point is to get a real person at the T. Nagar
counter to ring that customer back.

So the thing being optimised is not the confirmation screen. It is:

```
customer submits a lead  →  desk is alerted  →  dealer calls the customer back
                         └──────── minimise this ────────┘
```

**Speed-to-lead decides who wins the customer.** The widely-cited MIT/InsideSales lead
response study found responding within 5 minutes makes a lead ~21× more likely to
qualify than waiting 30; a Harvard Business Review analysis of 15,000 leads found the
odds drop sharply again between 5 and 10 minutes, and ~78% of customers buy from
whoever responds first. Reddy Forex competes with larger chains on rate *and* on who
picks up the phone first — the second one is winnable without touching margin.

That is the justification for building anything here at all. A lead sitting unseen in an
inbox for two hours is, commercially, a lost lead.

## What exists today

| Piece | Where | Status |
|---|---|---|
| Email to the desk on every lead | `content/notifications.py` → `notify_team()` | **Live on `main`** |
| Per-lead-type recipient overrides | Admin → Site settings (`notify_enquiries`/`notify_quotes`) | **Live on `main`** |
| Lead inbox with one-tap call / WhatsApp reply links | `content/admin.py` (`BaseLeadAdmin.reply_links`) | **Live on `main`** |
| Red "untouched and older than an hour" timestamp | `content/admin.py` (`BaseLeadAdmin.received`) | **Live on `main`** |
| Telegram alert to admin-approved staff, per-send delivery log | `telegram_alerts/` app — see `docs/telegram-bot.md` | **Built** |
| Chrome push to staff browsers, per-send delivery log | `team_alerts/` app | **PR #16, not yet merged** |

Two rules the existing code already follows, and any new channel must follow too:

- **Save first, notify second.** The lead is committed to the database before any
  notification is attempted. See `BaseLeadCreateView.perform_create`.
- **A notification failure must never cost a lead.** Every send path swallows and logs its
  own errors. This matters doubly for anything hooked to a `post_save` signal, where a
  raised exception rolls back the customer's submission — exactly the class of bug fixed in
  PR #16 (see `team_alerts/services.py`, `_never_raises`).

## Options for getting louder

Costs are India, mid-2026. "Volume" assumes a single shop doing tens of leads a day, not
thousands — that assumption is what makes the ranking come out the way it does.

### 1. Telegram bot — *built*

Originally scoped here as a group chat everyone shares; built instead as **per-staff DMs, gated
by admin approval** rather than an open group, so access can be granted or revoked per person.
Full setup and design in **`docs/telegram-bot.md`**.

- **Cost:** free, with no per-message charge and no documented rate ceiling for this volume.
- **Setup:** talk to `@BotFather`, get a token, `POST` to `sendMessage`. No business
  verification, no approval queue, no vendor contract.
- **Why it fits here:** the team already carries phones; an instant DM matches how a small
  shop actually coordinates. It degrades gracefully — if the bot breaks, the email still arrives.
- **Watch out for:** it is a *consumer* messenger holding customer names and phone numbers.
  Kept to admin-approved staff accounts only (see `telegram_alerts.TelegramSubscriber`), and
  treated as covered by the same retention thinking as any other copy of customer PII.
- **Shape actually built:** `telegram_alerts.services.notify_team_telegram(lead)` alongside
  `notify_team()` in `content/views.py`, same never-raises discipline, bot token from `.env`,
  per-subscriber delivery log in `TelegramDelivery`.

### 2. Chrome push to staff (built, needs switching on)

`team_alerts` is written and tested; it needs a free Firebase project wired up
(`FIREBASE_CREDENTIALS_JSON` + `FIREBASE_WEB_*`). Until then every send is deliberately
recorded as `FAILED — FCM is not configured` rather than raising.

- **Cost:** free (FCM has no charge for this).
- **Best for:** the counter PC with the admin already open.
- **Weakness:** browser push is per-browser opt-in and dies if someone clears site data or
  switches machine. Good as *a* channel, risky as the *only* channel.

### 3. Sound + auto-refresh on the admin lead list

If a screen is always open at the counter, poll the lead list and play a short sound on a
new row.

- **Cost:** free. Small, self-contained job.
- **Weakness:** only works while that screen is open and unmuted. A complement, never the
  primary.

### 4. WhatsApp Business API

- **Cost:** platform fees start around ₹1,500/month, plus roughly ₹0.12 per utility message
  (varies by provider; Meta's own rates changed again in 2026).
- **Verdict for *internal* alerts:** hard to justify at this volume when Telegram does the
  same job for free.
- **Where it *is* worth revisiting:** messaging the **customer** — order confirmations,
  "your rate is confirmed", expiry reminders. That is a different feature with a real
  business case, and it needs a compliance look first (consent, template approval).
  Note the site already does customer WhatsApp the free way: `wa.me` deep links, no API.

### 5. SMS

- **Cost:** per message, no free tier.
- **Only real advantage:** it works when the shop's internet does not.
- **Verdict:** a fallback worth considering once something else is primary, not a first move.

### 6. Slack / Google Chat webhook

Free and trivial to wire, but only sensible if the team already lives in one of those tools.
For a single-counter shop in Chennai, Telegram or WhatsApp is where people actually are.

## Suggested order

1. Switch on Firebase so the **already-built** push actually delivers (issue #11).
2. ~~Add the **Telegram bot** as the everyday alert.~~ **Done** — see `docs/telegram-bot.md`.
3. Add **sound + auto-refresh** on the counter screen if one is permanently open.
4. Revisit **WhatsApp** only for customer-facing messaging, with a compliance review.

## Real-world references

Grounding, not aspiration — what comparable businesses actually do.

### Orient Exchange (RBI Category-II Authorised Dealer, multi-branch India)

Researched July 2026. The closest large competitor with a mature online flow:

- **Live order tracking** from placement to delivery, so the customer self-serves status
  instead of phoning the branch. (Mirrored, scoped down, in PR #15.)
- **Rate lock with a 2% advance**, freezing a rate for ~48 hours — a *binding* hold, unlike
  ours. Needs online payment collection and a compliance decision; deliberately not built.
- **Doorstep delivery vs. branch pickup**, and same-day delivery in some cities. A logistics
  commitment, not a website feature — do not imply it exists.
- **Pre-visit KYC upload** (passport, visa, ticket) so the counter visit is shorter. A
  realistic future feature for us; no new licensing needed.
- **Native retail app** on both stores. Out of scope, but the service worker already shipped
  for push means an installable PWA would get much of the feel for a fraction of the cost.

### Speed-to-lead research

MIT/InsideSales Lead Response Management study; Harvard Business Review's "Short Life of
Online Sales Leads" (15,000 leads, 100,000 call attempts). Both are widely reproduced
sales-operations references; treat the exact multipliers as directional rather than precise,
but the direction is not in dispute — minutes matter, hours are fatal.

### Messaging costs

WhatsApp Business API pricing in India for 2026 (multiple BSP price lists) and the Telegram
Bot API's published terms. Re-check both before committing: Meta has repriced WhatsApp
several times, and BSP platform fees vary widely.

## For whoever picks this up next

- Anything new goes **alongside** `notify_team()`, not inside it — one channel failing must
  not stop another.
- Connect signals to the **proxy** models (`Enquiry`, `QuoteRequest`), never to `Lead` itself,
  or every kind of lead triggers every alert. See `team_alerts/signals.py`.
- Customer PII (name, phone, email) leaving the database to a third-party messenger is a
  DPDP Act 2023 consideration. Worth a retention and lawful-basis note before adding a
  channel that copies leads off-platform at scale.
