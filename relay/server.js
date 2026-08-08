'use strict';

/**
 * Lead Relay — an independent fallback for the site's lead forms.
 *
 * Deployed as its own service, separate from Django, so a Django/Postgres
 * outage can't take this down with it. The frontend only ever calls this
 * when its normal POST to the Django API fails (network error, timeout, or
 * a 5xx). It does exactly two things and nothing else:
 *
 *   1. Messages the desk on Telegram immediately, straight to the Bot API —
 *      no dependency on Django or Postgres being reachable.
 *   2. Keeps retrying the exact same lead-create request against Django in
 *      the background until it succeeds, so the lead lands in Postgres
 *      through the completely normal path (same serializer, same
 *      validation as content/views.py). This service never writes to a
 *      database of its own — Postgres stays the one source of truth.
 *
 * Kept dependency-free (Node core `http`/`https` only), matching the same
 * choice already made in backend/telegram_alerts/services.py for the same
 * reason: this is a handful of sends a day, not a case for a framework.
 *
 * Full design, production dependencies, and the cases this deliberately
 * does and doesn't cover: see docs/lead-relay.md.
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const PORT = process.env.PORT || 8787;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_DESK_CHAT_ID = process.env.TELEGRAM_DESK_CHAT_ID || '';
const DJANGO_API_BASE = (process.env.DJANGO_API_BASE || '').replace(/\/+$/, '');
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const MAX_RETRY_MS = Number(process.env.MAX_RETRY_HOURS || 24) * 60 * 60 * 1000;

const LEAD_KINDS = new Set(['enquiries', 'quotes', 'callbacks']);
const KIND_LABEL = { enquiries: 'Enquiry', quotes: 'Quote request', callbacks: 'Callback request' };

// Backoff between retry attempts against Django: quick first re-check for a
// transient blip, then settling into a 5-minute cadence so a real outage
// doesn't get hammered. The last value repeats until MAX_RETRY_MS elapses.
const RETRY_DELAYS_MS = [5_000, 30_000, 60_000, 120_000, 300_000];

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5; // per IP, per window — a real customer submits once, not five times a minute
const rateLimitState = new Map(); // ip -> { count, windowStart }

function log(...args) {
  console.log(new Date().toISOString(), ...args);
}

// ---------------------------------------------------------------- Telegram

function formatMessage(kind, payload, { manual = false } = {}) {
  const label = KIND_LABEL[kind] || kind;
  const lines = [];
  if (manual) lines.push('[COULD NOT AUTO-SAVE — please log this in /admin/ manually]', '');
  lines.push(`New ${label} (via relay — backend was unreachable)`, '');
  lines.push(`Name : ${payload.name || '(not given)'}`);
  lines.push(`Phone: ${payload.phone || '(not given)'}`);
  if (payload.service) lines.push(`Service: ${payload.service}`);
  if (payload.needed_by) lines.push(`Needed by: ${payload.needed_by}`);
  if (payload.from_currency || payload.to_currency || payload.amount) {
    lines.push('', `Converting: ${payload.amount || '?'} ${payload.from_currency || '?'} -> ${payload.to_currency || '?'}`);
  }
  if (payload.message) lines.push('', `Message: ${payload.message}`);
  return lines.join('\n');
}

// Mirrors telegram_alerts/services.py's _send_one() — same API, same shape,
// deliberately never throws: a bad token or a network blip here must not
// stop the retry loop that still gets the lead into the real database.
function sendTelegram(text) {
  return new Promise((resolve) => {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_DESK_CHAT_ID) {
      log('Telegram not configured (TELEGRAM_BOT_TOKEN / TELEGRAM_DESK_CHAT_ID missing); skipping send.');
      return resolve(false);
    }
    const body = JSON.stringify({ chat_id: TELEGRAM_DESK_CHAT_ID, text });
    const req = https.request(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        timeout: 10_000,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => { raw += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) return resolve(true);
          log('Telegram send failed:', res.statusCode, raw);
          resolve(false);
        });
      },
    );
    req.on('error', (err) => { log('Telegram send error:', err.message); resolve(false); });
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.write(body);
    req.end();
  });
}

// ------------------------------------------------------ Retry-into-Django

// Never throws — a connection refused, a timeout, and a validation 400 all
// just mean "not yet", which is exactly what a boolean already says.
function postToDjango(kind, payload) {
  return new Promise((resolve) => {
    if (!DJANGO_API_BASE) return resolve(false);
    let url;
    try {
      url = new URL(`${DJANGO_API_BASE}/${kind}/`);
    } catch {
      return resolve(false);
    }
    const body = JSON.stringify(payload);
    const client = url.protocol === 'http:' ? http : https;
    const req = client.request(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        timeout: 10_000,
      },
      (res) => {
        res.resume(); // drain the body, we only need the status
        resolve(res.statusCode >= 200 && res.statusCode < 300);
      },
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.write(body);
    req.end();
  });
}

// Lives only in this process's memory — if the relay itself restarts while
// a retry is pending, that one lead's automatic save is lost (the Telegram
// alert already reached the desk, so it's a manual-entry gap, not a silent
// loss). See docs/lead-relay.md, "what this doesn't handle".
async function retryLoop(kind, payload) {
  const startedAt = Date.now();
  let attempt = 0;
  while (Date.now() - startedAt < MAX_RETRY_MS) {
    const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
    await new Promise((resolve) => setTimeout(resolve, delay));
    const ok = await postToDjango(kind, payload);
    attempt += 1;
    if (ok) {
      log(`Lead saved to Django after ${attempt} attempt(s):`, kind, payload.phone);
      return;
    }
  }
  log('Gave up retrying Django for this lead; alerting the desk to log it manually:', kind, payload.phone);
  await sendTelegram(formatMessage(kind, payload, { manual: true }));
}

// -------------------------------------------------------- Abuse protection

function withinRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitState.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitState.set(ip, { count: 1, windowStart: now });
    return true;
  }
  entry.count += 1;
  return entry.count <= RATE_LIMIT_MAX;
}

// No ALLOWED_ORIGIN configured means no CORS header is ever sent, which
// browsers already refuse to read cross-origin — fails closed, not open,
// since this endpoint can trigger a real Telegram message.
function corsOrigin(reqOrigin) {
  if (!ALLOWED_ORIGINS.length) return null;
  return ALLOWED_ORIGINS.includes(reqOrigin) ? reqOrigin : null;
}

// ------------------------------------------------------------ HTTP server

function readBody(req, maxBytes = 20_000) {
  return new Promise((resolve, reject) => {
    let data = '';
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error('payload too large'));
        req.destroy();
        return;
      }
      data += chunk;
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || '';
  const allowOrigin = corsOrigin(origin);
  if (allowOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowOrigin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if (req.method === 'GET' && req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('ok');
  }

  if (req.method === 'POST' && req.url === '/relay/lead') {
    if (!allowOrigin) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      return res.end('origin not allowed');
    }

    const ip = req.socket.remoteAddress || 'unknown';
    if (!withinRateLimit(ip)) {
      res.writeHead(429, { 'Content-Type': 'text/plain' });
      return res.end('too many requests');
    }

    let parsed;
    try {
      parsed = JSON.parse(await readBody(req));
    } catch {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      return res.end('bad request');
    }

    const { kind, payload } = parsed || {};
    if (!LEAD_KINDS.has(kind) || !payload || typeof payload !== 'object') {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      return res.end('unknown lead kind');
    }
    if (!payload.name || !payload.phone) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      return res.end('missing name/phone');
    }

    // Respond immediately — the customer never waits on Telegram or on
    // Django recovering. Everything after this line is fire-and-forget.
    res.writeHead(202, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ relayed: true }));

    sendTelegram(formatMessage(kind, payload));
    retryLoop(kind, payload).catch((err) => log('retryLoop crashed unexpectedly:', err));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('not found');
});

server.listen(PORT, () => log(`Lead relay listening on :${PORT}`));
