# MCP server — editing site content from Claude or ChatGPT

The site exposes a [Model Context Protocol](https://modelcontextprotocol.io)
server at `POST /mcp/`. Connect Claude or ChatGPT to it and staff can say
"here's a photo of the counter, put it on the About page" or "add this
question to the FAQ" in a chat, instead of learning the Django admin.

It is the **only** way into this codebase that writes content other than
`/admin/` itself. The public `/api/` surface stays read-only — that rule
hasn't moved, and there is a test asserting it (`PublicApiIsStillReadOnlyTests`).

---

## The safety model

This is a regulated money changer. A fabricated customer quote is a fake
review and a confidently wrong sentence about an RBI cash limit is a
compliance problem, so the server is built to make those hard rather than
trusting the prompt.

**1. Text arrives unpublished; photos arrive published.**

| Created via MCP | Default | Why |
|---|---|---|
| Testimonial, FAQ | Hidden — a person publishes it in `/admin/` | Makes factual claims. Someone signs off before the public sees it. |
| Site photo | Live immediately | Makes no claim, is obvious at a glance, and is replacing a placeholder that the upload exists to remove. |

Both are overridable per call (`publish: true` / `publish: false`), so the
default is a speed bump, not a wall.

**2. Every call is scoped.** A token grants any of `read`, `images`,
`content`. `tools/list` only returns the tools a token can actually use —
a read-only token never sees `create_testimonial`, so the model never tries it.

**3. Every call is logged.** `Admin → MCP server → MCP call log` records the
token, tool, outcome and a one-line summary — including failures. Arguments are
never stored: an image upload's are megabytes of base64 and a summary is what
makes the table safe to keep forever.

**4. The model is told the rule.** The `initialize` response carries
instructions repeating the never-invent-a-fact rule, so it is in context from
the first message of every session, not just in this file.

**5. New FAQ categories can't be created here.** Filing a question under a
misremembered category name is an error, not a licence to invent a new section
of the FAQ page. Add categories in `/admin/`.

---

## Issuing a token

Either from the command line:

```bash
python manage.py create_mcp_token "Claude desktop — Priya" --images --content
```

…or in `Admin → MCP server → MCP tokens → Add`. Both print the secret **once**
— only a SHA-256 hash is stored, so there is nowhere to look it up later. If
it's lost, revoke it and issue another.

Scopes default to read-only; pass `--images` / `--content` for write access.
Issue one token per person and per client rather than sharing one: revoking
then costs one checkbox, and the audit log says which of them did what.

Tokens can be given an expiry, and unticking **Active** revokes one instantly.

---

## Connecting a client

The server speaks MCP over Streamable HTTP with a static bearer token:

```
POST https://<your-host>/mcp/
Authorization: Bearer rfx_mcp_…
Content-Type: application/json
```

**Production needs HTTPS.** The token is sent on every request, so an
http:// connection publishes it to anything on the path. `SECURE_SSL_REDIRECT`
is already on whenever `DEBUG=False`.

### Claude

Claude Desktop's config talks to local (stdio) servers, so a remote server is
bridged with `mcp-remote`. In `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "reddy-forex": {
      "command": "npx",
      "args": [
        "-y", "mcp-remote",
        "https://<your-host>/mcp/",
        "--header", "Authorization:Bearer rfx_mcp_…"
      ]
    }
  }
}
```

On claude.ai, the same URL can be added under **Settings → Connectors → Add
custom connector**.

### ChatGPT

Add it under **Settings → Connectors** (custom/developer connectors), pointing
at the same `https://<your-host>/mcp/` URL with the bearer token as the auth
header.

Both products move their connector UI around; the URL and header above are the
contract, and any client that speaks Streamable HTTP will work with them.

### Verifying without a client

The endpoint is plain JSON-RPC, so `curl` is enough to prove it works:

```bash
curl -sS https://<your-host>/mcp/ \
  -H "Authorization: Bearer rfx_mcp_…" \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | python -m json.tool
```

A `401` means the token is wrong, revoked or expired — the response is
deliberately identical for all three, so a probe can't tell them apart.

---

## The tools

| Tool | Scope | What it does |
|---|---|---|
| `get_content_overview` | read | Counts of photos, testimonials and FAQs, and what's awaiting review. **The cheapest first call.** |
| `list_image_slots` | read | Every photo slot, filled or empty, with URLs and alt text. |
| `list_testimonials` | read | Testimonials, published and hidden. |
| `list_faqs` | read | FAQs and the valid category names. |
| `upload_site_image` | images | Put a base64 photo into a slot. |
| `update_site_image` | images | Change alt text or show/hide, without re-uploading. |
| `create_testimonial` | content | Add a customer quote (hidden by default). |
| `update_testimonial` | content | Edit or publish one. |
| `create_faq` | content | Add a question (hidden by default). |
| `update_faq` | content | Edit, recategorise or publish one. |

### Uploading a photo

`upload_site_image` takes the image as base64 — either bare, or as a
`data:image/png;base64,…` URI, which is what you get when a photo is pasted
into a chat rather than read off disk. JPEG, PNG and WebP; anything over
1600px on its longest side is resized on the way in, exactly as an admin
upload would be.

Slot names are fixed and come from `list_image_slots` — they map one-to-one
onto the placeholder blocks in the React frontend. Uploading into a slot that
already has a photo replaces it and deletes the old file, so repeatedly
re-uploading the same slot can't fill the production disk with orphans.

---

## Configuration

All optional — the defaults are sensible.

| Setting | Default | Notes |
|---|---|---|
| `MCP_MAX_IMAGE_MB` | `8` | Matches the admin's own upload limit, so a photo that works in one works in the other. |
| `MCP_RATE_LIMIT_CALLS` | `120` | Per token, per window. |
| `MCP_RATE_LIMIT_WINDOW_SECONDS` | `60` | |

Raising `MCP_MAX_IMAGE_MB` also raises Django's `DATA_UPLOAD_MAX_MEMORY_SIZE`,
which is derived from it in `settings.py` — base64 inflates a payload by a
third, and Django rejects an oversized body before any view runs, so the two
have to move together or uploads start failing at the parser with a confusing
error.

**Rate limiting is approximate under multiple workers.** It counts in Django's
cache, and the default local-memory cache is per-process, so with N gunicorn
workers the real ceiling is N times the limit. That still bounds a runaway
assistant, which is the point. Point `CACHES` at Redis or Memcached if you need
it exact.

---

## Local development

```bash
python manage.py migrate
python manage.py create_mcp_token "Local dev" --images --content
python manage.py runserver
# then POST http://localhost:8000/mcp/ with the printed token
```

Everything is covered by `python manage.py test mcp_server` (72 tests: the
protocol handshake and version negotiation, auth and revocation, scope
enforcement, rate limiting, argument validation, every tool's happy path and
its main failure modes, the audit trail, and a check that the public API is
still read-only).

---

## Design notes

**Why the protocol is implemented here rather than pulled in.** The official
Python MCP SDK is ASGI; this project runs gunicorn/WSGI. Adopting it would put
every other request in the app on a new server stack to gain one endpoint. The
subset a tools-only server needs — `initialize`, `tools/list`, `tools/call`,
`ping`, notifications — is a few hundred lines of JSON-RPC in `protocol.py` and
`views.py`, and it is all testable with Django's own test client. If this ever
grows resources, prompts or sampling, revisit that trade.

**Why it's stateless.** The transport allows answering each POST with a single
JSON response instead of holding an SSE stream open. Nothing here needs to push
to the client, so there is no session to track, nothing to lose on a restart,
and no affinity requirement between requests and workers.

**Why `/mcp/` and not `/api/mcp/`.** `/api/` is the public, read-only surface
the website itself fetches. This is neither public nor read-only, and keeping
it out of that namespace means nobody has to remember an exception to the rule
that everything under `/api/` is safe to expose.

**Protocol versions.** `2025-06-18`, `2025-03-26` and `2024-11-05` are
accepted; `initialize` echoes the client's version when it's one of them and
otherwise replies with the newest, letting the client decide. JSON-RPC batches
were dropped in `2025-06-18` but are still answered, because an older client
sending one is cheaper to support than to fail.
