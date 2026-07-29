import { useState } from 'react';
import { SERVICES } from '../data';
import { CONTACT, PRIMARY_PHONE } from '../company';
import { c, fonts } from '../tokens';
import { validateEmail, validatePhone, validateRequired, runValidators } from '../validation';
import { submitEnquiry } from '../api';

const fieldLabel = { display: 'block', fontSize: 12.5, fontWeight: 500, color: c.textMuted, marginBottom: 7 };

const baseInput = {
  width: '100%',
  border: `1px solid ${c.softLine}`,
  borderRadius: 9,
  padding: '13px 14px',
  fontSize: 14.5,
  outline: 'none',
  color: c.navy,
  transition: 'border-color .15s',
};

const VALIDATORS = {
  name: (v) => validateRequired(v, 'full name'),
  phone: (v) => validatePhone(v),
  email: (v) => validateEmail(v),
  message: (v) => validateRequired(v, 'message'),
  consent: (v) => (v ? null : 'Please tick the consent box so we can reply to you.'),
};

const EMPTY = {
  name: '', phone: '', email: '',
  service: SERVICES[0]?.title || '',
  message: '', consent: false,
  enquiry_ref: '', // honeypot — must stay empty; only bots fill it
};

// Fully hidden. Spam bots that POST straight to the API never render CSS at
// all — they just replay whatever fields they scraped — so display:none loses
// nothing, while guaranteeing no real user or browser autofill can ever touch
// it. A false positive here would silently reject a paying customer, which is
// far worse than letting a spam row through for the team to mark as spam.
const honeypotStyle = { display: 'none' };

function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <div id={id} role="alert" style={{ fontSize: 12.5, lineHeight: 1.45, color: c.redText, marginTop: 6 }}>
      {message}
    </div>
  );
}

