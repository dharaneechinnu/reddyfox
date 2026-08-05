import { Link } from 'react-router-dom';
import { c, fs, fonts, wrap, sectionY, stamp, card, btnPrimary, btnPrimaryHover } from '../tokens';
import SectionHead from './SectionHead';

/**
 * How an order runs, as three steps.
 *
 * Labelled "Step 1/2/3" rather than 01/02/03 because this is a process the
 * customer walks through, and the plain word is what a first-time visitor
 * reads without decoding. The copy is deliberately one short sentence per step —
 * anything longer stops being a process and starts being terms and conditions.
 *
 * Every claim traces to what the business already publishes (see SERVICES in
 * data.js): rates quoted by a dealer, nothing charged up front, and same-day
 * home delivery. The documents needed and the RBI cash limit live on the
 * Foreign Exchange service page and in the homepage facts strip, not here.
 */

// 22px stroke marks, drawn to inherit their step's colour via currentColor.
function IconChat() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6.5v8a2 2 0 0 1-2 2H9l-4.5 3.5v-3.5H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" />
      <path d="M8 9h7M8 12.5h4.5" />
    </svg>
  );
}

function IconConfirmed() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8.6" />
      <path d="M8.2 12.4l2.7 2.7 5-5.6" />
    </svg>
  );
}

function IconDelivery() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 6h10v9h-10z" />
      <path d="M12.5 9.5h3.6l2.9 3v2.5h-6.5" />
      <circle cx="6.5" cy="17" r="1.9" />
      <circle cx="16.5" cy="17" r="1.9" />
    </svg>
  );
}

// The three steps share one treatment — an indigo disc with a white mark —
// rather than taking a colour each. A colour per step needed hues the palette
// does not have, and the step number already says which one you are looking at;
// colour-coding it was decoration pretending to be information.
const STEPS = [
  {
    label: 'Step 1',
    Icon: IconChat,
    title: 'Tell us what you need',
    body: 'Leave your number, or call us with the currency and how much you need.',
  },
  {
    label: 'Step 2',
    Icon: IconConfirmed,
    title: 'We confirm your rate',
    body: 'A dealer calls you back with the rate. Agree it on the call — nothing is charged before that.',
  },
  {
    label: 'Step 3',
    Icon: IconDelivery,
    title: 'We deliver the same day',
    body: 'Your currency reaches your door the same day. No trip across town.',
  },
];

export default function HowItWorks() {
  return (
    // Cream ground with white cards, not a second dark panel: a page gets one
    // dark panel and the hero has it. The three white cards lifting off the
    // cream is what separates this section, rather than a change of background.
    <section style={{ background: c.sand, ...sectionY, borderTop: `1px solid ${c.sandLine}` }}>
      <div style={wrap}>
        <SectionHead
          label="How it works"
          title="Three steps to your currency"
          aside="No account to open and nothing paid online. Step one costs you a phone number."
        />

        <div className="fx-steps" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(260px,100%),1fr))', gap: 'clamp(16px,2vw,24px)' }}>
          {STEPS.map(({ label, Icon, title, body }) => (
            <div
              key={label}
              className="fx-step-card"
              // overflow stays visible so the dashed run between cards isn't clipped.
              style={{ ...card, overflow: 'visible', border: 'none', padding: 'clamp(24px,2.6vw,30px)', position: 'relative' }}
            >
              {/* Indigo disc, white mark. */}
              <span style={{ width: 46, height: 46, borderRadius: '50%', background: c.orange, color: c.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                <Icon />
              </span>
              <div style={{ ...stamp, color: c.orange, marginBottom: 9 }}>{label}</div>
              <h3 style={{ fontSize: fs['2xl'], fontWeight: 600, color: c.navy, margin: '0 0 9px', letterSpacing: '-.01em' }}>{title}</h3>
              <p style={{ fontSize: fs.base, lineHeight: 1.66, color: c.textMuted, margin: 0 }}>{body}</p>
            </div>
          ))}
        </div>

        {/* The section ends where step one begins. */}
        <div style={{ marginTop: 'clamp(28px,3vw,38px)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
          <Link
            to="/quote"
            style={btnPrimary}
            onMouseEnter={(e) => { e.currentTarget.style.background = btnPrimaryHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = c.orange; }}
          >
            Start with step one
          </Link>
          <span style={{ fontFamily: fonts.sans, fontSize: fs.sm, color: c.textFaint }}>Takes under a minute.</span>
        </div>
      </div>
    </section>
  );
}
