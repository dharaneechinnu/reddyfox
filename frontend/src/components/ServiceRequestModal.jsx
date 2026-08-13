import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { c, fs, fonts, stamp } from '../tokens';
import { useFx } from '../context/FxContext';
import { useCompanyInfo } from '../context/CompanyInfoContext';
import { formForService } from '../serviceForms';
import { validateAmount, validatePhone, validateRequired } from '../validation';
import { submitServiceRequest } from '../api';
import useLeadForm from '../hooks/useLeadForm';
import { ConsentCheck, ErrorSummary, Field, Honeypot, SubmitButton } from './FormBits';
import LeadSuccess from './LeadSuccess';

/**
 * The pop-up behind every service on the site.
 *
 * One component, six forms: which questions it renders comes entirely from
 * SERVICE_FORMS in serviceForms.js, keyed by the service id. Nothing about any
 * individual service is written here — adding a question to Money Transfer is
 * an edit to that data file and nothing else.
 *
 * Why a pop-up and not a page: this is a walk-in counter and every form on the
 * site exists to put a phone number in front of a dealer (see
 * docs/team-notifications.md). Sending someone from the service they were
 * reading about to a separate contact page, to fill in a generic form that
 * asks them to re-state which service they wanted, loses people at every step.
 * The form opens where they already are, pre-scoped to what they were reading.
 *
 * Rendered through a portal into document.body so no ancestor's `overflow`
 * can clip it, matching LeadSuccess.
 */
