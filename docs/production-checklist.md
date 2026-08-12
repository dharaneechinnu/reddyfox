# Production checklist

A pre-launch / pre-deploy checklist for the Reddy Forex website, plus what a
dead-code sweep of the frontend and backend turned up. Written after the
August 2026 redesign (indigo ground, real photography, the unified
`tokens.js` design system) landed on `main` — re-check the automated items
below after any future settings/dependency change.

## Before every deploy

- [ ] `DEBUG=False` in the production environment. Never rely on the code
      default (`True`) — `.env`/host env vars must set this explicitly.
- [ ] `SECRET_KEY` is a real, unique, randomly generated value — not the
      `django-insecure-PLACEHOLDER-...` fallback in `settings.py`. Generate
      one with `python -c "import secrets; print(secrets.token_urlsafe(50))"`.
- [ ] `ALLOWED_HOSTS` is set to the real domain(s) (comma-separated), not left
      at the `localhost,127.0.0.1` default.
- [ ] `CORS_ALLOWED_ORIGINS` is set to the real frontend origin(s) — with
      `DEBUG=False` this is enforced, not bypassed.
- [ ] `DATABASE_URL` is set (Render or equivalent) — the individual `DB_*`
      vars are a local-dev-only fallback.
- [ ] `MEDIA_ROOT` points at a **mounted persistent disk**, not the
      container's own filesystem — otherwise every staff-uploaded photo
      (`SiteImage`) is deleted on the next deploy/restart. This is the single
      easiest way to silently lose content in production.
- [ ] `ADMIN_BASE_URL` is the real HTTPS admin URL — it's used to build
      "open in admin" links inside alert emails, and Telegram webhook setup
      refuses to run against a non-HTTPS value.
- [ ] `EMAIL_HOST_USER` / `EMAIL_HOST_PASSWORD` are set if team email alerts
      should actually send — left blank, Django prints emails to the console
      instead (fine for local dev, silent in production).
- [ ] `ENQUIRY_NOTIFY_EMAILS` has at least one real address.
- [ ] `TELEGRAM_BOT_TOKEN` / `TELEGRAM_BOT_USERNAME` / `TELEGRAM_WEBHOOK_SECRET`
      are set if the Telegram channel should be live — see
      `docs/telegram-bot.md` for the full setup, including registering the
      webhook with `set_telegram_webhook`.
- [ ] `EXCHANGERATE_API_KEY` is set if you want the primary reference-rate
      provider rather than falling straight back to the free, keyless one.
- [ ] Run `python manage.py check --deploy` against the real production
      settings and address anything it flags. As of this checklist, a
      properly-configured production env still gets one worthwhile warning:
      **`security.W004`** — `SECURE_HSTS_SECONDS` isn't set. Consider setting
      it once you're confident the whole site is served over HTTPS
      permanently (see the Django docs before enabling — misconfigured HSTS
      is hard to undo for visitors who already received the header).
- [ ] `python manage.py makemigrations --check --dry-run` is clean (no
      unmigrated model changes).
- [ ] `python manage.py migrate` has been run against the production
      database.
- [ ] `python manage.py test` passes in full.
- [ ] `python manage.py collectstatic` runs as part of deploy (whitenoise
      serves the result) — Render's build step should already do this.
