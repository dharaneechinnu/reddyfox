const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

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

/**
 * POST a lead to one of the three create-only endpoints. Returns the success
 * payload, or throws an Error whose `.fieldErrors` holds per-field messages
 * from DRF, so the form can show them next to the right inputs.
 */
async function postLead(path, payload) {
  const res = await fetch(`${API_BASE}/${path}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (res.ok) return res.json();

  if (res.status === 429) {
    const err = new Error('Too many submissions from this connection. Please wait a while, or call us instead.');
    err.throttled = true;
    throw err;
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
export const submitRateLock = (payload) => postLead('rate-locks', payload);
export const submitCallbackRequest = (payload) => postLead('callbacks', payload);

/**
 * Registers this browser's FCM token for rate-alert push notifications.
 * Safe to call repeatedly with the same token — the backend upserts it.
 */
export async function subscribeToNotifications(fcmToken) {
  const res = await fetch(`${API_BASE}/notifications/subscribe/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fcm_token: fcmToken, user_agent: navigator.userAgent }),
  });
  if (!res.ok) throw new Error(`Could not subscribe to rate alerts (${res.status})`);
  return res.json();
}

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

export function popularCodes(list) {
  return list
    .filter((c) => c.is_popular)
    .sort((a, b) => a.display_order - b.display_order)
    .map((c) => c.code);
}
