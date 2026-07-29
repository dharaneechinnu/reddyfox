const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export async function fetchCurrencies() {
  const res = await fetch(`${API_BASE}/rates/`);
  if (!res.ok) throw new Error(`Failed to load rates (${res.status})`);
  return res.json();
}

export async function fetchConverterSettings() {
  const res = await fetch(`${API_BASE}/converter-settings/`);
  if (!res.ok) throw new Error(`Failed to load converter settings (${res.status})`);
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
