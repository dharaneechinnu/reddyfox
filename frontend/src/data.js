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
 * and `student-services` derive from the original scrape; no new source
 * material has been supplied for those three yet.
 *
 * PLAIN ENGLISH (August 2026). Every description here was rewritten to be read
 * easily by someone whose first language is not English, on a phone, in a
 * hurry. Short sentences, everyday words, no financial jargon where a plain
 * word exists: "papers" not "documentation", "we buy it back" not "encashment
 * of unused foreign currency", "how much you can pay in cash" not "cash limit
 * as per prescribed thresholds".
 *
 * That rewrite changed WORDING ONLY. Every fact, figure, limit and named
 * partner survived it unchanged — the ₹49,999 cash limit and the banking
 * channels above it, USD 2,50,000 under the LRS, 15 currencies, three years'
 * validity, the not-in-India/Nepal/Bhutan restriction, Western Union and
 * MoneyGram, the accepted ID list, same-day home delivery. Check any edit here
 * against that list before shipping it: on a regulated money changer, a
 * simplification that quietly drops a limit is a compliance problem, not a
 * style change.
 *
 * There is no longer any verbatim "site copy" in this file — the three entries
 * that carried that marker (`remittance`, `wire-transfer`, `student-services`)
 * were reworded too, so the marker was removed rather than left lying about
 * text that no longer matches reddyforex.com word for word. The facts in them
 * still trace to that scrape.
 *
 * Rules for editing this file:
 *  - Do NOT invent licence numbers, certifications, branch counts, customer
 *    ratings, transaction volumes or staff names. This is a regulated money
 *    changer; unverifiable claims are a legal risk.
 *  - Company name / phones / address / email live in company.js, not here.
 *  - Currency rates, testimonials and FAQs come from the backend, not here.
 */

import { COMPANY } from './company';

