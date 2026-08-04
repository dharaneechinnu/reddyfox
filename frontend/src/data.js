/**
 * Static site content for Reddy Forex Private Limited.
 *
 * SOURCE OF TRUTH: everything here is taken from the live reddyforex.com
 * (index.html, about-us.html, contact.html, faq.html), scraped July 2026.
 *
 * Rules for editing this file:
 *  - Do NOT invent licence numbers, certifications, branch counts, customer
 *    ratings, transaction volumes or staff names. This is a regulated money
 *    changer; unverifiable claims are a legal risk.
 *  - Company name / phones / address / email live in company.js, not here.
 *  - Currency rates, testimonials and FAQs come from the backend, not here.
 */

// Descriptions marked "site copy" are verbatim from reddyforex.com.
export const SERVICES = [
  {
    id: 'exchange', tag: '01', title: 'Foreign Exchange',
    short: 'Buying and selling foreign currency',
    // site copy
    body: 'We buy and sell foreign currencies and travelers cheques at competitive rates. It is the right place for both encashing and purchasing of foreign currencies and travelers cheques.',
    hero: 'Buy and sell foreign currency and travellers cheques at competitive rates.',
    benefits: [
      ['Buy and sell', 'We handle both encashing and purchasing of foreign currencies and travellers cheques.', 'benefit_exchange-1'],
      ['As per RBI guidelines', 'We undertake to buy and sell foreign currencies and en-cash travellers cheques as per RBI guidelines.', 'benefit_exchange-2'],
      ['Competitive rates', 'Our rates are considered to be among the most competitive in the market.', 'benefit_exchange-3'],
      ['Cash limit', 'You can buy forex up to ₹49,999 by cash. Above ₹50,000 must be paid by crossed cheque, demand draft or bank transfer (RTGS/NEFT).', 'benefit_exchange-4'],
    ],
    process: [
      ['Call for a quote', 'Ring the shop for the day’s rate on the currency you need.'],
      ['Bring your documents', 'Passport and travel documents, plus payment as per the RBI cash limit.'],
      ['Collect at the counter', 'Counted at the counter at our T. Nagar shop.'],
    ],
  },
  {
    id: 'money-transfer', tag: '02', title: 'Money Transfer',
    short: 'Western Union, MoneyGram',
    // site copy (Western Union section)
    body: 'We provide a secure way to send and receive money to and from your loved ones worldwide. We offer a quick, convenient and easy way to transfer your money worldwide.',
    hero: 'Send and receive money worldwide through Western Union and MoneyGram.',
    benefits: [
      ['Western Union', 'Receive money from anywhere with the Western Union transfer service.', 'money-transfer_western-union'],
      ['MoneyGram', 'Send and receive international transfers through MoneyGram.', 'money-transfer_moneygram'],
    ],
    process: [
      ['Choose your service', 'Tell us which network the sender used, or which you want to send by.'],
      ['Bring valid ID', 'Government photo ID as required for the transfer.'],
      ['Collect or send', 'Completed at the counter, in partnership with banks.'],
    ],
  },
  {
    id: 'remittance', tag: '03', title: 'Money Remittance',
    short: 'Outward forex remittance from Chennai',
    // site copy
    body: 'We specialize in providing the Money Remittance Services are Fast, Easy and Reliable money transfer services to our valuable customers. We offer complete outward forex remittance service in Chennai.',
    hero: 'Complete outward forex remittance service in Chennai.',
    benefits: [
      ['Outward remittance', 'Complete outward forex remittance service handled in Chennai.', 'benefit_remittance-1'],
      ['Bank partnerships', 'Delivered in partnership with banks and various exchange companies.', 'benefit_remittance-2'],
      ['Purpose-based', 'Overseas education, family maintenance, immigration, medical treatment, conferences, seminars and trade fairs.', 'benefit_remittance-3'],
      ['LRS limit', 'Up to USD 2,50,000 or equivalent per person per calendar year under the Liberalised Remittance Scheme.', 'benefit_remittance-4'],
    ],
    process: [
      ['Tell us the purpose', 'Education, family maintenance, medical treatment, immigration or business travel.'],
      ['Provide documents', 'Supporting documents for the declared purpose.'],
      ['We remit', 'Released through our banking partners.'],
    ],
  },
  {
    id: 'forex-card', tag: '04', title: 'Prepaid Foreign Currency Card',
    short: 'Multi-currency travel card',
    body: 'A multi-currency travel card is a prepaid card in which you can load multiple currencies on one single card — useful for travel, study and business trips.',
    hero: 'One prepaid card, up to 15 currencies loaded together.',
    benefits: [
      ['15 currencies on one card', 'You can load 15 currencies on your multi-currency travel card.', 'benefit_forex-card-1'],
      ['Three year validity', 'The validity period of the card is 3 years (subject to the card issued).', 'benefit_forex-card-2'],
      ['Where it works', 'The card is not valid in India, Nepal and Bhutan — it is for use abroad.', 'benefit_forex-card-3'],
      ['Encash the balance', 'Unused currency purchased through us can be encashed at the market rate on the day of exchange.', 'benefit_forex-card-4'],
    ],
    process: [
      ['Apply at the shop', 'Bring your passport and travel documents.'],
      ['Load your currencies', 'Choose which of the 15 currencies to load and how much.'],
      ['Travel', 'Use the card abroad; encash any balance with us on return.'],
    ],
  },
  {
    id: 'wire-transfer', tag: '05', title: 'Drafts / TT / Swift Transfer',
    short: 'Wire transfers and demand drafts',
    // site copy
    body: 'A wire transfer is an electronic funds transfer made from one individual or entity to another, through your bank online, at your local branch or through a forex dealer nearby.',
    hero: 'Wire transfers, telegraphic transfers, demand drafts and SWIFT.',
    benefits: [
      ['SWIFT transfer', 'Electronic funds transfer to overseas beneficiaries.', 'benefit_wire-transfer-1'],
      ['Demand drafts', 'Demand drafts and telegraphic transfers arranged.', 'benefit_wire-transfer-2'],
      ['Handled at the counter', 'Arranged through a forex dealer rather than requiring you to deal with your bank directly.', 'benefit_wire-transfer-3'],
      ['Payment modes', 'Amounts above ₹50,000 by cheque, demand draft or bank transfer (RTGS/NEFT), per RBI rules.', 'benefit_wire-transfer-4'],
    ],
    process: [
      ['Share beneficiary details', 'Bank name, account and SWIFT code of the receiving bank.'],
      ['Confirm the rate', 'We quote the rate and charges before you fund.'],
      ['Release', 'Transfer released through our banking partners.'],
    ],
  },
  {
    id: 'student-services', tag: '06', title: 'Student Services',
    short: 'University fees, maintenance and accommodation',
    body: 'Foreign university tuition fee payments, students maintenance and students accommodation fees — remitted for students going abroad and those already studying overseas.',
    hero: 'University fees, living costs and accommodation, remitted for students abroad.',
    benefits: [
      ['University tuition fees', 'Foreign university tuition fee payments remitted directly.', 'benefit_student-services-1'],
      ['Students maintenance', 'Recurring maintenance remittances for students studying overseas.', 'benefit_student-services-2'],
      ['Accommodation fees', 'Students accommodation fees paid to the institution or landlord abroad.', 'benefit_student-services-3'],
      ['Under LRS', 'Education remittances fall under the Liberalised Remittance Scheme annual limit.', 'benefit_student-services-4'],
    ],
    process: [
      ['Bring the invoice', 'University fee invoice or accommodation demand.'],
      ['We prepare the remittance', 'Purpose recorded as education under LRS.'],
      ['Funds released', 'Sent to the university or provider abroad.'],
    ],
  },
];

