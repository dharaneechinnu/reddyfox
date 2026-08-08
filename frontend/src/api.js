/**
 * Where the Django API lives. `VITE_API_BASE_URL` is the explicit override —
 * always set it for a production build, since frontend and backend are
 * deployed as separate origins there.
 *
 * Locally, with no override set, the backend address is derived from
 * whatever host the browser used to load this page, on the assumption the
 * backend is running on the same machine at port 8000 (`manage.py runserver`'s
 * default). That covers `localhost`, `127.0.0.1`, this machine's LAN IP, and
 * a phone on the same WiFi identically — none of them need a hardcoded IP in
 * `.env` that breaks the moment you switch networks. See "Testing on a
 * phone" in CLAUDE.md.
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL || (
  import.meta.env.DEV ? `${window.location.protocol}//${window.location.hostname}:8000/api` : '/api'
);

// Optional. Left unset, a lead submission that can't reach Django just fails
// as before — this is a backup path, not a requirement. See relay/README.md
// and docs/lead-relay.md for what this service is and why it's separate
// from Django (so a Django outage can't take the fallback down with it).
const RELAY_BASE = import.meta.env.VITE_RELAY_BASE_URL || '';

// rateType defaults to 'cash' — the rate used everywhere except the Forex
// Card toggle on the rates table, so every existing caller keeps working
// unchanged now that a currency code alone no longer identifies one row.
export async function fetchCurrencies(rateType = 'cash') {
  const res = await fetch(`${API_BASE}/rates/?rate_type=${rateType}`);
  if (!res.ok) throw new Error(`Failed to load rates (${res.status})`);
  return res.json();
}

/**
 * Public contact options (WhatsApp number, label, prefilled greeting), managed
 * in the Django admin under Content -> Site settings. The wa.me URL is built
 * server-side, so the number format lives in exactly one place.
 */
export async function fetchSiteSettings() {
  const res = await fetch(`${API_BASE}/site-settings/`);
  if (!res.ok) throw new Error(`Failed to load site settings (${res.status})`);
  return res.json();
}

/**
 * The site's design tokens, managed in Django admin under Theme -> Theme.
 * Returns {css_variables: {"--fx-brand": "#E2571F", ...}, fonts_url: "..."};
 * ThemeContext writes those onto :root. A failure here should leave the site on
 * its compiled-in default theme, never unstyled — see that file.
 */
export async function fetchTheme() {
  const res = await fetch(`${API_BASE}/theme/`);
  if (!res.ok) throw new Error(`Failed to load theme (${res.status})`);
  return res.json();
}

/**
 * {key: boolean} map of every feature flag, managed in Django admin under
 * Feature flags. A key absent from the response (flag deleted, or the
 * request failed) should be treated as enabled by the caller — see
 * useFeatureFlag in context/FeatureFlagsContext.jsx, which fails open.
 */
export async function fetchFeatureFlags() {
  const res = await fetch(`${API_BASE}/flags/`);
  if (!res.ok) throw new Error(`Failed to load feature flags (${res.status})`);
  return res.json();
}

