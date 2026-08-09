import { c, fs, stamp, btnPrimary, btnPrimaryHover } from '../tokens';
import Reveal from './Reveal';

/**
 * The element "start with step one" scrolls to: the callback form under the
 * hero. Exported so the anchor here and the id on that panel cannot drift
 * apart — a hash that matches nothing fails silently, which is exactly the
 * kind of break nobody notices until a customer does.
 */
export const STEP_ONE_ID = 'step-one';

/**
 * How an order runs, as three steps in a row filling the hero's right half.
 *
 * Labelled "Step 1/2/3" rather than 01/02/03 because this is a process the
 * customer walks through, and the plain word is what a first-time visitor
 * reads without decoding. The copy is deliberately one short sentence per step —
 * anything longer stops being a process and starts being terms and conditions.
 *
 * Every claim traces to what the business already publishes (see SERVICES in
 * data.js): rates quoted by a dealer, nothing charged up front, and same-day
 * home delivery. The documents needed and the RBI cash limit live on the
 * Foreign Exchange service page and in the facts box below, not here.
 *
 * The three reveal one after another on load. That works here, unlike in the
 * full-width section this replaced, because the hero is above the fold — the
 * sequence plays where someone can actually see it. Reduced-motion users get
 * all three at once; index.css neutralises .fx-rise.
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

// `note` is the mono caption under each card's hairline. Each one restates a
// fact the site already publishes — no account or online payment (the callback
// form says so), a dealer rings you back on the counter's own number, and
// same-day delivery in Chennai (see SERVICES in data.js). None of them is a new
// claim; that matters on a regulated business's homepage.
export const STEPS = [
  {
    label: 'Step 1',
    Icon: IconChat,
    title: 'Tell us what you need',
    body: 'Leave your number, or call us with the currency and how much you need.',
    note: 'No account needed',
  },
  {
    label: 'Step 2',
    Icon: IconConfirmed,
    title: 'We confirm your rate',
    body: 'A dealer calls you back with the rate. Agree it on the call — nothing is charged before that.',
    note: 'Direct dealer line',
  },
  {
    label: 'Step 3',
    Icon: IconDelivery,
    title: 'We deliver the same day',
    body: 'Your currency reaches your door the same day. No trip across town.',
    note: 'Same day in Chennai',
  },
];

export default function HeroSteps() {
  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'clamp(16px,1.8vw,22px)' }}>
      <div className="fx-rise" style={{ '--fx-delay': '.26s', fontSize: fs.md, color: c.onNavyText2 }}>
        Three steps to your currency
      </div>

      {/* Three fixed tracks, not auto-fit: this sits in half the hero, and an
          auto-fitting grid with any sensible minimum would fold straight back
          to one column at exactly the width the three are meant to share. The
          whole block stacks with the hero grid below 1000px (see index.css).
          The three stretch to each other, not to the pitch beside them — the
          row is only as tall as the longest of the three, and `marginTop: auto`
          on the footers lands all three captions on one line. */}
      <div className="fx-hero-steps" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 'clamp(10px,1.1vw,14px)' }}>
        {STEPS.map(({ label, Icon, title, body, note }, i) => (
          <Reveal
            key={label}
            // 160ms apart, so the three land one after another rather than as
            // one block that happens to be slightly blurred. They start after
            // the pitch beside them, which runs to .24s.
            delay={0.3 + i * 0.16}
            className="fx-hover-lift-panel"
            style={{
              // Opaque, not translucent: the dotted map runs behind these
              // cards, and through a 5%-white panel every dot showed through
              // the body copy.
              background: c.panel,
              border: `1px solid ${c.navyLine}`,
              borderRadius: 14,
              padding: 'clamp(16px,1.5vw,20px)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ width: 34, height: 34, borderRadius: 9, flex: 'none', background: c.stepTints[i], color: c.orange, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon />
              </span>
              <span style={{ ...stamp, fontSize: fs['2xs'], color: c.accentOnInk }}>{label}</span>
            </div>
            <h3 style={{ fontSize: fs.lg, fontWeight: 600, color: c.surface, margin: '0 0 7px', letterSpacing: '-.01em' }}>{title}</h3>
            <p style={{ fontSize: fs.sm, lineHeight: 1.6, color: c.onNavyText, margin: '0 0 16px' }}>{body}</p>
            <div style={{ ...stamp, fontSize: fs['2xs'], color: c.navyMuted2, borderTop: `1px solid ${c.navyLine}`, paddingTop: 13, marginTop: 'auto' }}>{note}</div>
          </Reveal>
        ))}
      </div>

      {/* The block ends where step one begins — and step one is the callback
          form further down this same page, not another route. A plain hash
          anchor rather than a router link or a scroll handler: the browser does
          the scrolling (html carries scroll-behavior: smooth), it survives
          being opened in a new tab, and it lands on a real element rather than
          a coordinate. */}
      <div className="fx-rise" style={{ '--fx-delay': '.62s', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <a
          href={`#${STEP_ONE_ID}`}
          style={btnPrimary}
          onMouseEnter={(e) => { e.currentTarget.style.background = btnPrimaryHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = c.surface; }}
        >
          Start with step one
          <span aria-hidden="true">→</span>
        </a>
        <span style={{ fontSize: fs.sm, color: c.navyMuted2 }}>Takes under a minute.</span>
      </div>
    </div>
  );
}
