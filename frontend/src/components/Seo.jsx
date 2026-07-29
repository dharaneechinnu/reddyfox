import { useEffect } from 'react';
import { CONTACT } from '../company';

const SITE_URL = `https://${CONTACT.website}`;
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

function upsertMeta(attr, key, content) {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function upsertJsonLd(id, data) {
  let el = document.head.querySelector(`script[data-seo-jsonld="${id}"]`);
  if (!data) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.setAttribute('data-seo-jsonld', id);
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

/**
 * Sets per-page title, meta description, canonical URL, Open Graph/Twitter
 * tags, and (optionally) a JSON-LD block — all via direct DOM writes, so no
 * new dependency (react-helmet etc.) is needed for a site this size.
 *
 * Caveat this can't fix: this is a client-rendered SPA, so these tags land
 * in the DOM after JS runs, not in the initial HTML response. Crawlers that
 * don't execute JavaScript only ever see the static defaults in index.html.
 * See docs/seo-and-ai-discoverability.md for what that means in practice and
 * the recommended next step (prerendering/SSR).
 */
export default function Seo({ title, description, path = '/', jsonLd, jsonLdId = 'page', noindex = false }) {
  useEffect(() => {
    const fullTitle = title ? `${title} | Reddy Forex` : 'Reddy Forex Private Limited — Foreign Currency Exchange in Chennai';
    document.title = fullTitle;

    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
    upsertLink('canonical', `${SITE_URL}${path}`);

    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', `${SITE_URL}${path}`);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:image', DEFAULT_IMAGE);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', description);

    upsertJsonLd(jsonLdId, jsonLd);

    return () => upsertJsonLd(jsonLdId, null);
  }, [title, description, path, jsonLd, jsonLdId, noindex]);

  return null;
}

export { SITE_URL };
