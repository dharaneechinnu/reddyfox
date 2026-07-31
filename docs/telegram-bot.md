# Telegram staff alerts: setup and how it works

Every new lead (enquiry, quote request, callback, rate lock) already emails the desk
(`content/notifications.py`). This adds a second, faster channel: an instant Telegram
message to whichever staff the admin has explicitly approved. See `docs/team-notifications.md`
for why speed-to-lead matters commercially — this doc is just the how-to.

Nothing about the customer's experience changes. This is purely a second way for the desk to
find out about a lead that already exists.

## The two-gate model

1. **Identity** — proven when a staff member's Telegram account messages the bot. Telegram
   hands us their `chat_id`, a permanent identifier for that conversation.
2. **Authorization** — a brand-new `chat_id` gets nothing until an admin creates a
   `TelegramSubscriber` row for it in `/admin/` and it's active. Messaging the bot alone never
   grants access to anything.

Revoking someone is one click: untick `is_active` on their row. No redeploy, no code change.

## One-time setup: creating the bot

1. Open Telegram, search for `@BotFather`, start a chat.
2. Send `/newbot`, follow the prompts (name + a username ending in `bot`).
3. BotFather replies with a token that looks like `123456789:AAH...`. That's the secret —
   treat it exactly like the Firebase service account key or the ExchangeRate-API key already
   in this project: environment variable only, never in code or in git.
4. Set it locally in `backend/.env`:

   ```
   TELEGRAM_BOT_TOKEN=123456789:AAH...
   ```

   And as an environment variable on the Render web service in production (see
   `backend/.env.example` for the documented variable).

No business verification, no approval queue — the bot is usable within a minute of creation.

## Production webhook setup (do this once per environment)

Onboarding by QR code (below) needs Telegram to push updates to us the instant someone messages
the bot — that requires registering a **webhook**, not the manual `getUpdates` polling used by
the fallback method further down.

1. Pick two real secrets and set them (locally in `backend/.env`, and as Render environment
   variables in production):

   ```
   TELEGRAM_WEBHOOK_PATH_SECRET=<random string>
   TELEGRAM_WEBHOOK_SECRET=<a different random string>
   ```

   Generate each with `python -c "import secrets; print(secrets.token_urlsafe(32))"`. The
   defaults in `.env.example` are obvious placeholders (`changeme-...`) on purpose — a deploy
   that forgot to set them is caught in review, not silently insecure.
2. Set `TELEGRAM_BOT_USERNAME` (no `@`, no `https://t.me/` — just the username BotFather gave
   you) — needed to build the deep link a QR code encodes.
3. Make sure `ADMIN_BASE_URL` is the real `https://` production domain (Telegram refuses to
   register a non-HTTPS webhook).
4. Run, once, after every deploy where any of the above changed:

   ```
   python manage.py set_telegram_webhook
   ```

5. Verify it's registered and healthy any time (safe to run repeatedly, read-only):

   ```
   python manage.py check_telegram_webhook
   ```

**Security model** — two independent checks, not one:

- **The URL path itself** includes `TELEGRAM_WEBHOOK_PATH_SECRET`, an unguessable segment —
  defense in depth, not the real gate.
- **The `X-Telegram-Bot-Api-Secret-Token` header**, set via `secret_token` when registering the
  webhook, echoed back by Telegram on every real call. `telegram_alerts/views.py` rejects any
  request where this doesn't match `TELEGRAM_WEBHOOK_SECRET` — this is the actual proof a
  request came from Telegram and not something else that found the URL.

**Local development can't receive real webhooks** — Telegram needs a public HTTPS URL, and
`localhost` isn't one. `set_telegram_webhook` refuses to run against a non-HTTPS
`ADMIN_BASE_URL` for exactly this reason. Use the manual onboarding method below for local
testing; test the QR/webhook path for real once, against a staging or production deploy.

## Onboarding a staff member — QR code (primary method)

1. Django admin → **Telegram alerts → Telegram invites → Add**.
2. Type a label (e.g. "Ravi — counter") — nothing else to fill in — and save.
3. The invite's page shows a QR code and a plain link, both encoding the same thing: a
   Telegram deep link with a one-time, unguessable token, expiring in
   `TELEGRAM_INVITE_EXPIRY_HOURS` (24 by default).
