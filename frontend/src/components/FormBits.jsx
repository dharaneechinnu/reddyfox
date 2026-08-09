import { c, fs, stamp, btnPrimaryHover } from '../tokens';

/**
 * Shared field primitives for the three website forms.
 * Everything is wired for accessibility once, here, rather than three times:
 * label/htmlFor, aria-invalid, aria-describedby and role="alert" on messages.
 *
 * `dark`, on Field/FieldError/ErrorSummary/ConsentCheck, switches the label
 * and message colours for a form card on the solid indigo panel (RequestForm,
 * on `formCard`) rather than the light card these were built for. The input
 * fields themselves don't change — they're white either way, same as
 * CallbackBar's inline fields, because a coloured field reads as disabled.
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
const darkLabelStyle = { ...stamp, fontSize: fs['2xs'], color: c.accentOnInk, marginBottom: 8, display: 'block' };

export function FieldError({ id, message, dark }) {
  if (!message) return null;
  return (
    <div id={id} role="alert" style={{ fontSize: fs.sm, lineHeight: 1.45, color: dark ? c.redLight : c.redText, marginTop: 6 }}>
      {message}
    </div>
  );
}

/**
 * One labelled control plus its error. Pass `as="select"`/`as="textarea"`, or
 * children for select options.
 */
export function Field({
  id, label, error, as = 'input', children, hint, style, dark, ...rest
}) {
  const Tag = as;
  const describedBy = error ? `${id}-error` : (hint ? `${id}-hint` : undefined);
  return (
    <div>
      <label htmlFor={id} style={dark ? darkLabelStyle : labelStyle}>{label}</label>
      <Tag
        id={id}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        style={{
          ...baseInput,
          borderColor: error ? (dark ? c.redLight : c.errorField) : (dark ? c.navyLine : c.softLine),
          ...(as === 'select' ? { padding: '13px 12px', cursor: 'pointer' } : null),
          ...(as === 'textarea' ? { resize: 'vertical' } : null),
          ...style,
        }}
        {...rest}
      >
        {children}
      </Tag>
      {hint && !error && (
        <div id={`${id}-hint`} style={{ fontSize: fs.xs, lineHeight: 1.45, color: dark ? c.onNavyText : c.textFainter, marginTop: 6 }}>
          {hint}
        </div>
      )}
      <FieldError id={`${id}-error`} message={error} dark={dark} />
    </div>
  );
}

/** Summary banner above the form. Server errors take priority over field counts. */
export function ErrorSummary({ count, serverError, dark }) {
  if (!count && !serverError) return null;
  return (
    <div role="alert" style={{
      border: `1px solid ${dark ? c.redLight : c.redBorder}`,
      background: dark ? c.redBgInk : c.redBg2,
      borderRadius: 11, padding: '12px 16px', marginBottom: 20,
      fontSize: fs.base, lineHeight: 1.5, color: dark ? c.redLight : c.redText,
    }}>
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

export function ConsentCheck({ id, checked, onChange, onBlur, error, dark }) {
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
        <label htmlFor={id} style={{ fontSize: fs.sm, lineHeight: 1.55, color: dark ? c.onNavyText : c.textMuted, cursor: 'pointer' }}>
          I consent to being contacted about this request.
        </label>
      </div>
      <FieldError id={`${id}-error`} message={error} dark={dark} />
    </>
  );
}

/**
 * A small glass disc with a plus-mark cut into it, snapping through 0/90/180/
 * 270 degrees rather than spinning smoothly — see .fx-loading-cross in
 * index.css. Reduced-motion users get it static (same rule as .fx-dot-pulse):
 * "sending" is already said by the button's label and disabled cursor, so the
 * animation is decoration, not the only signal.
 */
function LoadingCross() {
  return (
    <span className="fx-loading-cross" aria-hidden="true">
      <span className="fx-loading-cross-bar fx-loading-cross-bar-h" />
      <span className="fx-loading-cross-bar fx-loading-cross-bar-v" />
    </span>
  );
}

/**
 * White fill, indigo label at rest — same shape as `btnPrimary`/CallbackBar's
 * own submit button, now that `formCard` is the solid indigo panel rather
 * than a light card (an indigo-filled button on an indigo card doesn't pop).
 * While sending, the fill flips to indigo with a white label so the loading
 * cross — drawn in white — stays visible against it.
 */
export function SubmitButton({ sending, children, sendingLabel = 'Sending…' }) {
  return (
    <button
      type="submit"
      disabled={sending}
      style={{
        marginTop: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        width: '100%', textAlign: 'center',
        background: sending ? c.orange : c.surface, color: sending ? c.surface : c.orange,
        padding: 15, borderRadius: 9, fontSize: fs.md, fontWeight: 600,
        transition: 'background .18s', cursor: sending ? 'default' : 'pointer',
      }}
      onMouseEnter={(e) => { if (!sending) e.currentTarget.style.background = btnPrimaryHover; }}
      onMouseLeave={(e) => { if (!sending) e.currentTarget.style.background = c.surface; }}
    >
      {sending && <LoadingCross />}
      {sending ? sendingLabel : children}
    </button>
  );
}

/**
 * Solid indigo, same as CallbackBar's inline panel — not the light card this
 * used to be. Both forms on the site should look like one card family now,
 * and CallbackBar's own reasoning applies here too: this card holds inputs,
 * so it stays opaque rather than glass.
 */
export const formCard = {
  background: c.panel,
  border: `1px solid ${c.navyLine}`,
  borderRadius: 16,
  padding: 34,
};
