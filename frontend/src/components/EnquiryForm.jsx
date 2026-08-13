import { c, fs, fonts } from '../tokens';
import { useCompanyInfo } from '../context/CompanyInfoContext';
import { validatePhone, validateRequired } from '../validation';
import { submitEnquiry } from '../api';
import useLeadForm from '../hooks/useLeadForm';
import useFormAnchor from '../hooks/useFormAnchor';
import { ConsentCheck, ErrorSummary, Field, Honeypot, SubmitButton, formCard } from './FormBits';
import LeadSuccess from './LeadSuccess';

/**
 * The contact form. Three questions: who you are, how to reach you, what you
 * want to ask.
 *
 * It used to share a component with "get a quote" and so demanded a service, a
 * currency and an amount from everyone — a form that could not express the
 * enquiry it existed to collect ("do you take pre-2013 dollar notes?" has no
 * currency amount). Anyone who already knows the service and the amount is not
 * on this page: they are in that service's own pop-up
 * (ServiceRequestModal.jsx), which asks the questions that service needs.
 *
 * Mirrored server-side by EnquiryCreateSerializer — keep the two in step.
 */
export default function EnquiryForm() {
  const { primaryPhone } = useCompanyInfo();
  const ID = 'enq';
  // Scrolls clear of the sticky header, rings the card and focuses the first
  // field when someone arrived here asking for the form — which is what every
  // "Contact us" link on the site does. See hooks/useFormAnchor.js.
  const { className: anchorClass, ...anchor } = useFormAnchor();

  const f = useLeadForm({
    initial: { name: '', phone: '', message: '', consent: false, enquiry_ref: '' },
    validators: {
      name: (v) => validateRequired(v, 'full name'),
      phone: (v) => validatePhone(v),
      message: (v) => {
        const text = String(v || '').trim();
        if (!text) return 'Please tell us what you would like to ask.';
        // Same floor as the serializer: a one-word "hi" leaves the desk with
        // nothing to act on and costs the customer a second call.
        if (text.length < 5) return 'Please tell us a little more about what you need.';
        return null;
      },
      consent: (v) => (v ? null : 'Please tick the consent box so we can reply to you.'),
    },
    idPrefix: ID,
    submitFn: (v) => submitEnquiry({
      name: v.name.trim(),
      phone: v.phone.trim(),
      message: v.message.trim(),
      enquiry_ref: v.enquiry_ref,
    }),
  });

  return (
    <form
      noValidate
      onSubmit={f.handleSubmit}
      className={anchorClass}
      {...anchor}
      style={{ ...formCard, ...anchor.style }}
    >
      {f.result && (
        <LeadSuccess
          heading={`Thank you, ${f.values.name.trim().split(' ')[0]} — we have your question`}
          onReset={f.reset}
          resetLabel="Ask something else"
        >
          It has reached our team and someone will call you back about it. If it is urgent, please call us.
        </LeadSuccess>
      )}

      <h2 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: fs['2xl'], lineHeight: 1.2, color: c.surface, margin: '0 0 8px' }}>Ask us anything</h2>
      <p style={{ fontSize: fs.sm, lineHeight: 1.6, color: c.onNavyText, margin: '0 0 24px' }}>
        We call you back on the number you give us — usually within 15 minutes while the counter is open.
      </p>

      <Honeypot id={`${ID}-enquiry_ref`} value={f.values.enquiry_ref} onChange={(e) => f.setField('enquiry_ref', e.target.value)} />
      <ErrorSummary count={f.errorCount} serverError={f.serverError} dark />

      <div className="fx-field-row" style={{ '--fx-field-i': 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(200px,100%),1fr))', gap: 16, marginBottom: 16 }}>
        <Field
          dark
          id={`${ID}-name`} label="Your name" error={f.errorFor('name')}
          value={f.values.name} onChange={(e) => f.setField('name', e.target.value)}
          onBlur={() => f.handleBlur('name')} placeholder="As on your government ID" autoComplete="name"
        />
        <Field
          dark
          id={`${ID}-phone`} label="Phone" error={f.errorFor('phone')} type="tel" inputMode="tel"
          value={f.values.phone} onChange={(e) => f.setField('phone', e.target.value)}
          onBlur={() => f.handleBlur('phone')} placeholder="+91 99414 56261" autoComplete="tel"
        />
      </div>

      <div className="fx-field-row" style={{ '--fx-field-i': 1 }}>
        <Field
          dark
          id={`${ID}-message`} label="Your query" as="textarea" rows={5} error={f.errorFor('message')}
          value={f.values.message} onChange={(e) => f.setField('message', e.target.value)}
          onBlur={() => f.handleBlur('message')}
          placeholder="Tell us what you need and we'll call you back about it."
        />
      </div>

      <ConsentCheck
        dark
        id={`${ID}-consent`} checked={f.values.consent}
        onChange={(e) => f.setField('consent', e.target.checked)}
        onBlur={() => f.handleBlur('consent')} error={f.errorFor('consent')}
      />

      <SubmitButton sending={f.sending} sendingLabel="Sending…">Send my query</SubmitButton>
      <p style={{ margin: '14px 0 0', fontSize: fs.xs, lineHeight: 1.55, color: c.onNavyText, textAlign: 'center' }}>
        Would you rather talk now? Call {primaryPhone.display}.
      </p>
    </form>
  );
}
