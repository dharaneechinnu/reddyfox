import { Link, useNavigate } from 'react-router-dom';
import { SERVICES } from '../data';
import { c, fs, fonts, wrap } from '../tokens';
import Seo from '../components/Seo';
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
      <section style={{ background: c.navy, padding: '60px 0 72px' }}>
        <div style={wrap}>
          <div style={{ fontFamily: fonts.mono, fontWeight: 400, fontSize: fs.sm, lineHeight: 1.4, color: c.navyMuted, marginBottom: 22 }}>
            <Link to="/" style={{ cursor: 'pointer', color: c.onNavyText }}>Home</Link> / Services
          </div>
          <h1 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: fs.h1, lineHeight: 1.05, color: c.surface, margin: '0 0 14px', maxWidth: 760 }}>Six services, one licence, one compliance team</h1>
          <p style={{ fontSize: fs.lg, lineHeight: 1.6, color: c.onNavyText, margin: 0, maxWidth: 600 }}>Retail counters, remittance desks and a corporate dealing room operating under the same authorisation.</p>
        </div>
      </section>
      <section style={{ background: c.surface, padding: '72px 0 96px' }}>
        <div style={{ ...wrap, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(320px,100%),1fr))', gap: 20 }}>
          {SERVICES.map((s) => (
            <div
              key={s.id}
              onClick={() => navigate(`/services/${s.id}`)}
              style={{ border: `1px solid ${c.sandLine}`, borderRadius: 14, overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow .22s,transform .22s' }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 24px 40px -28px rgba(11,27,51,.4)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
            >
              <SitePhoto
                slot={`service_${s.id}`}
                placeholderLabel={s.title.toUpperCase()}
                style={{ height: 160, border: 'none', borderRadius: 0 }}
              />
              <div style={{ padding: 32 }}>
                <span style={{ width: 40, height: 40, borderRadius: 9, background: c.serviceIconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.mono, fontWeight: 500, fontSize: fs.xs, lineHeight: 1.4, color: c.orange, marginBottom: 20 }}>{s.tag}</span>
                <h3 style={{ fontSize: fs['2xl'], fontWeight: 600, color: c.navy, margin: '0 0 10px' }}>{s.title}</h3>
                <p style={{ fontSize: fs.base, lineHeight: 1.62, color: c.textMuted, margin: '0 0 18px' }}>{s.body}</p>
                <span style={{ fontSize: fs.base, fontWeight: 600, color: c.orange }}>Open service page →</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
