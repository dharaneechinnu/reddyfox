const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export async function fetchCurrencies() {
  const res = await fetch(`${API_BASE}/rates/`);
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
 * Submit the contact form. Returns the success payload, or throws an Error
 * whose `.fieldErrors` holds per-field messages from DRF when it rejected the
 * data, so the form can show them next to the right inputs.
 */
export async function submitEnquiry(payload) {
  const res = await fetch(`${API_BASE}/enquiries/`, {
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
  throw new Error(`Could not send your enquiry (${res.status}). Please call us instead.`);
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
