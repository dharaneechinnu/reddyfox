/**
 * Real company facts, taken from reddyforex.com (index.html, about-us.html,
 * contact.html, faq.html) — scraped July 2026.
 *
 * Single source of truth: do not hardcode a phone number or address anywhere
 * else. If a claim is not in here, it is not something the business has
 * actually published — do not invent licence numbers, branch counts,
 * certifications, ratings or transaction volumes.
 */

export const COMPANY = {
  legalName: 'Reddy Forex Private Limited',
  shortName: 'Reddy Forex',
  wordmark: 'Reddy Forex',
  wordmarkSub: 'PRIVATE LIMITED',
  tagline: 'We specialize in providing the Money Exchange Services are Fast',
  since: 2000,
  yearsExperience: 25, // as published on the site

  /**
   * Customers served since 2000.
   *
   * PROVENANCE: not from reddyforex.com — this figure does not appear on the
   * old site. It was given directly by the business owner on 9 August 2026,
   * when the site copy was being reviewed, and confirmed as a number the
   * business stands behind. Recorded here with that provenance precisely
   * because it is the kind of claim this file exists to police: a customer
   * count is exactly what "do not invent ratings or transaction volumes" is
   * about, and the only thing separating this one from an invented figure is
   * that the owner supplied it.
   *
   * It was first asked for as "25,000+ in 10 years" and corrected to 25 years
   * on the way in — the business has been trading since 2000, which every other
   * figure on the site is measured from, and two different ages for the same
   * company is the sort of contradiction a regulator reads as carelessness.
   *
   * Do not raise this number without asking the owner again.
   */
  customersServed: '25,000+',
  regulator: 'Licensed and Regulated by Reserve Bank of India',
  regulatorShort: 'RBI Authorised Money Changer',

  vision: 'To be a leader in the banking sector by improving the performance of financial and banking transactions.',
  mission: 'We endeavour to give “value for money” services through transparent, affordable, safe and conveniently accessible channels.',
};

export const CONTACT = {
  addressLines: [
    'Shop No 105, Challa Mall,',
    '17, Thyagaraya Road, T. Nagar,',
    'Chennai, Tamil Nadu 600017',
  ],
  addressNote: '(Opposite Globus)',
  addressOneLine: 'Shop No 105, Challa Mall, 17 Thyagaraya Road, T. Nagar, Chennai, Tamil Nadu 600017 (Opposite Globus)',

  // Mobile numbers — display form and tel: form
  mobiles: [
    { display: '+91 99414 56261', tel: '+919941456261' },
    { display: '+91 95516 99221', tel: '+919551699221' },
    { display: '+91 95516 99055', tel: '+919551699055' },
  ],
  landlines: [
    { display: '044-24353596', tel: '+914424353596' },
    { display: '044-24353604', tel: '+914424353604' },
  ],
  email: 'reddyforex@gmail.com',
  website: 'www.reddyforex.com',
};

/**
 * Counter opening hours — the fallback shape, mirroring what
 * /api/site-settings/ returns under `hours` (see content.SiteSetting.hours).
 * Staff edit the real values in the Django admin; this is only what the site
 * shows while that request is in flight or if it fails, so the header never
 * renders an empty hours slot.
 *
 * `openNow` is deliberately null here rather than a guess: with no live data
 * the honest answer is "we don't know yet", and useOpenStatus works it out
 * from the times below instead of trusting a stale flag.
 */
export const HOURS = {
  timezone: 'Asia/Kolkata',
  weekday: { label: 'Monday – Saturday', labelShort: 'Mon – Sat', closed: false, opens: '09:30', closes: '19:00', display: '9:30 AM – 7:00 PM' },
  sunday: { label: 'Sunday', labelShort: 'Sun', closed: true, opens: null, closes: null, display: 'Closed' },
  note: '',
  openNow: null,
};

// Real profile URLs taken from reddyforex.com (all three verified live).
// `icon` maps to a path in components/SocialIcon.jsx.
export const SOCIALS = [
  {
    icon: 'facebook',
    label: 'Facebook',
    url: 'https://www.facebook.com/Reddy-Forex-Private-Limited-100909432036543',
  },
  {
    icon: 'x',
    label: 'X (formerly Twitter)',
    // The site links to twitter.com/ReddyForex; x.com is the current domain and
    // resolves to the same profile.
    url: 'https://x.com/ReddyForex',
  },
  {
    icon: 'youtube',
    label: 'YouTube',
    url: 'https://www.youtube.com/channel/UCrFuWjK4Yfma9A6RMbywE5g',
  },
];
