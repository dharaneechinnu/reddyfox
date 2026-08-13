/**
 * What each of the six services asks for.
 *
 * One entry per `SERVICES` id in data.js. The pop-up (ServiceRequestModal.jsx)
 * is a renderer with no knowledge of any particular service — everything that
 * makes a Money Transfer form different from a Student Services form is here,
 * as data, so adding a question is an edit to this file and nothing else.
 *
 * Name, phone and consent are NOT listed: every form has them and the modal
 * adds them itself. What's here is only what differs.
 *
 * `cta` is the label on the button that OPENS this form, on the service's own
 * page — deliberately per-service rather than one "Ask for a price" everywhere.
 * A button that names the thing it does ("Get a travel card") tells the reader
 * what happens next; a generic one makes them find out by pressing it. `sub`
 * and `submitLabel` are the dialog's own subheading and its submit button.
 *
 * ## How a field reaches the backend
 *
 * A field with `column` set is written to that real column on the lead
 * (`from_currency`, `amount`, `needed_by`, `message`) — those four are columns
 * because the desk filters and sorts on them across all six services.
 * Everything else is posted in `details` as {label: answer}, keyed by the
 * label the customer actually read. See content/models.py's `Lead.details`.
 *
 * ## Field types
 *   choice    — radio pills, `options: [string]`, always has an answer
 *   select    — dropdown, `options: [string]`
 *   currency  — dropdown of the codes actually on the rate board
 *   amount    — numeric text, validated like every other amount on the site
 *   text      — single line
 *   date      — native date input (supported, but no form asks one: the desk
 *               settles timing on the call back, so a date picker was one more
 *               thing to fill in for an answer nobody read)
 *   textarea  — free text
 *
 * A field is optional unless `required: true`.
 *
 * ## The rule that governs the copy here
 *
 * These forms collect; they never quote. No field may state or imply a rate,
 * a fee or a total — the whole point of the flow is that a dealer rings back
 * with the price. Ask for the amount, never show what it converts to.
 */

const DELIVERY = ['Collect at the T. Nagar shop', 'Home delivery, same day'];

