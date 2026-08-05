import { useFx } from '../context/FxContext';
import { c, fs, fonts, wrap, stamp, btnOnBrand } from '../tokens';
import { validatePhone, validateRequired } from '../validation';
import { submitCallbackRequest } from '../api';
import useLeadForm from '../hooks/useLeadForm';
import LeadSuccess from './LeadSuccess';

const ID = 'bar';

const VALIDATORS = {
  name: (v) => validateRequired(v, 'full name'),
  phone: (v) => validatePhone(v),
};

/**
 * The callback form: a band across the foot of the hero, directly above the
 * scrolling rate ticker.
 *
 * This is the only form on the homepage — the phones in the hero are marketing,
 * not inputs. It was briefly pinned to the window; it now sits in the page, so
 * it stops covering content and the mobile tab bar keeps the bottom of the
 * screen. It is still the last thing on the first screen, which is the position
 * that matters: nothing is sold here, so a phone number in front of a dealer is
 * the entire conversion (see docs/team-notifications.md).
 *
 * The name field is not in the original design, which had amount, currency and
 * mobile only. It is here because a dealer ringing a stranger back needs
 * something to open with, and `Lead.name` is required — the alternative was
 * making it optional on the model and handing the desk anonymous numbers.
 *
 * Amount and currency come from FxContext, so whatever a visitor typed into the
 * bar is the same value the rest of the page is working from.
 */
export default function CallbackBar() {
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

  const field = {
    width: '100%', minWidth: 0, border: `1px solid ${c.navyLine}`, borderRadius: 7,
    padding: '11px 12px', fontSize: fs.base, fontFamily: fonts.mono,
    color: c.navy, background: c.surface, outline: 'none',
  };
  const label = { ...stamp, fontSize: fs['2xs'], color: c.accent, marginBottom: 6, display: 'block' };

  return (
    <>
      {f.result && (
        <LeadSuccess
          heading={`Thanks, ${f.values.name.trim().split(' ')[0]}`}
          onReset={f.reset}
          resetLabel="Request another callback"
        >
          A dealer will call you with the rate for <strong>{fx.calc.amountLabel}</strong>.
        </LeadSuccess>
      )}

      <div className="fx-callback-bar" style={{ position: 'relative', background: c.orangeDark, borderTop: `1px solid ${c.navyLine}` }}>
        <form noValidate onSubmit={f.handleSubmit} style={{ ...wrap, padding: 'clamp(18px,2.2vw,26px) clamp(16px,4.5vw,32px)' }}>
          <div className="fx-callback-row" style={{ display: 'grid', gridTemplateColumns: '1.1fr .8fr .7fr 1fr 1fr auto', gap: 'clamp(10px,1.4vw,18px)', alignItems: 'end' }}>
            <div className="fx-callback-label">
              <div style={{ ...stamp, fontSize: fs['2xs'], color: c.accent, marginBottom: 5 }}>Step one</div>
              <div style={{ fontFamily: fonts.serif, fontSize: fs.xl, lineHeight: 1.1, color: c.surface }}>Ask for today’s rate</div>
            </div>

            <div>
              <label htmlFor={`${ID}-amount`} style={label}>Amount</label>
              <input
                id={`${ID}-amount`} value={fx.amount} inputMode="decimal"
                onChange={(e) => fx.setAmount(e.target.value)} style={field}
              />
            </div>

            <div>
              <label htmlFor={`${ID}-currency`} style={label}>Currency</label>
              <select
                id={`${ID}-currency`} value={fx.from}
                onChange={(e) => fx.setFrom(e.target.value)}
                style={{ ...field, fontFamily: fonts.sans, fontWeight: 600, cursor: 'pointer' }}
              >
                {fx.currencyList.map((cur) => <option key={cur.code} value={cur.code}>{cur.code}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor={`${ID}-name`} style={label}>Name</label>
              <input
                id={`${ID}-name`} value={f.values.name} autoComplete="name" placeholder="Your name"
                onChange={(e) => f.setField('name', e.target.value)}
                onBlur={() => f.handleBlur('name')}
                aria-invalid={f.errorFor('name') ? 'true' : undefined}
                style={{ ...field, fontFamily: fonts.sans, borderColor: f.errorFor('name') ? c.errorField : c.navyLine }}
              />
            </div>

            <div>
              <label htmlFor={`${ID}-phone`} style={label}>Mobile</label>
              <input
                id={`${ID}-phone`} value={f.values.phone} type="tel" inputMode="tel" autoComplete="tel" placeholder="99414 56261"
                onChange={(e) => f.setField('phone', e.target.value)}
                onBlur={() => f.handleBlur('phone')}
                aria-invalid={f.errorFor('phone') ? 'true' : undefined}
                style={{ ...field, borderColor: f.errorFor('phone') ? c.errorField : c.navyLine }}
              />
            </div>

            {/* Honeypot — see FormBits.Honeypot; kept inline so the bar is one form. */}
            <input
              type="text" name="enquiry_ref" tabIndex={-1} autoComplete="off" aria-hidden="true"
              value={f.values.enquiry_ref} onChange={(e) => f.setField('enquiry_ref', e.target.value)}
              style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
            />

            <button type="submit" disabled={f.sending} style={{ ...btnOnBrand, opacity: f.sending ? .7 : 1 }}>
              {f.sending ? 'Sending…' : 'Call me back'}
            </button>
          </div>

          <div className="fx-callback-note" style={{ display: 'flex', gap: 'clamp(12px,3vw,28px)', flexWrap: 'wrap', marginTop: 12, fontSize: fs.sm, color: c.accent }}>
            <span>A dealer calls within 15 minutes during counter hours.</span>
            <span aria-hidden="true" style={{ opacity: .4 }}>|</span>
            <span>No account, no online payment, no obligation.</span>
            {(f.errorCount > 0 || f.serverError) && (
              <span role="alert" style={{ color: c.surface, fontWeight: 600 }}>
                {f.serverError || 'Check the highlighted fields.'}
              </span>
            )}
          </div>
        </form>
      </div>
    </>
  );
}
