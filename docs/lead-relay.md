# Lead relay: a fallback for when Django is unreachable

Every lead form on the site — enquiry, quote, callback — exists to put a
customer's phone number in front of a dealer fast (see
[`team-notifications.md`](./team-notifications.md)). Today, that alert is a
side effect of a successful Django request: the lead is saved, and
`telegram_alerts.services.notify_team_telegram()` runs immediately after
(see [`telegram-bot.md`](./telegram-bot.md)). If Django or Postgres is
unreachable at the moment a customer submits, that request never completes
— nothing is saved, and nothing is ever sent. The customer sees an error;
the desk never learns they existed.

The **lead relay** (`relay/`) is a small, independent service that closes
that gap: when the frontend's normal save fails, it tries a second,
independent path straight to Telegram, and keeps retrying the real save in
the background until Django recovers.

## What it is

One HTTP route (`POST /relay/lead`), deployed as its own Render Web Service
— deliberately *not* inside the Django service, so a Django crash can't take
the fallback down with it. It has exactly two jobs:

1. **Message the desk on Telegram immediately** — a direct call to the Bot
   API, using its own copy of `TELEGRAM_BOT_TOKEN`. It never asks Django for
   this, since Django being unreachable is exactly the situation this
   exists to cover.
2. **Keep retrying the original lead-create request against Django** in the
   background (backoff: 5s, 30s, 60s, 2m, then every 5 minutes, for up to
   `MAX_RETRY_HOURS`, default 24) until it succeeds. When it does, the lead
   is saved through the completely normal path — same serializer, same
   validation as `content/views.py` — so Postgres remains the one place a
   lead is ever actually stored. The relay never writes to a database of
   its own.

See [`relay/README.md`](../relay/README.md) for how to run and deploy it,
and [`relay/server.js`](../relay/server.js) for the implementation — it's
short enough to read end to end.

## How the frontend uses it

`frontend/src/api.js`'s `postLead()` tries the normal Django POST first,
with an 8-second timeout. It only calls the relay if that fails outright
(network error, timeout) or comes back as a gateway-level 502/503/504 — a
real validation 4xx is never routed to the relay, since that's a customer
mistake, not an outage. The relay is entirely optional: with
`VITE_RELAY_BASE_URL` unset, a failed submission behaves exactly as it did
before this existed.

The customer sees the same "thanks, we'll call you" confirmation either
way — which path saved the lead is invisible to them.

## What this handles

- **Django process crashed or is mid-deploy** — Telegram alert arrives
  within seconds; the lead saves automatically once Django is reachable
  again.
- **Postgres is down but Django is up (500s)** — same as above; the relay
  doesn't care *why* the retried POST fails, only that it eventually
  succeeds.
- **Telegram's own API is briefly down** — the immediate alert fails, but
  the retry-into-Django loop is independent, so the lead still lands in
  Postgres normally. Degraded (no instant page), not lost.

## What this does not handle

- **The customer's own device never reaches the internet at all** (dead
  WiFi, blocked JS, airplane mode). No server-side fallback can catch a
  request that never left the browser — the in-page error message and the
  shop's phone number are the real backstop here, unchanged by this design.
- **The relay process itself restarting mid-retry** (e.g. a Render redeploy
  of the relay). The retry queue lives only in memory. The Telegram alert
  for that lead already reached the desk, so the phone number isn't lost —
  but the automatic database save for that one lead is, and needs a staff
  member to add it in `/admin/` from the Telegram message. Worth upgrading
  to a durable queue (e.g. Render Key Value) only if this starts happening
  often enough to matter at the site's actual lead volume.
- **A platform-wide Render outage.** Both Django and the relay are deployed
  on Render in this design, so an incident at the hosting-platform level —
  not an application bug — takes both down together. Real independence
  would mean hosting the relay on a different provider; not done here,
  since it trades a second vendor to operate for a scenario far rarer than
  an ordinary Django crash or deploy.

## The one accepted tradeoff

When a retried lead finally saves, Django's own `notify_team_telegram()`
fires as it always does on a new lead — so the desk gets **two** Telegram
messages for that one lead: the relay's immediate one, and Django's normal
one once it recovers. This is deliberate: a duplicate ping costs nothing
(the desk just calls the number once); a silently dropped lead costs a
customer.

## Abuse protection

`POST /relay/lead` is a public endpoint that can trigger a real Telegram
message, so it's gated two ways: CORS restricted to `ALLOWED_ORIGIN` (the
site's own domain — requests from anywhere else get a 403 before any
processing happens), and a per-IP rate limit (5 requests/minute). Both must
be configured before this is safe to point real traffic at.
