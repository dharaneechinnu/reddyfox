import { useFx } from '../context/FxContext';
import { c, fonts } from '../tokens';
import { PRIMARY_PHONE } from '../company';
import { fmt } from '../data';
import { validateEmail, validatePhone, validateRequired } from '../validation';
import { submitRateLock } from '../api';
import useLeadForm from '../hooks/useLeadForm';
import { ConsentCheck, ErrorSummary, Field, Honeypot, SubmitButton, formCard } from './FormBits';
import LeadSuccess from './LeadSuccess';

const ID = 'lock';

const VALIDATORS = {
  name: (v) => validateRequired(v, 'full name'),
  phone: (v) => validatePhone(v),
  email: (v) => validateEmail(v),
  consent: (v) => (v ? null : 'Please tick the consent box so we can confirm your rate.'),
};

/**
 * "Lock this rate". The currency pair, amount and rate are NOT editable here —
 * they are carried over from the converter, because the whole point is to record
 * exactly the figures the customer was looking at when they decided.
 */
export default function RateLockForm() {
  const fx = useFx();

  const f = useLeadForm({
    initial: { name: '', phone: '', email: '', message: '', consent: false, enquiry_ref: '' },
    validators: VALIDATORS,
    idPrefix: ID,
    submitFn: (v) => submitRateLock({
      name: v.name.trim(),
      phone: v.phone.trim(),
      email: v.email.trim(),
      from_currency: fx.from,
      to_currency: fx.to,
      amount: String(fx.calc.amt),
      quoted_rate: String(fx.calc.rate.toFixed(4)),
      converted_amount: String((fx.calc.amt * fx.calc.rate).toFixed(2)),
      message: v.message.trim(),
      enquiry_ref: v.enquiry_ref,
    }),
  });

  if (f.result) {
    return (
      <LeadSuccess
        heading={`Rate reserved, ${f.values.name.trim().split(' ')[0]}`}
        onReset={f.reset}
        resetLabel="Lock another rate"
        reference={f.result.reference}
      >
        We have recorded <strong>{fx.calc.amountLabel}</strong> at{' '}
        <strong>{fx.calc.rateLine}</strong>.
        {f.result.expires_at_display && (
          <>
            {' '}This is held until{' '}
            <strong style={{ fontFamily: fonts.mono }}>{f.result.expires_at_display}</strong>, and a dealer
            will confirm it with you before then.
          </>
        )}
        {!f.result.expires_at_display && ' A dealer will confirm it with you shortly.'}
      </LeadSuccess>
    );
  }

  const sameCurrency = fx.from === fx.to;
  const noAmount = !fx.calc.amt;

  return (
    <form noValidate onSubmit={f.handleSubmit} style={formCard}>
      <h2 style={{ fontSize: 22, fontWeight: 600, color: c.navy, margin: '0 0 6px' }}>Lock this rate</h2>
      <p style={{ fontSize: 14, lineHeight: 1.6, color: c.textMuted, margin: '0 0 22px' }}>
        We will hold the rate below and a dealer will confirm it with you.
      </p>

      {/* What they are locking — read-only on purpose: it must match the
          converter exactly, so there is no dispute about the figures. */}
      <div style={{ border: `1px solid ${c.sandLine}`, background: c.sand, borderRadius: 12, padding: '18px 20px', marginBottom: 22 }}>
        <div style={{ font: `500 10.5px/1.4 ${fonts.mono}`, letterSpacing: '.14em', color: c.orange, marginBottom: 12 }}>
          THE RATE YOU ARE LOCKING
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ color: c.textMuted }}>You exchange</span>
            <span style={{ fontFamily: fonts.mono, color: c.navy }}>{fx.calc.amountLabel}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ color: c.textMuted }}>Rate</span>
            <span style={{ fontFamily: fonts.mono, color: c.navy }}>{fx.calc.rateLine}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, borderTop: `1px dashed ${c.sandBorder}`, paddingTop: 8, marginTop: 2 }}>
            <span style={{ fontWeight: 600, color: c.navy }}>You receive</span>
            <span style={{ fontFamily: fonts.mono, fontWeight: 600, color: c.navy }}>
              {fmt(fx.calc.amt * fx.calc.rate, fx.to === 'JPY' || fx.to === 'THB' ? 0 : 2)} {fx.to}
            </span>
          </div>
        </div>
        <a href="/converter" style={{ display: 'inline-block', marginTop: 14, fontSize: 13, fontWeight: 600, color: c.orange }}>
          ← Change the amount or currency
        </a>
      </div>

      {(sameCurrency || noAmount) && (
        <div role="alert" style={{ border: `1px solid ${c.redBorder}`, background: c.redBg2, borderRadius: 11, padding: '12px 16px', marginBottom: 20, fontSize: 13.5, lineHeight: 1.5, color: c.redText }}>
          {noAmount
            ? 'Enter an amount in the converter first, then come back to lock the rate.'
            : 'Pick two different currencies in the converter before locking a rate.'}
        </div>
      )}

      <Honeypot id={`${ID}-enquiry_ref`} value={f.values.enquiry_ref} onChange={(e) => f.setField('enquiry_ref', e.target.value)} />
      <ErrorSummary count={f.errorCount} serverError={f.serverError} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, marginBottom: 16 }}>
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
      </div>

      <Field
        id={`${ID}-email`} label="Email" error={f.errorFor('email')} type="email" inputMode="email"
        value={f.values.email} onChange={(e) => f.setField('email', e.target.value)}
        onBlur={() => f.handleBlur('email')} placeholder="name@email.com" autoComplete="email"
        style={{ marginBottom: 16 }}
      />

      <Field
        id={`${ID}-message`} label="Anything else? (optional)" as="textarea" rows={3}
        value={f.values.message} onChange={(e) => f.setField('message', e.target.value)}
        placeholder="Denominations you need, or when you plan to collect"
      />

      <ConsentCheck
        id={`${ID}-consent`} checked={f.values.consent}
        onChange={(e) => f.setField('consent', e.target.checked)}
        onBlur={() => f.handleBlur('consent')} error={f.errorFor('consent')}
      />

      <SubmitButton sending={f.sending} sendingLabel="Reserving…">Reserve this rate</SubmitButton>
      <p style={{ margin: '14px 0 0', fontSize: 11.8, lineHeight: 1.55, color: c.textFainter, textAlign: 'center' }}>
        Indicative until a dealer confirms. Final rate is set at the counter against valid ID.
        Prefer to talk? Call {PRIMARY_PHONE.display}.
      </p>
    </form>
  );
}
