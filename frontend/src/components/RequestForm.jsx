import { SERVICES } from '../data';
import { useFx } from '../context/FxContext';
import { c } from '../tokens';
import { useCompanyInfo } from '../context/CompanyInfoContext';
import { validateEmail, validatePhone, validateRequired } from '../validation';
import { submitEnquiry, submitQuoteRequest } from '../api';
import useLeadForm from '../hooks/useLeadForm';
import { ConsentCheck, ErrorSummary, Field, Honeypot, SubmitButton, formCard } from './FormBits';
import LeadSuccess from './LeadSuccess';

const MONEY_TRANSFER = 'Money Transfer';
const isMoneyTransfer = (service) => service === MONEY_TRANSFER;

const COPY = {
  quote: {
    id: 'quote',
    heading: 'Request a free quote',
    submitLabel: 'Get my quote',
    submitFn: submitQuoteRequest,
    successHeading: (firstName) => `Thank you, ${firstName} — your quote request is in`,
    successBody: (v) => (
      isMoneyTransfer(v.service)
        ? <>Our team will come back to you to arrange the transfer of <strong>{v.amount} {v.from_currency}</strong> to <strong>{v.recipient_name || 'your receiver'}</strong>. If it is urgent, please call us.</>
        : <>Our dealers will come back to you with a price for <strong>{v.amount} {v.from_currency}</strong>. If it is urgent, please call us.</>
    ),
    resetLabel: 'Request another quote',
  },
  enquiry: {
    id: 'enq',
    heading: 'Send an enquiry',
    submitLabel: 'Send now',
    submitFn: submitEnquiry,
    successHeading: (firstName) => `Thank you, ${firstName} — we have your enquiry`,
    successBody: () => 'It has reached our team and someone will get back to you. If it is urgent, please call us.',
    resetLabel: 'Send another enquiry',
  },
};

/**
 * Shared form behind both "Get a quote" (Quote.jsx) and "Send an enquiry"
 * (Contact.jsx) — the two collect identical information, so one component
 * keeps them from drifting apart. Currency and amount are always required.
 * Money Transfer additionally asks who's receiving the money and the
 * sender's relationship to them (the "Full name" field doubles as the
 * sender's name in that case). `kind` only changes the heading/copy and
 * which endpoint it posts to; both still land as their own Lead.Kind in the
 * admin (Enquiry vs QuoteRequest), so staff permissions and the desk inbox
 * stay separate.
 *
 * `initialService`, when passed, pre-selects the dropdown — used when a
 * visitor arrives from a specific service's page (see ServiceDetail.jsx)
 * so the right fields are already showing on load.
 */