export const SERVICES = [
  {
    id: 'exchange', tag: '01', title: 'Foreign Exchange',
    short: 'Buy and sell foreign money. We can bring it to your home the same day.',
    body: 'We buy and sell foreign money at good rates, following all RBI rules. We can also bring it to your home the same day, so you do not have to come to the shop.',
    hero: 'Buy or sell foreign money the easy way. Good rates, all RBI rules followed, and same-day delivery to your home if you want it.',
    benefits: [
      ['Buy and sell', 'Buy foreign money for a holiday, for studies, for business or for medical treatment. Back home with money left over? We buy it back. Our staff have done this for years and will walk you through it.', 'benefit_exchange-1'],
      ['Approved by the RBI', 'We are an RBI Authorised Money Changer. Every deal follows the latest Reserve Bank of India rules. We check your papers properly and tell you what we are doing at each step. Nothing is hidden.', 'benefit_exchange-2'],
      ['Fair rates', 'Our rates are fair and follow the market, with no hidden charges. Good value whether you are a traveller, a student or a business.', 'benefit_exchange-3'],
      ['How much you can pay in cash', 'You can pay in cash up to ₹49,999. For ₹50,000 and above, RBI rules say you must pay through a bank — crossed cheque, demand draft, NEFT or RTGS. Our team will help you do this.', 'benefit_exchange-4'],
      ['Same-day home delivery', 'We can bring your foreign money to your home the same day. You do not need to come to the shop.', 'benefit_exchange-5'],
    ],
    process: [
      ['Ask us today’s rate', 'Call us or drop in and ask what the rate is for the money you need. You can also ask what papers to bring, how to pay, and what the RBI rules say — all before you come.'],
      ['Come in with your papers', 'Bring your passport and travel papers, and your payment as per the cash limit. We check everything and explain the rules that apply to you.'],
      ['Take your money', 'Once your papers and payment are checked, we count your foreign money and hand it over at our T. Nagar, Chennai shop. Or ask us to bring it to your home the same day.'],
    ],
  },
  {
    id: 'money-transfer', tag: '02', title: 'Money Transfer',
    short: 'Send and receive money through Western Union and MoneyGram. Home delivery same day.',
    body: 'Send money to family and friends anywhere in the world, or collect money someone has sent you. We do this through Western Union and MoneyGram, and we can deliver to your home the same day.',
    hero: 'Send or collect money from abroad in three simple steps, through Western Union and MoneyGram. Same-day home delivery available.',
    benefits: [
      ['Western Union', 'Send money abroad, or collect money someone has sent you through Western Union. Our staff explain your choices, the limits, and the rules that apply.', 'money-transfer_western-union'],
      ['MoneyGram', 'Send and collect money from abroad through MoneyGram. We handle it safely at our counter.', 'money-transfer_moneygram'],
      ['Bring your ID', 'You need one government photo ID every time — passport, Aadhaar card, PAN card, driving licence or voter ID. This is required by RBI rules and by international money rules. Some transfers need extra papers; we will tell you which.', 'benefit_money-transfer-1'],
      ['How much you can pay in cash', 'You can pay in cash up to ₹49,999 for a money transfer. For ₹50,000 and above, RBI rules say you must pay by crossed cheque, demand draft or bank transfer (RTGS/NEFT).', 'benefit_money-transfer-2'],
      ['Same-day home delivery', 'We can come to your home the same day. You do not need to come to the shop.', 'benefit_money-transfer-3'],
    ],
    process: [
      ['Tell us what you need', 'Come in and tell our staff whether you want to send money abroad or collect money someone has sent you. We explain what is needed and help you pick the right one.'],
      ['Bring your ID', 'Bring a government photo ID, along with any other papers your transfer needs under RBI rules.'],
      ['We finish it for you', 'We check your papers and complete the transfer safely. Sending: fill in the form, give us the receiver’s details, pay the amount and the charges, and take your receipt and reference number. Collecting: bring your ID, and the Money Transfer Control Number (MTCN) if you have it.'],
    ],
  },
  {
    id: 'remittance', tag: '03', title: 'Money Remittance',
    short: 'Send money out of India, from Chennai',
    body: 'We send money abroad for you — quickly, simply and safely. We handle the whole job here in Chennai, from start to finish.',
    hero: 'Send money out of India from Chennai, start to finish.',
    benefits: [
      ['Money sent out of India', 'We handle the whole job of sending your money abroad, here in Chennai.', 'benefit_remittance-1'],
      ['Backed by banks', 'We work with banks and other exchange companies to move your money.', 'benefit_remittance-2'],
      ['What you can send it for', 'Studies abroad, money for your family, moving abroad, medical treatment, and conferences, seminars or trade fairs.', 'benefit_remittance-3'],
      ['Your limit for the year', 'Up to USD 2,50,000 — or the same amount in another currency — per person, per calendar year, under the Liberalised Remittance Scheme.', 'benefit_remittance-4'],
    ],
    process: [
      ['Tell us why you are sending it', 'Studies, money for family, medical treatment, moving abroad or business travel.'],
      ['Bring your papers', 'The papers that go with the reason you gave us.'],
      ['We send it', 'Your money goes out through our partner banks.'],
    ],
  },
  {
    id: 'forex-card', tag: '04', title: 'Prepaid Foreign Currency Card',
    short: 'One travel card that holds many currencies. Home delivery same day.',
    body: 'A travel card you put money on before you go. One card can hold several currencies at the same time — handy for holidays, studies and work trips. We can deliver it to your home the same day.',
    hero: 'One card for the whole trip. Put up to 15 currencies on it, use it for three years, and have it brought to your home the same day.',
    benefits: [
      ['15 currencies, one card', 'Put up to 15 major world currencies on a single travel card. No changing money again and again while you travel, and you can top it up whenever you need to.', 'benefit_forex-card-1'],
      ['Lasts three years', 'The card works for up to three years (as per the card issuer’s terms and conditions), so one card covers several trips — good for students, working people and anyone who flies often.', 'benefit_forex-card-2'],
      ['Where you can use it', 'It works at millions of shops, restaurants, hotels, malls and ATMs around the world, wherever the card network is accepted. It is for use outside India only — RBI rules say it cannot be used in India, Nepal or Bhutan.', 'benefit_forex-card-3'],
      ['Money left over? We buy it back', 'Any foreign money still on the card after your trip can be changed back to rupees with us, at the rate on that day. Rules and terms apply. Clear rates, and our staff help you through it.', 'benefit_forex-card-4'],
      ['Same-day home delivery', 'We can bring your travel card to your home the same day. You do not need to come to the shop.', 'benefit_forex-card-5'],
    ],
    process: [
      ['Apply at the shop', 'Bring your passport, your visa (if you need one), your confirmed ticket, and anything else RBI rules ask for. Our team checks your papers and shows you how the card works.'],
      ['Put your money on it', 'Pick from up to 15 currencies and decide how much to put on the card. We give you a good rate and load the card safely before you fly.'],
      ['Travel', 'Use the card abroad for shopping, eating out, hotels, online payments and cash from ATMs. Back in India, come to us to change any money left on it back to rupees — the day’s rate and the usual terms apply.'],
    ],
  },
  {
    id: 'wire-transfer', tag: '05', title: 'Drafts / TT / Swift Transfer',
    short: 'Bank wire transfers and demand drafts',
    body: 'A wire transfer moves money from one person or company to another, electronically. You can do it through your own bank — or you can do it here with us instead.',
    hero: 'Wire transfers, telegraphic transfers, demand drafts and SWIFT.',
    benefits: [
      ['SWIFT transfer', 'Send money electronically to someone abroad.', 'benefit_wire-transfer-1'],
      ['Demand drafts', 'We arrange demand drafts and telegraphic transfers.', 'benefit_wire-transfer-2'],
      ['We do it for you', 'Handled here at our counter, so you do not have to sort it out with your own bank.', 'benefit_wire-transfer-3'],
      ['How to pay', 'For amounts above ₹50,000, pay by cheque, demand draft or bank transfer (RTGS/NEFT), as RBI rules require.', 'benefit_wire-transfer-4'],
    ],
    process: [
      ['Give us the receiver’s details', 'Their bank name, their account number, and the SWIFT code of their bank.'],
      ['We tell you the rate', 'You see the rate and the charges before you pay anything.'],
      ['We send it', 'The money goes out through our partner banks.'],
    ],
  },
  {
    id: 'student-services', tag: '06', title: 'Student Services',
    short: 'University fees, living costs and rent',
    body: 'We send money abroad for students — university fees, money to live on, and rent. For students about to go, and for those already studying there.',
    hero: 'University fees, living costs and rent, sent abroad for students.',
    benefits: [
      ['University fees', 'We pay your university fees straight to the university abroad.', 'benefit_student-services-1'],
      ['Money to live on', 'Regular payments sent out to students studying abroad.', 'benefit_student-services-2'],
      ['Rent', 'Accommodation fees paid to the university or to the landlord abroad.', 'benefit_student-services-3'],
      ['Counts under the LRS limit', 'Money sent abroad for education counts towards your yearly Liberalised Remittance Scheme limit.', 'benefit_student-services-4'],
    ],
    process: [
      ['Bring the bill', 'Your university fee invoice, or the rent demand.'],
      ['We get it ready', 'We record the reason as education, under the LRS.'],
      ['The money goes out', 'Sent to the university or to the landlord abroad.'],
    ],
  },
];

