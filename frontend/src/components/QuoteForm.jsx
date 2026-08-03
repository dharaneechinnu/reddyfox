import { SERVICES } from '../data';
import { useFx } from '../context/FxContext';
import { c } from '../tokens';
import { useCompanyInfo } from '../context/CompanyInfoContext';
import { validateEmail, validatePhone, validateRequired } from '../validation';
import { submitQuoteRequest } from '../api';
import useLeadForm from '../hooks/useLeadForm';
import { ConsentCheck, ErrorSummary, Field, Honeypot, SubmitButton, formCard } from './FormBits';
import LeadSuccess from './LeadSuccess';

const ID = 'quote';

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
  consent: (v) => (v ? null : 'Please tick the consent box so we can reply to you.'),
};

export default function QuoteForm() {
  const fx = useFx();
  const { primaryPhone } = useCompanyInfo();

  const f = useLeadForm({
    initial: {
      name: '', phone: '', email: '',
      service: SERVICES[0]?.title || '',
      from_currency: 'USD',
      amount: '',
      needed_by: '',
      message: '',
      consent: false,
      enquiry_ref: '',
    },
    validators: VALIDATORS,
    idPrefix: ID,
    submitFn: (v) => submitQuoteRequest({
      name: v.name.trim(),
      phone: v.phone.trim(),
      email: v.email.trim(),
      service: v.service,
      from_currency: v.from_currency,
      amount: String(v.amount).replace(/,/g, '').trim(),
      needed_by: v.needed_by || null,
      message: v.message.trim(),
      enquiry_ref: v.enquiry_ref,
    }),
  });

  if (f.result) {
    return (
      <LeadSuccess
        heading={`Thank you, ${f.values.name.trim().split(' ')[0]} — your quote request is in`}
        onReset={f.reset}
        resetLabel="Request another quote"
      >
        Our dealers will come back to you with a price for{' '}
        <strong>{f.values.amount} {f.values.from_currency}</strong>. If it is urgent, please call us.
      </LeadSuccess>
    );
  }

  // Only offer currencies actually on the board.
  const currencies = fx.currencyList.filter((x) => x.code !== 'INR');
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form noValidate onSubmit={f.handleSubmit} style={formCard}>
      <h2 style={{ fontSize: 22, fontWeight: 600, color: c.navy, margin: '0 0 24px' }}>Request a free quote</h2>

      <Honeypot id={`${ID}-enquiry_ref`} value={f.values.enquiry_ref} onChange={(e) => f.setField('enquiry_ref', e.target.value)} />
      <ErrorSummary count={f.errorCount} serverError={f.serverError} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(200px,100%),1fr))', gap: 16, marginBottom: 16 }}>
        <Field
          id={`${ID}-name`} label="Full name" error={f.errorFor('name')}
          value={f.values.name} onChange={(e) => f.setField('name', e.target.value)}
          onBlur={() => f.handleBlur('name')} placeholder="As per your passport" autoComplete="name"
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
        <Field
          id={`${ID}-needed_by`} label="Needed by (optional)" type="date" min={today}
          value={f.values.needed_by} onChange={(e) => f.setField('needed_by', e.target.value)}
        />
      </div>

      <Field
        id={`${ID}-message`} label="Anything else? (optional)" as="textarea" rows={4}
        value={f.values.message} onChange={(e) => f.setField('message', e.target.value)}
        placeholder="Denominations, travel dates, or the purpose of the transfer"
      />

      <ConsentCheck
        id={`${ID}-consent`} checked={f.values.consent}
        onChange={(e) => f.setField('consent', e.target.checked)}
        onBlur={() => f.handleBlur('consent')} error={f.errorFor('consent')}
      />

      <SubmitButton sending={f.sending} sendingLabel="Requesting…">Get my quote</SubmitButton>
      <p style={{ margin: '14px 0 0', fontSize: 11.8, lineHeight: 1.55, color: c.textFainter, textAlign: 'center' }}>
        A dealer will quote you a price. Prefer to talk? Call {primaryPhone.display}.
      </p>
    </form>
  );
}