4. Staff member scans the QR code with their phone camera (or opens the link directly),
   Telegram opens a chat with the bot, they tap **Start**.
5. That's it — no chat_id lookup, no admin action needed. The webhook creates their
   `TelegramSubscriber` row automatically, marked active, and the bot replies confirming it
   worked.

The admin still creates the invite in the first place, so this doesn't loosen the two-gate
model above — it only makes the *identity* step (Gate 1) faster than the manual lookup below.
An invite that's expired, already claimed, or was revoked (an admin action on the **Telegram
invites** list, for an unclaimed one) can't be used again — scanning an old QR code just gets a
"this invite has expired" reply from the bot, nothing is created.

## Onboarding a staff member — manual lookup (fallback)

Still available, and the only option for local development (no public webhook there):

1. The staff member searches for the bot's username in Telegram and sends it any message
   (e.g. "hi"). This is the only thing they need to do.
2. Find their `chat_id`. With `TELEGRAM_BOT_TOKEN` set, visit (in a browser, while logged in
   as whoever holds the token — this URL contains the secret token, so don't share it):

   ```
   https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getUpdates
   ```

   The JSON response includes `"message": {"chat": {"id": 123456789, ...}, "from": {"first_name": "..."}}`
   for every message sent to the bot. Match the name to find their `chat_id`.
3. In Django admin → Telegram alerts → Telegram subscribers → **Add**, enter their name and
   that `chat_id`, save. `is_active` defaults on — creating the row is the approval.
4. Test it: submit the homepage "Get best price" form (or any lead form) and confirm the
   message arrives.

To remove access later, either untick `is_active` (keeps the record, pauses alerts) or delete
the row entirely — same either way, regardless of which onboarding method was used.

## What actually gets sent

`telegram_alerts/services.py::format_message()` — a short version of the email body, sized for
a phone notification, not the full record:

```
New Callback request

Name : Deborah Beck
Phone: +91 9876543210

Converting: 500.00 USD → INR

Call: tel:+919876543210
```

Only what a dealer needs to call back. Full detail (message text, service selected, rate-lock
expiry, etc.) is still in the email and in `/admin/`.

## Failure handling

Same discipline as every other notification channel on this site:

- The lead is always saved before any Telegram call is attempted.
- `TELEGRAM_BOT_TOKEN` unset, no active subscribers, a network error, or Telegram rejecting a
  `chat_id` are all caught and logged — never raised. A broken bot must never cost a lead or
  block the email alert, which fires independently.
- Every attempt is recorded in `TelegramDelivery` (success or failure, per subscriber, per
  lead) — visible read-only in `/admin/`, the same audit-trail pattern as the Chrome push
  `NotificationDelivery` log.

## Compliance note

Customer name and phone number now leave the database to a third-party consumer messenger.
Same DPDP Act 2023 consideration flagged in `docs/team-notifications.md` for any channel that
copies lead PII off-platform: worth a retention and lawful-basis note, and keeping the
subscriber list to actual staff, not a shared/public group.

## Pros and cons

| | |
|---|---|
| **Cost** | Free — no per-message fee, no vendor contract |
| **Setup** | Minutes, no verification or approval process (unlike WhatsApp Business API) |
| **Reach** | Works globally, instantly, no SMS-style per-message billing |
| **Degrades gracefully** | If Telegram is down, the existing email alert still arrives — this channel is additive, never a replacement |
| **Dependency** | Relies on a third party's servers for something business-critical — email must stay as the permanent fallback |
| **Data handling** | A consumer app now holds customer PII — see the compliance note above |
| **Bot token** | A real secret — anyone holding it can send messages as the bot; treat it accordingly |

## Related reading

- `docs/team-notifications.md` — why this channel was recommended, and the ranked list of
  alternatives (Chrome push, WhatsApp, SMS, Slack/Google Chat).
- `docs/product-reference.md` — the channel cost comparison table this fits into.