async function fetchWithTimeout(url, options, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Backend down, mid-deploy, or the DB unreachable shows up here as a
// gateway-level 5xx, never as a normal DRF error response. A 4xx is a real
// validation problem, not an outage, so it's never routed to the relay.
const GATEWAY_ERROR_STATUSES = [502, 503, 504];

// Only fires when the normal save above has already failed. Hands the same
// payload to the relay so the desk still gets paged on Telegram immediately
// and the lead still lands in Postgres once Django recovers — see
// docs/lead-relay.md. If the relay isn't configured, or is itself
// unreachable, this just re-throws the original error so the customer sees
// the usual "please call us instead" message.
async function relayFallback(kind, payload, originalErr) {
  if (!RELAY_BASE) throw originalErr;
  try {
    const res = await fetchWithTimeout(`${RELAY_BASE}/relay/lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, payload }),
    }, 5000);
    if (!res.ok) throw originalErr;
    return { relayed: true };
  } catch {
    throw originalErr;
  }
}

/**
 * POST a lead to one of the three create-only endpoints. Returns the success
 * payload, or throws an Error whose `.fieldErrors` holds per-field messages
 * from DRF, so the form can show them next to the right inputs.
 *
 * On a network failure or timeout — Django unreachable, not a validation
 * problem — falls back to the lead relay instead of failing outright.
 */
async function postLead(path, payload) {
  let res;
  try {
    res = await fetchWithTimeout(`${API_BASE}/${path}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }, 8000);
  } catch {
    return relayFallback(path, payload, new Error('Could not reach the server. Please call us instead.'));
  }

  if (res.ok) return res.json();

  if (res.status === 429) {
    const err = new Error('Too many submissions from this connection. Please wait a while, or call us instead.');
    err.throttled = true;
    throw err;
  }

  if (GATEWAY_ERROR_STATUSES.includes(res.status)) {
    return relayFallback(path, payload, new Error(`Could not send your request (${res.status}). Please call us instead.`));
  }

  let data = null;
  try { data = await res.json(); } catch { /* non-JSON error body */ }

  if (data && typeof data === 'object') {
    const fieldErrors = {};
    for (const [key, value] of Object.entries(data)) {
      if (key === 'detail') continue;
      fieldErrors[key] = Array.isArray(value) ? value[0] : String(value);
    }
    const err = new Error(data.detail || 'Please check the highlighted fields and try again.');
    if (Object.keys(fieldErrors).length) err.fieldErrors = fieldErrors;
    throw err;
  }
  throw new Error(`Could not send your request (${res.status}). Please call us instead.`);
}

export const submitEnquiry = (payload) => postLead('enquiries', payload);
export const submitQuoteRequest = (payload) => postLead('quotes', payload);
export const submitCallbackRequest = (payload) => postLead('callbacks', payload);

export async function fetchTestimonials() {
  const res = await fetch(`${API_BASE}/testimonials/`);
  if (!res.ok) throw new Error(`Failed to load testimonials (${res.status})`);
  return res.json();
}

// homepageOnly=true returns just the subset staff flagged for the homepage accordion.
export async function fetchFaqs({ homepageOnly = false } = {}) {
  const url = homepageOnly ? `${API_BASE}/faqs/?homepage=true` : `${API_BASE}/faqs/`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load FAQs (${res.status})`);
  return res.json();
}

export async function fetchFaqCategories() {
  const res = await fetch(`${API_BASE}/faq-categories/`);
  if (!res.ok) throw new Error(`Failed to load FAQ categories (${res.status})`);
  return res.json();
}

/**
 * Staff-uploaded photos, one per fixed slot (Django admin -> Content -> Site
 * images). Returns {slot: {url, alt_text}} rather than the raw array so a
 * page can do `images['home_why_us']` and just fall back to its existing
 * placeholder swatch when that key is missing — no upload yet is a normal,
 * unbroken state, same as every other optional content block on this site.
 */
export async function fetchSiteImages() {
  const res = await fetch(`${API_BASE}/site-images/`);
  if (!res.ok) throw new Error(`Failed to load site images (${res.status})`);
  const list = await res.json();
  return list.reduce((map, img) => { map[img.slot] = img; return map; }, {});
}

// Converts the Django API shape into the {code: {n, cc, b, s, d, r}} map
// used throughout the frontend, and adds INR as the identity base currency.
export function toRatesMap(list) {
  const map = {
    INR: { n: 'Indian Rupee', cc: 'IN', b: 1, s: 1, d: 0, r: 'Asia-Pacific' },
  };
  for (const c of list) {
    map[c.code] = {
      n: c.name,
      cc: c.country_code,
      b: Number(c.buy_rate),
      s: Number(c.sell_rate),
      d: Number(c.change_pct),
      r: c.region,
    };
  }
  return map;
}

// Most recent updated_at across the board, formatted for display in IST.
// Real value from the database — never hardcode a "last updated" time.
export function latestUpdatedAt(list) {
  const stamps = list.map((c) => new Date(c.updated_at).getTime()).filter((n) => !Number.isNaN(n));
  if (!stamps.length) return null;
  return new Date(Math.max(...stamps)).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    hour12: false, timeZone: 'Asia/Kolkata',
  }) + ' IST';
}

// Currencies no longer carry an is_popular flag — the homepage board/ticker just highlights
// the first `limit` currencies in staff-set display_order (already how the API sorts them).
export function popularCodes(list, limit = 8) {
  return list
    .slice()
    .sort((a, b) => a.display_order - b.display_order)
    .slice(0, limit)
    .map((c) => c.code);
}
