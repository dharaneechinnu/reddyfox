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

## Onboarding a staff member (manual, v1)

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
the row entirely.

**A note for later, not needed now:** if the team grows past a handful of people, a
self-service flow (admin generates a one-time invite link, staff clicks it, the bot
auto-captures their `chat_id` via a webhook) is worth building — the manual `getUpdates` lookup
above doesn't scale past a few onboardings. Not built; the extra webhook infrastructure isn't
earning its keep yet at this size.

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
