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

// The primary number to surface in the header / CTAs.
export const PRIMARY_PHONE = CONTACT.mobiles[0];
