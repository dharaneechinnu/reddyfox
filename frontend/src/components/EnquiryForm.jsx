import { SERVICES } from '../data';
import { c } from '../tokens';
import { validateEmail, validatePhone, validateRequired } from '../validation';
import { submitEnquiry } from '../api';
import useLeadForm from '../hooks/useLeadForm';
import { ConsentCheck, ErrorSummary, Field, Honeypot, SubmitButton, formCard } from './FormBits';
import LeadSuccess from './LeadSuccess';
import { useCompanyInfo } from '../context/CompanyInfoContext';

const ID = 'enq';

const VALIDATORS = {
  name: (v) => validateRequired(v, 'full name'),
  phone: (v) => validatePhone(v),
  email: (v) => validateEmail(v),
  message: (v) => validateRequired(v, 'message'),
  consent: (v) => (v ? null : 'Please tick the consent box so we can reply to you.'),
};

const INITIAL = {
  name: '', phone: '', email: '',
  service: SERVICES[0]?.title || '',
  message: '', consent: false,
  enquiry_ref: '',
};

export default function EnquiryForm() {
  const { primaryPhone } = useCompanyInfo();
  const f = useLeadForm({
    initial: INITIAL,
    validators: VALIDATORS,
    idPrefix: ID,
    submitFn: (v) => submitEnquiry({
      name: v.name.trim(),
      phone: v.phone.trim(),
      email: v.email.trim(),
      service: v.service,
      message: v.message.trim(),
      enquiry_ref: v.enquiry_ref,
    }),
  });

  if (f.result) {
    return (
      <LeadSuccess
        heading={`Thank you, ${f.values.name.trim().split(' ')[0]} — we have your enquiry`}
        onReset={f.reset}
        resetLabel="Send another enquiry"
      >
        It has reached our team and someone will get back to you. If it is urgent, please call us.
      </LeadSuccess>
    );
  }

  return (
    <form noValidate onSubmit={f.handleSubmit} style={formCard}>
      <h2 style={{ fontSize: 22, fontWeight: 600, color: c.navy, margin: '0 0 24px' }}>Send an enquiry</h2>

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
          id={`${ID}-service`} label="I need" as="select"
          value={f.values.service} onChange={(e) => f.setField('service', e.target.value)}
        >
          {SERVICES.map((s) => <option key={s.id} value={s.title}>{s.title}</option>)}
        </Field>
      </div>

      <Field
        id={`${ID}-message`} label="Message" as="textarea" rows={5} error={f.errorFor('message')}
        value={f.values.message} onChange={(e) => f.setField('message', e.target.value)}
        onBlur={() => f.handleBlur('message')} placeholder="Currency, amount and the date you need it"
      />

      <ConsentCheck
        id={`${ID}-consent`} checked={f.values.consent}
        onChange={(e) => f.setField('consent', e.target.checked)}
        onBlur={() => f.handleBlur('consent')} error={f.errorFor('consent')}
      />

      <SubmitButton sending={f.sending}>Send now</SubmitButton>
      <p style={{ margin: '14px 0 0', fontSize: 11.8, lineHeight: 1.55, color: c.textFainter, textAlign: 'center' }}>
        We reply on the phone number or email you give us. Prefer to talk? Call {primaryPhone.display}.
      </p>
    </form>
  );
}