export const SERVICE_FORMS = {
  exchange: {
    heading: 'Get today’s rate for your currency',
    sub: 'Tell us what you need and a dealer calls you back with the rate. You pay nothing until you agree it.',
    cta: 'Ask for today’s rate',
    submitLabel: 'Ask for the rate',
    fields: [
      { name: 'direction', label: 'What do you want to do?', type: 'choice', options: ['Buy foreign currency', 'Sell it back to rupees'] },
      { name: 'currency', label: 'Currency', type: 'currency', required: true, column: 'from_currency' },
      { name: 'amount', label: 'Amount', type: 'amount', required: true, column: 'amount', placeholder: '1000' },
      { name: 'handover', label: 'How will you take it?', type: 'select', options: DELIVERY },
      { name: 'message', label: 'Anything else?', type: 'textarea', column: 'message', placeholder: 'Denominations you prefer, or anything else.' },
    ],
  },

  'money-transfer': {
    heading: 'Send or collect a money transfer',
    sub: 'We handle Western Union and MoneyGram at the counter. Tell us which way the money is going.',
    cta: 'Send or collect money',
    submitLabel: 'Request this transfer',
    fields: [
      { name: 'direction', label: 'Which do you need?', type: 'choice', options: ['Send money abroad', 'Collect money sent to me'] },
      { name: 'country', label: 'Which country?', type: 'text', required: true, placeholder: 'e.g. United States' },
      { name: 'currency', label: 'Currency', type: 'currency', required: true, column: 'from_currency' },
      { name: 'amount', label: 'Amount', type: 'amount', required: true, column: 'amount', placeholder: '1000' },
      // Required only when sending — there is no receiver to name when the
      // customer is the one collecting. `requiredWhen` is read by the modal.
      { name: 'receiver', label: 'Receiver’s name', type: 'text', placeholder: 'Who the transfer is for', requiredWhen: { field: 'direction', is: 'Send money abroad' } },
      { name: 'relationship', label: 'Your relationship to them', type: 'text', placeholder: 'e.g. Father, Friend, Employer', requiredWhen: { field: 'direction', is: 'Send money abroad' } },
      { name: 'message', label: 'Anything else?', type: 'textarea', column: 'message', placeholder: 'If you are collecting, add the MTCN here if you have it.' },
    ],
  },

  remittance: {
    heading: 'Send money out of India',
    sub: 'The reason for sending decides which papers you need — tell us that first and we will list them when we call.',
    cta: 'Start a remittance',
    submitLabel: 'Start my remittance',
    fields: [
      // Wording matches the five LRS purposes already published in data.js.
      { name: 'purpose', label: 'What are you sending it for?', type: 'select', options: ['Studies abroad', 'Money for family', 'Medical treatment', 'Moving abroad', 'Conference, seminar or trade fair'] },
      { name: 'country', label: 'Destination country', type: 'text', required: true, placeholder: 'e.g. Canada' },
      { name: 'currency', label: 'Currency', type: 'currency', required: true, column: 'from_currency' },
      { name: 'amount', label: 'Amount', type: 'amount', required: true, column: 'amount', placeholder: '5000' },
      { name: 'receiver', label: 'Who is receiving it?', type: 'text', required: true, placeholder: 'Name of the person or institution' },
      { name: 'message', label: 'Anything else?', type: 'textarea', column: 'message', placeholder: 'Anything about the transfer we should know before we call.' },
    ],
  },

  'forex-card': {
    heading: 'Get a prepaid travel card',
    sub: 'One card, several currencies, three years. We can bring it to your home the same day.',
    cta: 'Get a travel card',
    submitLabel: 'Request my card',
    fields: [
      { name: 'request', label: 'What do you need?', type: 'choice', options: ['A new card', 'Reload my card', 'Cash out what is left'] },
      { name: 'currency', label: 'Currency', type: 'currency', required: true, column: 'from_currency' },
      { name: 'amount', label: 'Amount to load', type: 'amount', required: true, column: 'amount', placeholder: '2000' },
      // Short enough to stay on one line in a half-width column — a label that
      // wraps to two lines drops its input below its partner's and the row
      // stops reading as a row. The placeholder carries the detail.
      { name: 'other_currencies', label: 'Other currencies?', type: 'text', placeholder: 'e.g. EUR, GBP — blank if just one' },
      { name: 'handover', label: 'How will you take it?', type: 'select', options: DELIVERY },
      { name: 'message', label: 'Anything else?', type: 'textarea', column: 'message', placeholder: 'Anything else about your trip.' },
    ],
  },

  'wire-transfer': {
    heading: 'Arrange a draft, TT or SWIFT transfer',
    sub: 'You see the rate and the charges before you pay anything. Above ₹50,000, RBI rules mean paying by cheque, DD or bank transfer.',
    cta: 'Arrange a transfer',
    submitLabel: 'Arrange this transfer',
    fields: [
      { name: 'transfer_type', label: 'Which one do you need?', type: 'choice', options: ['SWIFT transfer', 'Telegraphic transfer', 'Demand draft'] },
      { name: 'beneficiary', label: 'Beneficiary’s name', type: 'text', required: true, placeholder: 'Person or company receiving it' },
      { name: 'country', label: 'Their country', type: 'text', required: true, placeholder: 'e.g. United Kingdom' },
      { name: 'bank', label: 'Their bank name', type: 'text', placeholder: 'If you know it' },
      { name: 'currency', label: 'Currency', type: 'currency', required: true, column: 'from_currency' },
      { name: 'amount', label: 'Amount', type: 'amount', required: true, column: 'amount', placeholder: '10000' },
      // Account number and SWIFT code are deliberately NOT asked for here. They
      // are bank credentials, this form is unauthenticated, and the desk takes
      // them on the call — where they belong.
      { name: 'message', label: 'Anything else?', type: 'textarea', column: 'message', placeholder: 'Anything we should know before we call. Please do not put account numbers here — we will take those on the phone.' },
    ],
  },

  'student-services': {
    heading: 'Send money for a student abroad',
    sub: 'For students about to go and those already there. Money sent for education counts towards the yearly LRS limit.',
    cta: 'Send for a student',
    submitLabel: 'Send for a student',
    fields: [
      { name: 'payment_for', label: 'What is this payment for?', type: 'choice', options: ['University fees', 'Money to live on', 'Rent'] },
      { name: 'institution', label: 'University or institution', type: 'text', required: true, placeholder: 'Who the money goes to' },
      { name: 'country', label: 'Country', type: 'text', required: true, placeholder: 'e.g. Australia' },
      { name: 'currency', label: 'Currency', type: 'currency', required: true, column: 'from_currency' },
      { name: 'amount', label: 'Amount', type: 'amount', required: true, column: 'amount', placeholder: '12000' },
      { name: 'student', label: 'Student’s name', type: 'text', placeholder: 'If it is not you' },
      { name: 'message', label: 'Anything else?', type: 'textarea', column: 'message', placeholder: 'Invoice or reference number, if you have it.' },
    ],
  },
};

/** The form for a service id, or null if that service has no pop-up. */
export const formForService = (id) => SERVICE_FORMS[id] || null;
