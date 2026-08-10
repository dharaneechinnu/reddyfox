import { useNavigate } from 'react-router-dom';
import { c, fs, fonts, wrap } from '../tokens';
import Seo from '../components/Seo';

function HomeIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v9.5a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
    </svg>
  );
}

function RatesIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 19V10" /><path d="M10 19V5" /><path d="M16 19v-7" /><path d="M22 19h-20" />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M14.8 9.2 13 13l-3.8 1.8L11 11z" />
    </svg>
  );
}

function PlaneIcon({ size = 46 }) {
  // A currency note folded into a paper aeroplane — off course, like the link
  // that brought you here.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12.5 20.5 4 13 20l-2.4-6.2z" />
      <path d="M10.6 13.8 20.5 4" />
    </svg>
  );
}

function Coin({ symbol, top, left, right, delay, duration, rotate }) {
  return (
    <span
      className="fx-404-coin"
      style={{
        position: 'absolute', top, left, right,
        width: 40, height: 40, borderRadius: '50%',
        background: c.orange, color: c.surface,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: fonts.mono, fontWeight: 600, fontSize: fs.lg,
        boxShadow: '0 14px 26px -12px rgba(0,0,0,.5)',
        animationDelay: delay, animationDuration: duration,
        '--fx-float-rot': rotate,
      }}
    >
      {symbol}
    </span>
  );
}

function FlipTile({ digit, delay }) {
  return (
    <span
      className="fx-404-tile"
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 84, height: 104, borderRadius: 12,
        background: c.surface, border: `1px solid ${c.sandBorder}`,
        boxShadow: '0 24px 48px -22px rgba(0,0,0,.55)',
        fontFamily: fonts.mono, fontWeight: 700, fontSize: fs.hero,
        color: c.navy, animationDelay: delay,
      }}
    >
      {digit}
    </span>
  );
}

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <section className="fx-404-hero" style={{ background: c.navy, position: 'relative', overflow: 'hidden', padding: '120px 0 130px' }}>
      <Seo title="Page Not Found" path="/404" noindex />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px)', backgroundSize: '72px 72px' }} />
      <div style={{ position: 'absolute', top: -180, left: -140, width: 560, height: 560, borderRadius: '50%', background: 'radial-gradient(circle,rgba(226,87,31,.22),transparent 62%)' }} />

      <div style={{ position: 'relative', ...wrap, textAlign: 'center' }}>
        <div className="fx-404-illustration" style={{ position: 'relative', maxWidth: 420, margin: '0 auto 40px', perspective: 700 }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            <FlipTile digit="4" delay="0s" />
            <FlipTile digit="0" delay=".12s" />
            <FlipTile digit="4" delay=".24s" />
          </div>

          <Coin symbol="₹" top={-22} left={-6} delay="0s" duration="4.2s" rotate="-8deg" />
          <Coin symbol="$" top={30} right={-18} delay=".6s" duration="5.1s" rotate="6deg" />
          <Coin symbol="£" top={92} left={4} delay="1.1s" duration="4.8s" rotate="-4deg" />

          <span
            className="fx-404-plane"
            style={{ position: 'absolute', top: -58, right: 24, color: c.accent, transform: 'rotate(-6deg)' }}
          >
            <PlaneIcon />
          </span>
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid rgba(255,255,255,.18)', borderRadius: 100, padding: '7px 15px', marginBottom: 22 }}>
          <CompassIcon />
          <span style={{ fontFamily: fonts.mono, fontWeight: 500, fontSize: fs.xs, lineHeight: 1.4, letterSpacing: '.16em', color: c.onNavyText2 }}>ERROR 404 · OFF THE MAP</span>
        </div>

        <h1 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: fs.h1, lineHeight: 1.08, color: c.surface, margin: '0 auto 18px', maxWidth: 620 }}>
          This page has been withdrawn from circulation.
        </h1>
        <p style={{ fontSize: fs.xl, lineHeight: 1.65, color: c.onNavyText, margin: '0 auto 34px', maxWidth: 520 }}>
          The link may be out of date. The rate board, converter and branch list are all one click away.
        </p>

        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <span
            onClick={() => navigate('/')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: c.orange, color: c.surface, padding: '15px 26px', borderRadius: 9, fontSize: fs.md, fontWeight: 600, cursor: 'pointer' }}
          >
            <HomeIcon /> Back to home
          </span>
          <span
            onClick={() => navigate('/rates')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 9, border: `1px solid ${c.softLine}`, color: c.surface, padding: '15px 26px', borderRadius: 9, fontSize: fs.md, fontWeight: 600, cursor: 'pointer' }}
          >
            <RatesIcon /> Today's rates
          </span>
        </div>
      </div>
    </section>
  );
}
