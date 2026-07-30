import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { c, fonts, wrap } from '../tokens';
import { normalizePhone, validatePhone } from '../validation';
import { trackLead } from '../api';
import { Field, SubmitButton, formCard } from '../components/FormBits';
import Seo from '../components/Seo';

const STATUS_COLOURS = {
  new: [c.redBg, c.redText],
  contacted: [c.amberBg, c.amberText],
  quoted: [c.greenBg, c.greenText],
  closed: [c.neutralBg, c.textMuted],
};

const KIND_LABELS = {
  enquiry: 'Enquiry', quote: 'Quote request', rate_lock: 'Rate lock',
};

function StatusBadge({ status, label }) {
  const [bg, fg] = STATUS_COLOURS[status] || [c.neutralBg, c.textMuted];
  return (
    <span style={{ background: bg, color: fg, padding: '4px 11px', borderRadius: 6, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {label.toUpperCase()}
    </span>
  );
}

export default function TrackRequest() {
  const [params] = useSearchParams();
  const [phone, setPhone] = useState('');
  const [reference, setReference] = useState((params.get('reference') || '').toUpperCase());
  const [touched, setTouched] = useState(false);
  const [state, setState] = useState({ status: 'idle' }); // idle | loading | found | not_found | error

  const phoneError = touched ? validatePhone(phone) : undefined;
  const referenceError = touched && !reference.trim() ? 'Please enter your reference code.' : undefined;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (validatePhone(phone) || !reference.trim()) return;

    setState({ status: 'loading' });
    try {
      const data = await trackLead(normalizePhone(phone), reference.trim());
      setState(data ? { status: 'found', data } : { status: 'not_found' });
    } catch (err) {
      setState({ status: 'error', message: err.message });
    }
  };

  return (
    <div>
      <Seo
        title="Track My Request"
        description="Check the status of an enquiry, quote request or rate lock you submitted to Reddy Forex using your phone number and reference code."
        path="/track"
        noindex
      />
      <section style={{ background: c.navy, padding: '60px 0 72px' }}>
        <div style={wrap}>
          <div style={{ font: `400 12.5px/1.4 ${fonts.mono}`, color: c.navyMuted, marginBottom: 22 }}>
            <Link to="/" style={{ cursor: 'pointer', color: c.onNavyText }}>Home</Link> / Track my request
          </div>
          <h1 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: 'clamp(34px,4vw,54px)', lineHeight: 1.05, color: '#fff', margin: '0 0 14px' }}>Track my request</h1>
          <p style={{ fontSize: 16.5, lineHeight: 1.6, color: c.onNavyText, margin: 0, maxWidth: 560 }}>
            Enter the phone number and reference code you were given when you submitted an enquiry, quote request or rate lock.
          </p>
        </div>
      </section>

      <section style={{ background: c.sand, padding: '44px 0 96px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 32px' }}>
          <form noValidate onSubmit={handleSubmit} style={formCard}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 18 }}>
              <Field
                id="track-phone" label="Phone number" error={phoneError}
                value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210"
              />
              <Field
                id="track-reference" label="Reference code" error={referenceError}
                value={reference} onChange={(e) => setReference(e.target.value.toUpperCase())} placeholder="AB3D-7F2K"
              />
            </div>
            <SubmitButton sending={state.status === 'loading'} sendingLabel="Looking up…">
              Check status
            </SubmitButton>
          </form>

          {state.status === 'not_found' && (
            <div role="alert" style={{ marginTop: 20, border: `1px solid ${c.redBorder}`, background: c.redBg2, borderRadius: 12, padding: 22, fontSize: 14.5, color: c.redText }}>
              We couldn't find a request matching that phone number and reference code. Double-check both, or call us if you're not sure.
            </div>
          )}

          {state.status === 'error' && (
            <div role="alert" style={{ marginTop: 20, border: `1px solid ${c.redBorder}`, background: c.redBg2, borderRadius: 12, padding: 22, fontSize: 14.5, color: c.redText }}>
              {state.message}
            </div>
          )}

          {state.status === 'found' && <ResultCard data={state.data} />}
        </div>
      </section>
    </div>
  );
}

function ResultCard({ data }) {
  return (
    <div style={{ marginTop: 20, background: '#fff', border: `1px solid ${c.sandLine}`, borderRadius: 16, padding: 30 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 11.5, color: c.textMuted, marginBottom: 4 }}>{KIND_LABELS[data.kind] || data.kind_display}</div>
          <div style={{ fontFamily: fonts.mono, fontSize: 16, fontWeight: 600, color: c.navy }}>{data.reference_display}</div>
        </div>
        <StatusBadge status={data.status} label={data.status_display} />
      </div>

      <div style={{ display: 'grid', gap: 10, fontSize: 14.5, color: c.text }}>
        {data.service && <Row label="Service" value={data.service} />}
        {data.from_currency && data.kind === 'rate_lock' && (
          <Row label="Pair" value={`${data.from_currency} → ${data.to_currency}`} />
        )}
        {data.from_currency && data.kind === 'quote' && <Row label="Currency" value={data.from_currency} />}
        {data.amount && <Row label="Amount" value={data.amount} />}
        {data.quoted_rate && <Row label="Rate locked" value={data.quoted_rate} />}
        {data.converted_amount && <Row label="You'll receive" value={data.converted_amount} />}
        {data.needed_by && <Row label="Needed by" value={data.needed_by} />}
        {data.kind === 'rate_lock' && data.lock_expires_at && (
          <Row
            label="Lock expires"
            value={data.is_expired ? 'Expired' : data.expires_in}
          />
        )}
        {data.message && <Row label="Your message" value={data.message} />}
        <Row label="Submitted" value={new Date(data.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) + ' IST'} />
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, paddingBottom: 10, borderBottom: `1px solid ${c.sandLine3}` }}>
      <span style={{ color: c.textMuted }}>{label}</span>
      <span style={{ fontWeight: 600, color: c.navy, textAlign: 'right' }}>{value}</span>
    </div>
  );
}