export const NAV = [
  ['Home', '/'], ['Exchange rates', '/rates'], ['Services', '/services'],
  ['About', '/about'], ['Contact', '/contact'],
];

// FAQs and testimonials come from the backend (Wagtail Snippets -> see
// src/api.js). Edit them at /cms/, not here.

// Only claims the business actually publishes.
export const HERO_TRUST = [
  { value: '25 yrs', label: 'Of experience' },
  { value: '2000', label: 'Serving Chennai since' },
  { value: 'RBI', label: 'Authorised money changer' },
];

export const STATS = [
  { value: '25 yrs', label: 'Years of experience', note: 'Serving private and corporate clients since 2000.' },
  { value: 'RBI', label: 'Authorised money changer', note: 'Licensed and regulated by the Reserve Bank of India.' },
  { value: '15', label: 'Currencies on one card', note: 'Loadable on a single multi-currency travel card, valid 3 years.' },
  { value: '₹49,999', label: 'Cash payment limit', note: 'Above this, payment by cheque, DD or bank transfer per RBI rules.' },
];

// Drawn from the "Why Us?", "Our Team" and "Authorised Money Changers"
// sections of reddyforex.com.
export const REASONS = [
  { n: '01', title: 'RBI authorised money changer', body: 'Our company was approved by the RBI to carry out foreign exchange transactions. We undertake to buy and sell foreign currencies and en-cash travellers cheques as per RBI guidelines.' },
  { n: '02', title: 'Competitive rates', body: 'We offer an array of value added customer service at best competitive rates. In fact our rates are considered to be the most competitive in the market.' },
  { n: '03', title: 'Trained, multilingual staff', body: 'Our company is represented by committed, qualified, highly trained, experienced and multilingual front office staff to address the specific needs of the customers in a highly professional manner.' },
  { n: '04', title: 'A full range of products', body: 'We deal in all kinds of foreign exchange products — currencies, travellers cheques, travel money cards, wire transfer (TT) and demand drafts. Our motto is to provide competitive rates and service to all our customers.' },
];

export const FOOTER_COLS = [
  {
    title: 'SERVICES',
    links: [
      ['Foreign exchange', '/services/exchange'],
      ['Money transfer', '/services/money-transfer'],
      ['Money remittance', '/services/remittance'],
      ['Prepaid currency card', '/services/forex-card'],
      ['Drafts / TT / SWIFT', '/services/wire-transfer'],
    ],
  },
  {
    title: 'COMPANY',
    links: [
      ['About us', '/about'],
      ['Services', '/services'],
      ['FAQ', '/faq'],
      ['Contact', '/contact'],
    ],
  },
];

// The only compliance claim the business publishes.
export const CERTS = [
  { title: 'RBI authorised', body: 'Reddy Forex Private Limited is licensed and regulated by the Reserve Bank of India as an authorised money changer, approved to carry out foreign exchange transactions.' },
  { title: 'As per RBI guidelines', body: 'We buy and sell foreign currencies and en-cash travellers cheques as per RBI guidelines, including the prescribed limits on cash payment and currency carried abroad.' },
  { title: 'In partnership with banks', body: 'Money transfer and remittance services are delivered in partnership with banks and established exchange companies.' },
];

export const FILTERS = ['All', 'Popular', 'Favourites', 'Europe', 'Asia-Pacific', 'Middle East', 'Americas'];

export function fmt(n, dp) {
  const d = dp === undefined ? 2 : dp;
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
}