export default function EnquiryForm() {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [serverError, setServerError] = useState(null);

  const setField = (field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    // Clear the error as soon as the field becomes valid, so the message
    // disappears while typing rather than only on the next blur.
    if (errors[field]) {
      const check = VALIDATORS[field];
      if (check && !check(value, { ...values, [field]: value })) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    }
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const check = VALIDATORS[field];
    if (!check) return;
    const message = check(values[field], values);
    setErrors((prev) => {
      const next = { ...prev };
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);

    const found = runValidators(values, VALIDATORS);
    setErrors(found);
    setTouched(Object.fromEntries(Object.keys(VALIDATORS).map((k) => [k, true])));

    if (Object.keys(found).length) {
      // Move focus to the first problem so keyboard and screen reader users
      // are taken straight to it.
      const first = Object.keys(VALIDATORS).find((k) => found[k]);
      document.getElementById(`enq-${first}`)?.focus();
      return;
    }

    setSending(true);
    try {
      await submitEnquiry({
        name: values.name.trim(),
        phone: values.phone.trim(),
        email: values.email.trim(),
        service: values.service,
        message: values.message.trim(),
        enquiry_ref: values.enquiry_ref, // honeypot
      });
      setSubmitted(true);
    } catch (err) {
      // The server re-validates independently; surface anything it rejected
      // against the matching field.
      if (err.fieldErrors) {
        setErrors(err.fieldErrors);
        const first = Object.keys(err.fieldErrors)[0];
        document.getElementById(`enq-${first}`)?.focus();
      }
      setServerError(err.message);
    } finally {
      setSending(false);
    }
  };

  const inputStyle = (field) => ({
    ...baseInput,
    borderColor: errors[field] ? c.errorField : c.softLine,
  });

  const describedBy = (field) => (errors[field] ? `enq-${field}-error` : undefined);

  if (submitted) {
    return (
      <div role="status" style={{ background: '#fff', border: `1px solid ${c.greenBorder}`, borderRadius: 16, padding: 34 }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: c.greenText, margin: '0 0 10px' }}>
          Thank you, {values.name.trim().split(' ')[0]} — we have your enquiry
        </div>
        <p style={{ fontSize: 15, lineHeight: 1.65, color: c.text, margin: '0 0 22px' }}>
          It has reached our team and someone will get back to you on{' '}
          <span style={{ fontFamily: fonts.mono, color: c.navy }}>{values.phone}</span> or{' '}
          <span style={{ color: c.navy }}>{values.email}</span>. If it is urgent, please call us.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <a
            href={`tel:${PRIMARY_PHONE.tel}`}
            style={{ display: 'block', textAlign: 'center', background: c.orange, color: '#fff', padding: 15, borderRadius: 9, fontSize: 15, fontWeight: 600, fontFamily: fonts.mono }}
          >
            Call {PRIMARY_PHONE.display}
          </a>
          <a
            href={`mailto:${CONTACT.email}`}
            style={{ display: 'block', textAlign: 'center', border: `1px solid ${c.softLine}`, color: c.navy, padding: 15, borderRadius: 9, fontSize: 15, fontWeight: 600 }}
          >
            Email {CONTACT.email}
          </a>
        </div>
        <button
          type="button"
          onClick={() => { setValues(EMPTY); setErrors({}); setTouched({}); setSubmitted(false); setServerError(null); }}
          style={{ marginTop: 18, fontSize: 13.5, fontWeight: 600, color: c.orange }}
        >
          Send another enquiry
        </button>
      </div>
    );
  }

  const errorCount = Object.keys(errors).length;

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      style={{ background: '#fff', border: `1px solid ${c.sandLine}`, borderRadius: 16, padding: 34 }}
    >
      <h2 style={{ fontSize: 22, fontWeight: 600, color: c.navy, margin: '0 0 24px' }}>Send an enquiry</h2>

      {/* Honeypot. Hidden from people, irresistible to bots. The server rejects
          any submission where this is filled. aria-hidden + tabIndex keep it
          away from screen readers and keyboard users. */}
      <div style={honeypotStyle} aria-hidden="true">
        {/* Deliberately NOT named website/url/company — those are names browser
            autofill recognises and would populate, blocking a real customer. */}
        <label htmlFor="enq-enquiry_ref">Reference</label>
        <input
          id="enq-enquiry_ref"
          name="enquiry_ref"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={values.enquiry_ref}
          onChange={(e) => setField('enquiry_ref', e.target.value)}
        />
      </div>

      {(errorCount > 0 || serverError) && (
        <div role="alert" style={{ border: `1px solid ${c.redBorder}`, background: c.redBg2, borderRadius: 11, padding: '12px 16px', marginBottom: 20, fontSize: 13.5, lineHeight: 1.5, color: c.redText }}>
          {serverError || (errorCount === 1
            ? 'Please fix the highlighted field.'
            : `Please fix the ${errorCount} highlighted fields.`)}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, marginBottom: 16 }}>
        <div>
          <label htmlFor="enq-name" style={fieldLabel}>Full name</label>
          <input
            id="enq-name"
            value={values.name}
            onChange={(e) => setField('name', e.target.value)}
            onBlur={() => handleBlur('name')}
            placeholder="As per your passport"
            autoComplete="name"
            aria-invalid={!!errors.name}
            aria-describedby={describedBy('name')}
            style={inputStyle('name')}
          />
          <FieldError id="enq-name-error" message={touched.name && errors.name} />
        </div>

        <div>
          <label htmlFor="enq-phone" style={fieldLabel}>Phone</label>
          <input
            id="enq-phone"
            type="tel"
            inputMode="tel"
            value={values.phone}
            onChange={(e) => setField('phone', e.target.value)}
            onBlur={() => handleBlur('phone')}
            placeholder="+91 99414 56261"
            autoComplete="tel"
            aria-invalid={!!errors.phone}
            aria-describedby={describedBy('phone')}
            style={inputStyle('phone')}
          />
          <FieldError id="enq-phone-error" message={touched.phone && errors.phone} />
        </div>

        <div>
          <label htmlFor="enq-email" style={fieldLabel}>Email</label>
          <input
            id="enq-email"
            type="email"
            inputMode="email"
            value={values.email}
            onChange={(e) => setField('email', e.target.value)}
            onBlur={() => handleBlur('email')}
            placeholder="name@email.com"
            autoComplete="email"
            aria-invalid={!!errors.email}
            aria-describedby={describedBy('email')}
            style={inputStyle('email')}
          />
          <FieldError id="enq-email-error" message={touched.email && errors.email} />
        </div>

        <div>
          <label htmlFor="enq-service" style={fieldLabel}>I need</label>
          <select
            id="enq-service"
            value={values.service}
            onChange={(e) => setField('service', e.target.value)}
            style={{ ...baseInput, background: '#fff', padding: '13px 12px', cursor: 'pointer' }}
          >
            {SERVICES.map((s) => <option key={s.id} value={s.title}>{s.title}</option>)}
          </select>
        </div>
      </div>

      <label htmlFor="enq-message" style={fieldLabel}>Message</label>
      <textarea
        id="enq-message"
        rows={5}
        value={values.message}
        onChange={(e) => setField('message', e.target.value)}
        onBlur={() => handleBlur('message')}
        placeholder="Currency, amount and the date you need it"
        aria-invalid={!!errors.message}
        aria-describedby={describedBy('message')}
        style={{ ...inputStyle('message'), resize: 'vertical' }}
      />
      <FieldError id="enq-message-error" message={touched.message && errors.message} />

      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 16 }}>
        <input
          id="enq-consent"
          type="checkbox"
          checked={values.consent}
          onChange={(e) => setField('consent', e.target.checked)}
          onBlur={() => handleBlur('consent')}
          aria-invalid={!!errors.consent}
          aria-describedby={describedBy('consent')}
          style={{ marginTop: 3, accentColor: c.orange, width: 16, height: 16, flex: 'none' }}
        />
        <label htmlFor="enq-consent" style={{ fontSize: 13, lineHeight: 1.55, color: c.textMuted, cursor: 'pointer' }}>
          I consent to being contacted about this enquiry.
        </label>
      </div>
      <FieldError id="enq-consent-error" message={touched.consent && errors.consent} />

      <button
        type="submit"
        disabled={sending}
        style={{ marginTop: 22, display: 'block', width: '100%', textAlign: 'center', background: sending ? c.disabledBg : c.orange, color: sending ? c.disabledText : '#fff', padding: 15, borderRadius: 9, fontSize: 15, fontWeight: 600, transition: 'background .18s', cursor: sending ? 'default' : 'pointer' }}
        onMouseEnter={(e) => { if (!sending) e.currentTarget.style.background = c.orangeDark; }}
        onMouseLeave={(e) => { if (!sending) e.currentTarget.style.background = c.orange; }}
      >
        {sending ? 'Sending…' : 'Send now'}
      </button>
      <p style={{ margin: '14px 0 0', fontSize: 11.8, lineHeight: 1.55, color: c.textFainter, textAlign: 'center' }}>
        We reply on the phone number or email you give us. Prefer to talk? Call {PRIMARY_PHONE.display}.
      </p>
    </form>
  );
}