export default function ServiceRequestModal({ serviceId, serviceTitle, onClose }) {
  const fx = useFx();
  const { primaryPhone } = useCompanyInfo();
  const form = formForService(serviceId);
  const panel = useRef(null);
  const ID = `svc-${serviceId}`;

  // Escape closes, focus lands inside, and the page behind stops scrolling —
  // same three behaviours as LeadSuccess, for the same reasons.
  useEffect(() => {
    panel.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const fields = form?.fields || [];

  // A field is required either outright, or only in one branch of an earlier
  // answer — "Receiver's name" matters when sending money abroad and means
  // nothing when collecting it. Asking for it unconditionally would block half
  // the people the form is for.
  const isRequired = (field, values) => {
    if (field.required) return true;
    if (!field.requiredWhen) return false;
    return values[field.requiredWhen.field] === field.requiredWhen.is;
  };

  const validators = {
    name: (v) => validateRequired(v, 'full name'),
    phone: (v) => validatePhone(v),
    consent: (v) => (v ? null : 'Please tick the consent box so we can reply to you.'),
  };
  for (const field of fields) {
    validators[field.name] = (v, all) => {
      if (field.type === 'amount') return validateAmount(v, { required: isRequired(field, all) });
      if (!isRequired(field, all)) return null;
      return String(v || '').trim() ? null : `Please enter the ${field.label.toLowerCase().replace(/\?$/, '')}.`;
    };
  }

  // Only currencies actually on the rate board — same source as every other
  // currency picker on the site.
  const currencies = fx.currencyList.filter((x) => x.code !== 'INR');
  const defaultFor = (field) => {
    if (field.type === 'choice' || field.type === 'select') return field.options[0];
    if (field.type === 'currency') return 'USD';
    return '';
  };

  const f = useLeadForm({
    initial: {
      name: '', phone: '', consent: false, enquiry_ref: '',
      ...Object.fromEntries(fields.map((field) => [field.name, defaultFor(field)])),
    },
    validators,
    idPrefix: ID,
    submitFn: (v) => {
      // Fields carrying a `column` land on the lead's own columns, because the
      // desk filters and sorts on those across all six services. Everything
      // else goes into `details`, keyed by the label the customer read — so
      // the admin, the email and the Telegram alert can render the answers
      // without any of them needing to know this service's field names.
      const payload = {
        name: v.name.trim(),
        phone: v.phone.trim(),
        service: serviceTitle,
        enquiry_ref: v.enquiry_ref,
        details: {},
      };
      for (const field of fields) {
        const value = String(v[field.name] ?? '').trim();
        if (!field.column) {
          if (value) payload.details[field.label.replace(/\?$/, '')] = value;
        } else if (field.column === 'amount') {
          if (value) payload.amount = value.replace(/,/g, '');
        } else if (value) {
          payload[field.column] = value;
        }
      }
      return submitServiceRequest(payload);
    },
  });

  if (!form) return null;

  const renderField = (field) => {
    const id = `${ID}-${field.name}`;
    const error = f.errorFor(field.name);
    const optional = !isRequired(field, f.values) && field.type !== 'choice' && field.type !== 'select';
    const label = optional ? `${field.label} (optional)` : field.label;
    const common = {
      dark: true, id, label, error,
      value: f.values[field.name],
      onChange: (e) => f.setField(field.name, e.target.value),
      onBlur: () => f.handleBlur(field.name),
    };

    if (field.type === 'choice') {
      // Radios rather than a dropdown: these are the branching questions that
      // change what the rest of the form asks, so both answers should be
      // visible without opening anything.
      return (
        <fieldset key={field.name} style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend style={{ ...stamp, fontSize: fs['2xs'], color: c.accentOnInk, marginBottom: 9, padding: 0 }}>{field.label}</legend>
          <div className="fx-svc-choice" style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
            {field.options.map((option) => {
              const active = f.values[field.name] === option;
              return (
                <label
                  key={option}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 9, cursor: 'pointer',
                    padding: '11px 16px', borderRadius: 9, fontSize: fs.base, lineHeight: 1.3,
                    border: `1px solid ${active ? c.accentOnInk : c.navyLine}`,
                    background: active ? c.panelHover : 'transparent',
                    color: active ? c.surface : c.onNavyText,
                  }}
                >
                  <input
                    type="radio"
                    name={`${ID}-${field.name}`}
                    checked={active}
                    onChange={() => f.setField(field.name, option)}
                    style={{ accentColor: c.orange, width: 15, height: 15, flex: 'none' }}
                  />
                  {option}
                </label>
              );
            })}
          </div>
        </fieldset>
      );
    }

    if (field.type === 'select' || field.type === 'currency') {
      const options = field.type === 'currency' ? currencies.map((cur) => cur.code) : field.options;
      return (
        <Field key={field.name} {...common} as="select">
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </Field>
      );
    }

    if (field.type === 'textarea') {
      return <Field key={field.name} {...common} as="textarea" rows={3} placeholder={field.placeholder} />;
    }

    return (
      <Field
        key={field.name}
        {...common}
        type={field.type === 'date' ? 'date' : 'text'}
        inputMode={field.type === 'amount' ? 'decimal' : undefined}
        placeholder={field.placeholder}
      />
    );
  };

  // Narrow fields pack across a row; anything wide (a choice group, a textarea)
  // keeps its own. Grouped in code rather than hardcoded per service, so a new
  // question in serviceForms.js lays itself out.
  //
  // Three per row, not two: the dialog is wide enough for it, and every field
  // that moves up onto an existing row is a row of height the form no longer
  // has. The row's own item count drives the CSS (`--cols`), so a trailing pair
  // still renders as a pair rather than two thirds and a hole. The phone and
  // tablet layouts are breakpoints over that, not a second pass through here.
  const PER_ROW = 3;
  const rows = [];
  for (const field of fields) {
    const wide = field.type === 'choice' || field.type === 'textarea';
    const last = rows[rows.length - 1];
    if (!wide && last && !last.wide && last.items.length < PER_ROW) last.items.push(field);
    else rows.push({ wide, items: [field] });
  }

  return createPortal(
    <div
      role="presentation"
      className="fx-svc-scrim"
      onClick={onClose}
      // The scrim itself never scrolls — the panel does (below). With the
      // scroll out here the dialog was free to be taller than the window and
      // you scrolled the backdrop to reach the submit button, which reads as
      // the form hanging off the page rather than sitting on it.
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: c.scrim, backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, overflow: 'hidden',
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={form.heading}
        tabIndex={-1}
        className="fx-svc-panel"
        onClick={(e) => e.stopPropagation()}
        // 880: wide enough for three columns of ~260px, which is where these
        // placeholders stop truncating. Width is the cheap axis here — the
        // screen has it spare, and every field that fits alongside another is
        // a row of height the dialog doesn't need. Height is the expensive
        // one: past the fold the submit button stops being visible.
        //
        // dvh, not vh: on mobile Safari and Chrome `100vh` is the height with
        // the browser chrome *hidden*, so a panel sized in vh sits taller than
        // the visible window and pushes its own submit button under the address
        // bar. dvh is the height actually on screen right now.
        style={{
          position: 'relative', width: '100%', maxWidth: 880,
          maxHeight: 'calc(100dvh - 40px)', overflowY: 'auto',
          background: c.panel, border: `1px solid ${c.navyLine}`, borderRadius: 16,
          padding: 'clamp(20px,3.4vw,34px)', outline: 'none',
        }}
      >
        {f.result && (
          <LeadSuccess
            heading={`Thank you, ${f.values.name.trim().split(' ')[0]} — that's with the counter`}
            onReset={onClose}
            resetLabel="Close"
          >
            A dealer will call you about your <strong>{serviceTitle}</strong> request. If it is urgent, please call us.
          </LeadSuccess>
        )}

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{ position: 'absolute', top: 14, right: 16, fontSize: fs['2xl'], lineHeight: 1, color: c.onNavyText, padding: 4 }}
        >
          ×
        </button>

        <span style={{ ...stamp, color: c.accentOnInk }}>{serviceTitle}</span>
        <h2 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: fs['2xl'], lineHeight: 1.2, color: c.surface, margin: '12px 40px 8px 0' }}>
          {form.heading}
        </h2>
        <p style={{ fontSize: fs.sm, lineHeight: 1.6, color: c.onNavyText, margin: '0 0 24px' }}>{form.sub}</p>

        <form noValidate onSubmit={f.handleSubmit}>
          <Honeypot id={`${ID}-enquiry_ref`} value={f.values.enquiry_ref} onChange={(e) => f.setField('enquiry_ref', e.target.value)} />
          <ErrorSummary count={f.errorCount} serverError={f.serverError} dark />

          <div className="fx-svc-row">
            <Field
              dark id={`${ID}-name`} label="Your name" error={f.errorFor('name')}
              value={f.values.name} onChange={(e) => f.setField('name', e.target.value)}
              onBlur={() => f.handleBlur('name')} placeholder="As on your government ID" autoComplete="name"
            />
            <Field
              dark id={`${ID}-phone`} label="Phone" error={f.errorFor('phone')} type="tel" inputMode="tel"
              value={f.values.phone} onChange={(e) => f.setField('phone', e.target.value)}
              onBlur={() => f.handleBlur('phone')} placeholder="+91 99414 56261" autoComplete="tel"
            />
          </div>

          {rows.map((row, i) => (
            <div
              key={i}
              className={`fx-svc-row${row.wide ? ' fx-svc-row-wide' : ''}`}
              // The row gets exactly as many columns as it has fields, so a
              // trailing row of two sits as two halves rather than two thirds
              // with a gap where a third field never was.
              style={{ '--cols': row.items.length }}
            >
              {row.items.map(renderField)}
            </div>
          ))}

          <ConsentCheck
            dark id={`${ID}-consent`} checked={f.values.consent}
            onChange={(e) => f.setField('consent', e.target.checked)}
            onBlur={() => f.handleBlur('consent')} error={f.errorFor('consent')}
          />

          <SubmitButton sending={f.sending} sendingLabel="Sending…">{form.submitLabel}</SubmitButton>
          <p style={{ margin: '14px 0 0', fontSize: fs.xs, lineHeight: 1.55, color: c.onNavyText, textAlign: 'center' }}>
            We call you back on the number you give us. Rather talk now? Call {primaryPhone.display}.
          </p>
        </form>
      </div>
    </div>,
    document.body,
  );
}