- [ ] `npm run lint` and `npm run build` are both clean on the frontend.
- [ ] `frontend/.env` (or the deploy platform's env vars) sets
      `VITE_API_BASE_URL` if the backend isn't on the same host — otherwise
      `api.js`'s same-host auto-detection is relied on.

## One-time / occasional setup

- [ ] `python manage.py createsuperuser` has been run for at least one admin
      account.
- [ ] `python manage.py setup_teams` has been run, and staff accounts are
      assigned to the right group (`Rates desk` / `Quotes desk` /
      `Front office` / `Manager`) with **Superuser status off** — a
      superuser bypasses group permissions entirely.
- [ ] `python manage.py seed_site_images` has been run at least once so every
      photo slot has a placeholder even before real photos are uploaded (see
      `content/models.py`'s `SiteImage.Slot` for the full list).
- [ ] `frontend/public/robots.txt`, `sitemap.xml` and `llms.txt` are in sync
      with the routes in `App.jsx`. Verified in sync as of this checklist —
      re-check whenever a route is added or removed.
- [ ] `docs/currency-rate-apis.md`'s cron job (`fetch_reference_rates`) is
      scheduled if the admin's rate typo-guard should have live data to
      compare against.

## Dead code removed in this pass

Frontend:
- `components/CallbackForm.jsx` — superseded by `CallbackBar.jsx` (the
  homepage's actual callback widget) after the redesign; left behind, never
  imported by anything.
- `App.css` — the original `npm create vite` scaffold file, never imported
  (the site's real stylesheet is `index.css` → `theme.css`).
- `data.js`'s `HERO_TRUST` — superseded by the richer `STATS` array; nothing
  read `HERO_TRUST` any more.
- `company.js`'s `PRIMARY_PHONE` — every call site reads phone numbers via
  `CONTACT.mobiles[0]` or `useCompanyInfo()` directly instead.
- `tokens.js`: `shadowLift`, `shadowPanel`, `wrapNarrow`, `eyebrow`, `pageH1`,
  `pageLead`, `crumb`, `btnOnBrandHover` — style helpers added during the
  design-token migration but never adopted at any call site (see "Follow-ups"
  below — several pages hand-roll styles these were meant to replace).
- `theme.css`: the `--fx-shadow-lift`, `--fx-shadow-panel` and
  `--fx-header-stack` custom properties (unused, and not part of the
  admin-editable theme contract — unlike `--fx-radius`, which is kept: it's
  wired to `ThemeSetting.radius` even though no component currently applies
  it, so removing it would break a live admin field for no reason).

Backend:
- `django-stubs-ext` — listed in `requirements.txt` but never imported, and
  no mypy config exists to consume it.
- `Lead.needed_by` — a model field with a migration that no serializer or
  admin form ever exposed for writing, so it was always blank in practice.
  Removed the field (new migration), and the two notification templates
  (`content/notifications.py`, `telegram_alerts/services.py`) that printed
  "(not specified)" for it on every real lead.
- Unused `from django.utils import timezone` import in `telegram_alerts/admin.py`.
- Stale "rate lock" references in `backend/config/settings.py` and
  `backend/.env.example` — the rate-lock feature was removed from the
  codebase earlier; these two comments still described it as one of the
  website's three live forms (it's enquiry/quote/callback now).
- A stray, fully-untracked `backend/notifications/` directory containing only
  `.pyc` cache files and an empty `migrations/` folder — leftover local build
  artifacts from before the Chrome-push (Firebase Cloud Messaging) app was
  deleted; never tracked by git, so there's nothing to commit, just deleted
  locally.
- `CLAUDE.md` described an entire `notifications` Django app (Chrome push /
  Firebase Cloud Messaging) that was fully removed from the codebase before
  this pass — the app doesn't exist, isn't in `INSTALLED_APPS`, and nothing
  imports it. Confirmed via the actual removal commit ("Remove Chrome push /
  Firebase Cloud Messaging entirely" — deliberate, not accidental: it was
  never switched on in production). Rewrote the Architecture section to
  describe the eight apps that actually exist today (`telegram_alerts`,
  `reference_rates` and `fx_providers` were undocumented entirely), and fixed
  the `manage.py test notifications` example command.

Also fixed, not deleted:
- `ADMIN_SITE_HEADER` — a setting that's existed for a while but was never
  wired up (`admin.site.site_header` was never assigned from it), so the
  Django admin showed the stock "Django administration" title. One line in
  `config/urls.py` now sets it.
- A stale docstring in `fetch_reference_rates.py` referencing
  `Currency.auto_update_from_reference`, a field removed and replaced by
  `ReferenceRateSettings.auto_update_enabled` — updated to match.

## Follow-ups (not done in this pass — flagging for a decision)

- **Incomplete design-token adoption.** The dead-code sweep found several
  pages hand-rolling button/heading styles that duplicate what `btnPrimary`,
  `btnGhost`, `pageH1`/`pageLead`/`crumb` (before this pass removed the
  latter three as unused) were built to standardize — e.g.
  `pages/ServiceDetail.jsx`'s second button, `pages/Login.jsx` and
  `pages/Faq.jsx`'s primary buttons. Worth a dedicated pass to actually
  adopt the shared helpers (or re-add the three heading helpers once real
  call sites are updated to use them) rather than carry two versions of the
  same style indefinitely.
- **PR #62** ("Creative, animated forex-themed 404 page") now has merge
  conflicts against `main` — it was built against the pre-redesign token
  system (`c.navy`, `c.orange`, inline style objects) before the design
  system migration landed. Needs a rebase onto the current `tokens.js`
  (`c.page`, `btnPrimary`/`btnGhost`, etc.) or a decision to close it, since
  `main`'s `NotFound.jsx` has already been simplified back to a plain page
  in the meantime.
- **`ENQUIRY_THROTTLE_RATE`'s scope.** Confirmed accurate as "enquiry, quote,
  callback" in this pass, but if a fourth lead type is ever added (per
  `CLAUDE.md`'s guidance on that), this comment and the `.env.example` note
  next to it will need updating again.