// "Contact" carries #form like every other route into a form does. It was left
// as a bare /contact on the argument that someone tapping a nav tab might want
// the address and the opening hours rather than the form, and being scrolled
// past both would be its own bug. That argument lost: the address, the hours
// and the map are all still on the page a short scroll below, whereas landing
// on a heading with the form off-screen makes the tab look like it did nothing.
// Getting a phone number in front of a dealer is what this site is for, so the
// tab named after that goes to the form.
export const NAV = [
  ['Home', '/'], ['Exchange rates', '/rates'], ['Services', '/services'],
  ['About', '/about'], ['FAQ', '/faq'], ['Contact', '/contact#form'],
];

// FAQs and testimonials come from the backend (Wagtail Snippets -> see
// src/api.js). Edit them at /cms/, not here.

// Six, in a two-column grid, so it reads as three rows rather than an odd cell
// left over. Every one is a figure the business publishes: the customer count
// and the founding year come from company.js (see the provenance note on
// COMPANY.customersServed — that one was supplied by the owner, not scraped),
// and the rest restate limits already spelled out in SERVICES above.
export const STATS = [
  { value: COMPANY.customersServed, label: 'Customers served', note: `At our T. Nagar counter, since ${COMPANY.since}.` },
  { value: `${COMPANY.yearsExperience} yrs`, label: 'Years of experience', note: 'Looking after people and companies in Chennai since 2000.' },
  { value: 'RBI', label: 'Authorised money changer', note: 'Licensed and watched over by the Reserve Bank of India.' },
  { value: '15', label: 'Currencies on one card', note: 'All on a single travel card, good for 3 years.' },
  { value: '₹49,999', label: 'Most you can pay in cash', note: 'Above this, pay by cheque, DD or bank transfer — RBI rules.' },
  { value: 'Same day', label: 'Home delivery in Chennai', note: 'Your money brought to your door on the same day.' },
];

