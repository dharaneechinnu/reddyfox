import { Link } from 'react-router-dom';
import { CONTACT } from '../company';
import { useFx } from '../context/FxContext';
import { c, fonts, wrap } from '../tokens';
import RateLockForm from '../components/RateLockForm';
import Seo from '../components/Seo';

export default function LockRate() {
  const fx = useFx();

  if (fx.ratesLoading) {
    return <div style={{ padding: '120px 32px', textAlign: 'center', color: c.textMuted }}>Loading today’s rates…</div>;
  }

  return (
    <div>
      <Seo
        title="Lock Today's Exchange Rate"
        description="Reserve today's exchange rate with Reddy Forex before it changes — lock it in from the converter and collect at our T. Nagar, Chennai counter."
        path="/lock-rate"
      />
      <section style={{ background: c.navy, padding: '60px 0 72px' }}>
        <div style={wrap}>
          <div style={{ font: `400 12.5px/1.4 ${fonts.mono}`, color: c.navyMuted, marginBottom: 22 }}>
            <Link to="/" style={{ cursor: 'pointer', color: c.onNavyText }}>Home</Link>{' / '}
            <Link to="/converter" style={{ cursor: 'pointer', color: c.onNavyText }}>Converter</Link>
            {' / Lock this rate'}
          </div>
          <h1 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: 'clamp(34px,4vw,54px)', lineHeight: 1.05, color: '#fff', margin: '0 0 14px' }}>
            Lock this rate
          </h1>
          <p style={{ fontSize: 16.5, lineHeight: 1.6, color: c.onNavyText, margin: 0, maxWidth: 560 }}>
            Reserve the rate you just worked out. A dealer confirms it with you before it expires.
          </p>
        </div>
      </section>

      <section style={{ background: c.sand, padding: '64px 0 96px' }}>
        <div style={{ ...wrap, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 24, alignItems: 'start' }}>
          <RateLockForm />

          <div style={{ background: c.navy, borderRadius: 16, padding: 32, color: '#fff' }}>
            <p style={{ font: `500 11px/1.4 ${fonts.mono}`, letterSpacing: '.16em', color: c.accent, margin: '0 0 22px' }}>
              HOW A RATE LOCK WORKS
            </p>
            <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 14, fontSize: 14.5, lineHeight: 1.6, color: c.onNavyText2 }}>
              <li>We record the exact rate and amount shown in the converter.</li>
              <li>Our rates desk sees it immediately and confirms it with you.</li>
              <li>Bring your passport and travel documents to collect at our T. Nagar shop.</li>
            </ol>

            <div style={{ borderTop: '1px solid rgba(255,255,255,.14)', marginTop: 26, paddingTop: 22 }}>
              <div style={{ fontSize: 12.5, color: c.navyMuted2, marginBottom: 8 }}>Questions before you commit?</div>
              {CONTACT.mobiles.slice(0, 2).map((m) => (
                <a key={m.tel} href={`tel:${m.tel}`} style={{ display: 'block', fontFamily: fonts.mono, fontSize: 16, color: '#fff', marginBottom: 6 }}>
                  {m.display}
                </a>
              ))}
              <a href={`mailto:${CONTACT.email}`} style={{ fontSize: 14.5 }}>{CONTACT.email}</a>
            </div>

            <p style={{ fontSize: 12.5, lineHeight: 1.6, color: c.navyMuted2, margin: '22px 0 0' }}>
              Rates shown online are indicative and refreshed through the day. The final rate is confirmed at
              the counter against valid ID and travel documents.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
