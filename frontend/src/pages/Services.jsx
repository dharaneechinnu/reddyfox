import { Link, useNavigate } from 'react-router-dom';
import { SERVICES } from '../data';
import { c, fs, fonts, wrap, stamp } from '../tokens';
import Seo from '../components/Seo';
import Reveal from '../components/Reveal';
import SitePhoto from '../components/SitePhoto';

export default function Services() {
  const navigate = useNavigate();
  return (
    <div>
      <Seo
        title="Forex Services"
        description="Foreign exchange, Western Union money transfer, outward remittance, prepaid forex cards, wire transfers and student services — all under one RBI licence in T. Nagar, Chennai."
        path="/services"
      />
      <section style={{ background: c.page, padding: '60px 0 72px' }}>
        <div style={wrap}>
          <div style={{ fontFamily: fonts.mono, fontWeight: 400, fontSize: fs.sm, lineHeight: 1.4, color: c.pageMuted, marginBottom: 22 }}>
            <Link to="/" style={{ cursor: 'pointer', color: c.pageEyebrow }}>Home</Link> / Services
          </div>
          <h1 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: fs.h1, lineHeight: 1.05, color: c.pageHeading, margin: '0 0 14px', maxWidth: 760 }}>Six things we do, all in one shop</h1>
          {/* Was "retail counters, remittance desks and a corporate dealing room" —
              three departments this business does not have. It is one counter in
              T. Nagar, which company.js and the homepage both say plainly. */}
          <p style={{ fontSize: fs.lg, lineHeight: 1.6, color: c.pageText, margin: 0, maxWidth: 600 }}>All of it handled by the same team, at our one shop in T. Nagar, Chennai, under the same RBI licence.</p>
        </div>
      </section>
      <section style={{ background: c.page, padding: '72px 0 96px' }}>
        <div style={{ ...wrap, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(320px,100%),1fr))', gap: 20 }}>
          {SERVICES.map((s, i) => (
            <Reveal
              key={s.id}
              delay={i * 0.07}
              className="fx-hover-lift-panel"
              // The card opens the service's page, not its form. A card is a
              // summary — the reader has had three lines about a regulated
              // financial service and is not yet in a position to fill
              // anything in. The form is one click further, from the page
              // itself, where the rules and the paperwork are set out.
              onClick={() => navigate(`/services/${s.id}`)}
              // Solid, not the glass the hero's step cards use: this section has
              // no dotted-map texture behind it (that backdrop is scoped to the
              // homepage hero), so a translucent fill here has nothing to reveal
              // and just reads as a duller, washed-out version of this same card.
              style={{ background: c.panel, border: `1px solid ${c.navyLine}`, borderRadius: 14, overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
            >
              <SitePhoto
                slot={`service_${s.id}`}
                placeholderLabel={s.title.toUpperCase()}
                style={{ height: 160, border: 'none', borderRadius: 0 }}
              />
              <div style={{ padding: 'clamp(20px,2.2vw,28px)', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                  <span style={{ width: 34, height: 34, borderRadius: 9, flex: 'none', background: c.stepTints[i % 3], color: c.orange, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: fonts.mono, fontWeight: 600, fontSize: fs.xs }}>{s.tag}</span>
                  </span>
                </div>
                <h3 style={{ fontSize: fs.xl, fontWeight: 600, color: c.surface, margin: '0 0 9px', letterSpacing: '-.01em' }}>{s.title}</h3>
                <p style={{ fontSize: fs.base, lineHeight: 1.62, color: c.onNavyText, margin: '0 0 20px' }}>{s.body}</p>
                <div style={{ ...stamp, fontSize: fs['2xs'], color: c.accentOnInk, borderTop: `1px solid ${c.navyLine}`, paddingTop: 13, marginTop: 'auto' }}>Read more →</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
