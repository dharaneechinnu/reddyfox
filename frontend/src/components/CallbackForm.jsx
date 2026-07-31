import { useFx } from '../context/FxContext';
import { c } from '../tokens';
import { validatePhone, validateRequired } from '../validation';
import { submitCallbackRequest } from '../api';
import useLeadForm from '../hooks/useLeadForm';
import { ErrorSummary, Field, Honeypot, SubmitButton } from './FormBits';
import LeadSuccess from './LeadSuccess';

const ID = 'callback';

const VALIDATORS = {
  name: (v) => validateRequired(v, 'full name'),
  phone: (v) => validatePhone(v),
};

/**
 * Quick "get your best price" capture on the homepage converter widget.
 * Deliberately minimal — name and phone only, no email, no consent tick —
 * because the whole point is the lowest possible friction. The
 * amount/currency being converted is carried along silently for context.
 */
export default function CallbackForm() {
  const fx = useFx();

  const f = useLeadForm({
    initial: { name: '', phone: '', enquiry_ref: '' },
    validators: VALIDATORS,
    idPrefix: ID,
    submitFn: (v) => submitCallbackRequest({
      name: v.name.trim(),
      phone: v.phone.trim(),
      from_currency: fx.from,
      to_currency: fx.to,
      amount: fx.calc.amt ? String(fx.calc.amt) : '',
      enquiry_ref: v.enquiry_ref,
    }),
  });

  if (f.result) {
    return (
      <LeadSuccess
        heading={`Thanks, ${f.values.name.trim().split(' ')[0]} — we've got your details`}
        onReset={f.reset}
        resetLabel="Request another callback"
      >
        Our team will call you back shortly with the best price on{' '}
        <strong>{fx.calc.amountLabel}</strong>.
      </LeadSuccess>
    );
  }

  return (
    <form noValidate onSubmit={f.handleSubmit}>
      <Honeypot id={`${ID}-enquiry_ref`} value={f.values.enquiry_ref} onChange={(e) => f.setField('enquiry_ref', e.target.value)} />
      <ErrorSummary count={f.errorCount} serverError={f.serverError} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(160px,100%),1fr))', gap: 12, marginBottom: 4 }}>
        <Field
          id={`${ID}-name`} label="Full name" error={f.errorFor('name')}
          value={f.values.name} onChange={(e) => f.setField('name', e.target.value)}
          onBlur={() => f.handleBlur('name')} placeholder="Your name" autoComplete="name"
        />
        <Field
          id={`${ID}-phone`} label="Mobile number" error={f.errorFor('phone')} type="tel" inputMode="tel"
          value={f.values.phone} onChange={(e) => f.setField('phone', e.target.value)}
          onBlur={() => f.handleBlur('phone')} placeholder="99414 56261" autoComplete="tel"
        />
      </div>

      <SubmitButton sending={f.sending} sendingLabel="Sending…">Get best price</SubmitButton>
      <p style={{ margin: '10px 0 0', fontSize: 11.5, lineHeight: 1.5, color: c.textFainter, textAlign: 'center' }}>
        Figures shown are approximate — we'll call with the exact price.
      </p>
    </form>
  );
}
