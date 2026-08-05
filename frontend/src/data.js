/**
 * Static site content for Reddy Forex Private Limited.
 *
 * SOURCE OF TRUTH: originally scraped from the live reddyforex.com
 * (index.html, about-us.html, contact.html, faq.html) in July 2026. The
 * `exchange`, `money-transfer` and `forex-card` service entries were rewritten
 * in August 2026 from official copy supplied directly by Reddy Forex
 * (Word documents: currency exchange, Western Union/money transfer, forex
 * card, plus company-wide "Why Choose Reddy Forex" copy) — a more current and
 * authoritative source than the original scrape. `remittance`, `wire-transfer`
 * and `student-services` still reflect the original scrape; no new source
 * material has been supplied for those three yet.
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
    short: 'Buying and selling foreign currency, with same-day home delivery available.',
    body: 'We buy and sell foreign currencies at competitive rates, fully compliant with RBI regulations — with same-day home delivery available so you don’t need to visit the counter in person.',
    hero: 'Simple, secure and trusted foreign currency exchange — buy and sell major currencies at competitive rates, fully RBI-compliant, with same-day home delivery available.',
    benefits: [
      ['Buy and sell', 'Hassle-free buying and selling of major foreign currencies — purchase for international travel, education, business or medical purposes, plus encashment of unused foreign currency after your trip, with assistance from experienced forex professionals.', 'benefit_exchange-1'],
      ['RBI authorised and fully compliant', 'As an RBI Authorised Money Changer, every transaction is carried out in accordance with the latest Reserve Bank of India guidelines — secure, legally compliant, with proper documentation and verification and transparent procedures throughout.', 'benefit_exchange-2'],
      ['Competitive exchange rates', 'Fair, transparent, market-driven exchange rates with no hidden charges — strong value for travellers, students and businesses.', 'benefit_exchange-3'],
      ['Cash limit', 'Forex purchases up to ₹49,999 can be made in cash. Amounts of ₹50,000 and above must be completed through approved banking channels — crossed cheque, demand draft, NEFT or RTGS — in accordance with RBI guidelines. Our team guides you through the payment process.', 'benefit_exchange-4'],
      ['Same-day home delivery', 'Same-day home delivery is available for your foreign currency — no need to visit the counter in person.', 'benefit_exchange-5'],
    ],
    process: [
      ['Contact us for today’s rate', 'Call or visit Reddy Forex to check the latest exchange rate for the currency you need. Our team can also answer questions on documentation, payment methods and RBI regulations before you visit.'],
      ['Visit our branch with your documents', 'Bring your passport and travel documents, plus payment as per the RBI cash limit. Our specialists verify your documents and explain the applicable guidelines.'],
      ['Receive your foreign currency', 'Once your documents and payment are verified, your foreign currency is counted and handed over securely at our T. Nagar, Chennai branch — or choose same-day home delivery instead.'],
    ],
  },
  {
    id: 'money-transfer', tag: '02', title: 'Money Transfer',
    short: 'Western Union, MoneyGram — with same-day home delivery available.',
    body: 'We provide a secure way to send and receive money to and from your loved ones worldwide through Western Union and MoneyGram, with same-day home delivery available.',
    hero: 'Fast, secure and simple money transfers through our partnership with Western Union and MoneyGram — complete your transfer in three easy steps, with same-day home delivery available.',
    benefits: [
      ['Western Union', 'Send money internationally or receive a Western Union transfer — our forex specialists guide you through the available options, transfer limits and applicable regulations.', 'money-transfer_western-union'],
      ['MoneyGram', 'Send and receive international transfers through MoneyGram, processed securely at our counter.', 'money-transfer_moneygram'],
      ['Valid ID required', 'A valid government photo ID — passport, Aadhaar card, PAN card, driving licence or voter ID — is required for every transaction, in compliance with RBI guidelines and international financial regulations. Additional documentation may be required depending on the transaction.', 'benefit_money-transfer-1'],
      ['Cash limit', 'You can pay up to ₹49,999 in cash for a money transfer. Amounts of ₹50,000 and above must be paid by crossed cheque, demand draft or bank transfer (RTGS/NEFT), in accordance with RBI guidelines.', 'benefit_money-transfer-2'],
      ['Same-day home delivery', 'Same-day home delivery is available — no need to visit the counter in person.', 'benefit_money-transfer-3'],
    ],
    process: [
      ['Choose your service', 'Visit our branch and let our forex specialists know whether you’d like to send money internationally or receive a transfer — we’ll explain the requirements and help you choose the right option.'],
      ['Bring valid identification', 'Present a valid government-issued photo ID along with any supporting documents applicable to your transaction, as required under RBI guidelines.'],
      ['Complete your transaction', 'We verify your documents and process your transaction securely. Sending: complete the transfer form, provide recipient details, pay the amount and charges, and receive your receipt and reference number. Receiving: present your ID and the Money Transfer Control Number (MTCN) if available.'],
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
    short: 'Multi-currency travel card, with same-day home delivery available.',
    body: 'A multi-currency travel card is a prepaid card in which you can load multiple currencies on one single card — useful for travel, study and business trips, with same-day home delivery available.',
    hero: 'Everything you need for hassle-free international travel — load up to 15 currencies onto one prepaid card, valid for three years, with same-day home delivery available.',
    benefits: [
      ['15 currencies on one card', 'Load up to 15 major international currencies onto a single travel card — manage multiple currencies with one card, avoid repeated currency exchanges during your trip, and reload easily whenever required.', 'benefit_forex-card-1'],
      ['Three year validity', 'Valid for up to three years (subject to the card issuer’s terms and conditions), so the same card covers multiple trips — ideal for students, professionals and frequent international travellers.', 'benefit_forex-card-2'],
      ['Where it works', 'Accepted at millions of merchant outlets, restaurants, hotels, shopping centres and ATMs across the globe wherever the supported card network operates. For international use only — not valid in India, Nepal or Bhutan, per RBI regulations.', 'benefit_forex-card-3'],
      ['Encash the balance', 'Unused foreign currency remaining on your card after your trip can be encashed with us at the prevailing exchange rate, subject to applicable regulations and terms — transparent rates, with professional assistance throughout.', 'benefit_forex-card-4'],
      ['Same-day home delivery', 'Same-day home delivery is available for your prepaid forex card — no need to visit the counter in person.', 'benefit_forex-card-5'],
    ],
    process: [
      ['Apply at the shop', 'Visit us with your passport, valid visa (if applicable), confirmed travel ticket and any other documents required under RBI guidelines. Our executives verify your documents and explain the card features and usage.'],
      ['Load your currencies', 'Choose from up to 15 supported foreign currencies and the amount you wish to load. We offer competitive exchange rates and load your card securely before your departure.'],
      ['Travel with confidence', 'Use your card abroad for shopping, dining, hotel bookings, online payments and ATM withdrawals. After returning to India, visit us to encash any remaining balance, subject to applicable terms and exchange rates.'],
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
