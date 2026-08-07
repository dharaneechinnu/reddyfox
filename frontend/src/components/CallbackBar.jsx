import { useFx } from '../context/FxContext';
import { c, fs, fonts, stamp, btnOnBrand } from '../tokens';
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
 * The callback form, as the panel beside the facts box under the hero.
 *
 * This is the only form on the homepage — nothing is sold here, so a phone
 * number in front of a dealer is the entire conversion (see
 * docs/team-notifications.md). It used to be a full-width band across the foot
 * of the hero, and before that a bar pinned to the window; it is a stacked card
 * now, which gives the fields room to be read instead of squeezing them into a
 * six-column strip, and it sits next to the four reasons to trust the counter
 * with the number it is asking for.
 *
 * The name field is not in the original design, which had amount, currency and
 * mobile only. It is here because a dealer ringing a stranger back needs
 * something to open with, and `Lead.name` is required — the alternative was
 * making it optional on the model and handing the desk anonymous numbers.
 *
 * Amount and currency come from FxContext, so whatever a visitor types here is
 * the same value the rest of the page is working from.
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
  const label = { ...stamp, fontSize: fs['2xs'], color: c.accentOnInk, marginBottom: 6, display: 'block' };

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

      <form
        noValidate
        onSubmit={f.handleSubmit}
        style={{
          position: 'relative',
          // Solid rather than the glass the step cards use: this one holds
          // inputs, and white fields on a translucent panel read as floating.
          background: c.panel,
          border: `1px solid ${c.navyLine}`,
          borderRadius: 16,
          padding: 'clamp(24px,2.6vw,34px)',
          // Fills the hero column, so the panel and the pitch beside it end on
          // the same line whichever of the two is taller.
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 'clamp(14px,1.6vw,18px)',
        }}
      >
        <div>
          <div style={{ ...stamp, fontSize: fs['2xs'], color: c.accentOnInk, marginBottom: 6 }}>Step one</div>
          <div style={{ fontFamily: fonts.serif, fontSize: fs['2xl'], lineHeight: 1.1, color: c.surface }}>Ask for today’s rate</div>
        </div>

        {/* Amount and currency read as one control, so they share a row. */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 'clamp(10px,1.2vw,14px)' }}>
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

        {/* Honeypot — see FormBits.Honeypot; kept inline so the panel is one form. */}
        <input
          type="text" name="enquiry_ref" tabIndex={-1} autoComplete="off" aria-hidden="true"
          value={f.values.enquiry_ref} onChange={(e) => f.setField('enquiry_ref', e.target.value)}
          style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
        />

        <button type="submit" disabled={f.sending} style={{ ...btnOnBrand, width: '100%', marginTop: 'auto', opacity: f.sending ? .7 : 1 }}>
          {f.sending ? 'Sending…' : 'Call me back'}
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: fs.sm, lineHeight: 1.5, color: c.navyMuted2 }}>
          <span>A dealer calls within 15 minutes during counter hours.</span>
          <span>No account, no online payment, no obligation.</span>
          {(f.errorCount > 0 || f.serverError) && (
            <span role="alert" style={{ color: c.surface, fontWeight: 600 }}>
              {f.serverError || 'Check the highlighted fields.'}
            </span>
          )}
        </div>
      </form>
    </>
  );
}
