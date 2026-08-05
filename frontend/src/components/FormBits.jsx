import { c, fs, btnPrimaryHover } from '../tokens';

/**
 * Shared field primitives for the three website forms.
 * Everything is wired for accessibility once, here, rather than three times:
 * label/htmlFor, aria-invalid, aria-describedby and role="alert" on messages.
 */

export const baseInput = {
  width: '100%',
  border: `1px solid ${c.softLine}`,
  borderRadius: 9,
  padding: '13px 14px',
  fontSize: fs.base,
  outline: 'none',
  color: c.navy,
  transition: 'border-color .15s',
  background: c.surface,
};

const labelStyle = { display: 'block', fontSize: fs.sm, fontWeight: 500, color: c.textMuted, marginBottom: 7 };

export function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <div id={id} role="alert" style={{ fontSize: fs.sm, lineHeight: 1.45, color: c.redText, marginTop: 6 }}>
      {message}
    </div>
  );
}

/**
 * One labelled control plus its error. Pass `as="select"`/`as="textarea"`, or
 * children for select options.
 */
export function Field({
  id, label, error, as = 'input', children, hint, style, ...rest
}) {
  const Tag = as;
  const describedBy = error ? `${id}-error` : (hint ? `${id}-hint` : undefined);
  return (
    <div>
      <label htmlFor={id} style={labelStyle}>{label}</label>
      <Tag
        id={id}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        style={{
          ...baseInput,
          borderColor: error ? c.errorField : c.softLine,
          ...(as === 'select' ? { padding: '13px 12px', cursor: 'pointer' } : null),
          ...(as === 'textarea' ? { resize: 'vertical' } : null),
          ...style,
        }}
        {...rest}
      >
        {children}
      </Tag>
      {hint && !error && (
        <div id={`${id}-hint`} style={{ fontSize: fs.xs, lineHeight: 1.45, color: c.textFainter, marginTop: 6 }}>
          {hint}
        </div>
      )}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

/** Summary banner above the form. Server errors take priority over field counts. */
export function ErrorSummary({ count, serverError }) {
  if (!count && !serverError) return null;
  return (
    <div role="alert" style={{ border: `1px solid ${c.redBorder}`, background: c.redBg2, borderRadius: 11, padding: '12px 16px', marginBottom: 20, fontSize: fs.base, lineHeight: 1.5, color: c.redText }}>
      {serverError || (count === 1
        ? 'Please fix the highlighted field.'
        : `Please fix the ${count} highlighted fields.`)}
    </div>
  );
}

/**
 * Honeypot. display:none so a human never sees it and browser autofill never
 * touches it — a false positive here would silently reject a paying customer.
 * Deliberately NOT named website/url/company, which autofill recognises.
 */
export function Honeypot({ id, value, onChange }) {
  return (
    <div style={{ display: 'none' }} aria-hidden="true">
      <label htmlFor={id}>Reference</label>
      <input id={id} name="enquiry_ref" type="text" tabIndex={-1} autoComplete="off" value={value} onChange={onChange} />
    </div>
  );
}

export function ConsentCheck({ id, checked, onChange, onBlur, error }) {
  return (
    <>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 16 }}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          onBlur={onBlur}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          style={{ marginTop: 3, accentColor: c.orange, width: 16, height: 16, flex: 'none' }}
        />
        <label htmlFor={id} style={{ fontSize: fs.sm, lineHeight: 1.55, color: c.textMuted, cursor: 'pointer' }}>
          I consent to being contacted about this request.
        </label>
      </div>
      <FieldError id={`${id}-error`} message={error} />
    </>
  );
}

export function SubmitButton({ sending, children, sendingLabel = 'Sending…' }) {
  return (
    <button
      type="submit"
      disabled={sending}
      style={{
        marginTop: 22, display: 'block', width: '100%', textAlign: 'center',
        background: sending ? c.disabledBg : c.orange, color: sending ? c.disabledText : c.surface,
        padding: 15, borderRadius: 9, fontSize: fs.md, fontWeight: 600,
        transition: 'background .18s', cursor: sending ? 'default' : 'pointer',
      }}
      onMouseEnter={(e) => { if (!sending) e.currentTarget.style.background = btnPrimaryHover; }}
      onMouseLeave={(e) => { if (!sending) e.currentTarget.style.background = c.orange; }}
    >
      {sending ? sendingLabel : children}
    </button>
  );
}

export const formCard = {
  background: c.surface,
  border: `1px solid ${c.sandLine}`,
  borderRadius: 16,
  padding: 34,
};
