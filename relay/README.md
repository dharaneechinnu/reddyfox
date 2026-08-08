# Lead relay

An independent fallback for the site's three lead forms (enquiry, quote,
callback). It exists for one situation only: **the Django API is
unreachable** when a customer submits a form. See
[`docs/lead-relay.md`](../docs/lead-relay.md) at the repo root for the full
design, why it's built this way, and — importantly — the cases it does and
doesn't cover. This file is just how to run and deploy it.

## What it is not

Not a copy of the backend, not a second database, not a message queue. It's
one HTTP route, no dependencies beyond Node itself, that does two things when
it receives a lead the frontend couldn't save normally: messages the desk on
Telegram right away, and keeps retrying the real save against Django in the
background until it succeeds.

## Local dev

```bash
cd relay
cp .env.example .env   # fill in TELEGRAM_BOT_TOKEN, TELEGRAM_DESK_CHAT_ID, DJANGO_API_BASE, ALLOWED_ORIGIN
node --env-file=.env server.js   # Node 20+; on older Node, export the vars yourself first
```

Health check: `curl http://localhost:8787/healthz` → `ok`.

Manual test of the whole path:

```bash
curl -X POST http://localhost:8787/relay/lead \
  -H "Content-Type: application/json" \
  -H "Origin: <one of your ALLOWED_ORIGIN values>" \
  -d '{"kind":"enquiries","payload":{"name":"Test","phone":"9999999999","message":"relay smoke test"}}'
```

Expect a `202 {"relayed":true}` response immediately, a Telegram message
within a couple of seconds, and — once `DJANGO_API_BASE` is reachable — a new
row in `/admin/` a few seconds after that from the retry loop.

## Deploying (Render)

Create it as its own **Web Service**, separate from the existing Django
service — that separation is the entire point; if it shared a service with
Django, a Django crash would take the fallback down with it.

- Root directory: `relay`
- Build command: `npm install` (there's nothing to install — this just
  confirms `package.json` is valid; the app has zero dependencies)
- Start command: `npm start`
- Health check path: `/healthz`
- Environment variables: everything in `.env.example`, with `ALLOWED_ORIGIN`
  set to the live site's real domain(s) and `DJANGO_API_BASE` set to the
  deployed backend's real `/api` URL

## Environment variables

See [`.env.example`](./.env.example) — every variable is documented inline
there, not duplicated here.