export default function RequestForm({ kind, initialService }) {
  const fx = useFx();
  const { primaryPhone } = useCompanyInfo();
  const copy = COPY[kind];
  const ID = copy.id;

  const VALIDATORS = {
    name: (v) => validateRequired(v, 'full name'),
    phone: (v) => validatePhone(v),
    email: (v) => validateEmail(v),
    from_currency: (v) => (v ? null : 'Please choose a currency.'),
    amount: (v) => {
      const raw = String(v || '').trim();
      if (!raw) return 'Please enter how much you need.';
      const n = Number(raw.replace(/,/g, ''));
      if (Number.isNaN(n)) return 'Enter the amount in numbers only.';
      if (n <= 0) return 'Amount must be greater than zero.';
      if (n > 100000000) return 'That amount is too large for an online request — please call us.';
      return null;
    },
    recipient_name: (v, all) => (isMoneyTransfer(all.service) ? validateRequired(v, "receiver's name") : null),
    relationship: (v, all) => (isMoneyTransfer(all.service) ? validateRequired(v, 'relationship to the receiver') : null),
    consent: (v) => (v ? null : 'Please tick the consent box so we can reply to you.'),
  };

  const f = useLeadForm({
    initial: {
      name: '', phone: '', email: '',
      service: initialService || SERVICES[0]?.title || '',
      recipient_name: '',
      relationship: '',
      from_currency: 'USD',
      amount: '',
      message: '',
      consent: false,
      enquiry_ref: '',
    },
    validators: VALIDATORS,
    idPrefix: ID,
    submitFn: (v) => {
      const transfer = isMoneyTransfer(v.service);
      return copy.submitFn({
        name: v.name.trim(),
        phone: v.phone.trim(),
        email: v.email.trim(),
        service: v.service,
        recipient_name: transfer ? v.recipient_name.trim() : '',
        relationship: transfer ? v.relationship.trim() : '',
        from_currency: v.from_currency,
        amount: String(v.amount).replace(/,/g, '').trim(),
        message: v.message.trim(),
        enquiry_ref: v.enquiry_ref,
      });
    },
  });

  if (f.result) {
    return (
      <LeadSuccess
        heading={copy.successHeading(f.values.name.trim().split(' ')[0])}
        onReset={f.reset}
        resetLabel={copy.resetLabel}
      >
        {copy.successBody(f.values)}
      </LeadSuccess>
    );
  }

  const transfer = isMoneyTransfer(f.values.service);
  // Only offer currencies actually on the board.
  const currencies = fx.currencyList.filter((x) => x.code !== 'INR');

  return (
    <form noValidate onSubmit={f.handleSubmit} style={formCard}>
      <h2 style={{ fontSize: 22, fontWeight: 600, color: c.navy, margin: '0 0 24px' }}>{copy.heading}</h2>

      <Honeypot id={`${ID}-enquiry_ref`} value={f.values.enquiry_ref} onChange={(e) => f.setField('enquiry_ref', e.target.value)} />
      <ErrorSummary count={f.errorCount} serverError={f.serverError} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(200px,100%),1fr))', gap: 16, marginBottom: 16 }}>
        <Field
          id={`${ID}-name`} label={transfer ? "Sender's name" : 'Full name'} error={f.errorFor('name')}
          value={f.values.name} onChange={(e) => f.setField('name', e.target.value)}
          onBlur={() => f.handleBlur('name')} placeholder="As per your Goverment ID" autoComplete="name"
        />
        <Field
          id={`${ID}-phone`} label="Phone" error={f.errorFor('phone')} type="tel" inputMode="tel"
          value={f.values.phone} onChange={(e) => f.setField('phone', e.target.value)}
          onBlur={() => f.handleBlur('phone')} placeholder="+91 99414 56261" autoComplete="tel"
        />
        <Field
          id={`${ID}-email`} label="Email" error={f.errorFor('email')} type="email" inputMode="email"
          value={f.values.email} onChange={(e) => f.setField('email', e.target.value)}
          onBlur={() => f.handleBlur('email')} placeholder="name@email.com" autoComplete="email"
        />
        <Field
          id={`${ID}-service`} label="Service" as="select"
          value={f.values.service} onChange={(e) => f.setField('service', e.target.value)}
        >
          {SERVICES.map((s) => <option key={s.id} value={s.title}>{s.title}</option>)}
        </Field>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(160px,100%),1fr))', gap: 16, marginBottom: 16 }}>
        <Field
          id={`${ID}-from_currency`} label="Currency" as="select" error={f.errorFor('from_currency')}
          value={f.values.from_currency} onChange={(e) => f.setField('from_currency', e.target.value)}
          onBlur={() => f.handleBlur('from_currency')}
        >
          {currencies.map((cur) => <option key={cur.code} value={cur.code}>{cur.code}</option>)}
        </Field>
        <Field
          id={`${ID}-amount`} label="Amount" error={f.errorFor('amount')} inputMode="decimal"
          value={f.values.amount} onChange={(e) => f.setField('amount', e.target.value)}
          onBlur={() => f.handleBlur('amount')} placeholder="1000"
        />
      </div>

      {transfer && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(200px,100%),1fr))', gap: 16, marginBottom: 16 }}>
          <Field
            id={`${ID}-recipient_name`} label="Receiver's name" error={f.errorFor('recipient_name')}
            value={f.values.recipient_name} onChange={(e) => f.setField('recipient_name', e.target.value)}
            onBlur={() => f.handleBlur('recipient_name')} placeholder="Who the transfer is for"
          />
          <Field
            id={`${ID}-relationship`} label="Relationship to receiver" error={f.errorFor('relationship')}
            value={f.values.relationship} onChange={(e) => f.setField('relationship', e.target.value)}
            onBlur={() => f.handleBlur('relationship')} placeholder="e.g. Father, Friend, Employer"
          />
        </div>
      )}

      <Field
        id={`${ID}-message`} label="Anything else? (optional)" as="textarea" rows={4}
        value={f.values.message} onChange={(e) => f.setField('message', e.target.value)}
        placeholder="Share your number, our team will call you within 15 minutes"
      />

      <ConsentCheck
        id={`${ID}-consent`} checked={f.values.consent}
        onChange={(e) => f.setField('consent', e.target.checked)}
        onBlur={() => f.handleBlur('consent')} error={f.errorFor('consent')}
      />

      <SubmitButton sending={f.sending} sendingLabel="Sending…">{copy.submitLabel}</SubmitButton>
      <p style={{ margin: '14px 0 0', fontSize: 11.8, lineHeight: 1.55, color: c.textFainter, textAlign: 'center' }}>
        We reply on the phone number or email you give us. Prefer to talk? Call {primaryPhone.display}.
      </p>
    </form>
  );
}