// Drawn from the "Why Us?", "Our Team" and "Authorised Money Changers"
// sections of reddyforex.com — reworded into plain English (see the file
// header). The claims are unchanged: RBI approval, rates "considered to be the
// most competitive in the market", trained multilingual front-office staff,
// and the full product range. Nothing new was added; "most competitive in the
// market" in particular is the business's own published wording and is kept as
// its own claim rather than upgraded into anything stronger.
export const REASONS = [
  { n: '01', title: 'Approved by the RBI', body: 'The Reserve Bank of India has approved us to deal in foreign money. We buy and sell foreign currency and cash travellers cheques, following RBI rules.' },
  { n: '02', title: 'Rates that are hard to beat', body: 'You get extra help and service on top of a good rate. Our rates are considered to be among the most competitive in the market.' },
  { n: '03', title: 'Staff who know the job — and your language', body: 'The people at our counter are trained, experienced and speak several languages. They take the time to work out what you actually need.' },
  { n: '04', title: 'Everything in one shop', body: 'Foreign money, travellers cheques, travel cards, wire transfers (TT) and demand drafts — we handle all of it. Good rates and good service, for every customer.' },
  // The two points the owner asked to have said plainly: how many people have
  // been through the counter, and that we deal in many currencies rather than
  // just dollars. Both are backed — the count by COMPANY.customersServed (owner
  // supplied, see the provenance note there), the currencies by the travel
  // card's published 15 and by the live rate board.
  { n: '05', title: `${COMPANY.customersServed} customers served`, body: `More than 25,000 people and companies have changed money with us since ${COMPANY.since}. Most come back, and most come to us because someone told them to.` },
  { n: '06', title: 'Many currencies, not just dollars', body: 'Dollars, pounds, euros, dirhams, Singapore and Australian dollars and more — see the live board for what we are holding today. A travel card alone takes up to 15 of them at once.' },
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
      ['Contact', '/contact#form'],
    ],
  },
];

// The only compliance claim the business publishes.
export const CERTS = [
  { title: 'Approved by the RBI', body: 'Reddy Forex Private Limited is licensed by the Reserve Bank of India as an authorised money changer, and approved to deal in foreign money.' },
  { title: 'We follow RBI rules', body: 'We buy and sell foreign money and cash travellers cheques as RBI rules require — including the limits on paying in cash, and on how much you may carry abroad.' },
  { title: 'We work with banks', body: 'Money transfers and money sent abroad are handled together with banks and well-known exchange companies.' },
];

export const FILTERS = ['All', 'Popular', 'Favourites', 'Europe', 'Asia-Pacific', 'Middle East', 'Americas'];

export function fmt(n, dp) {
  const d = dp === undefined ? 2 : dp;
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
}
