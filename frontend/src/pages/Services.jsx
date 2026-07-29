import { Link, useNavigate } from 'react-router-dom';
import { SERVICES } from '../data';
import { c, fonts, wrap } from '../tokens';

export default function Services() {
  const navigate = useNavigate();
  return (
    <div>
      <section style={{ background: c.navy, padding: '60px 0 72px' }}>
        <div style={wrap}>
          <div style={{ font: `400 12.5px/1.4 ${fonts.mono}`, color: c.navyMuted, marginBottom: 22 }}>
            <Link to="/" style={{ cursor: 'pointer', color: c.onNavyText }}>Home</Link> / Services
          </div>
          <h1 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: 'clamp(34px,4vw,56px)', lineHeight: 1.05, color: '#fff', margin: '0 0 14px', maxWidth: 760 }}>Six services, one licence, one compliance team</h1>
          <p style={{ fontSize: 16.5, lineHeight: 1.6, color: c.onNavyText, margin: 0, maxWidth: 600 }}>Retail counters, remittance desks and a corporate dealing room operating under the same authorisation.</p>
        </div>
      </section>
      <section style={{ background: '#fff', padding: '72px 0 96px' }}>
        <div style={{ ...wrap, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 20 }}>
          {SERVICES.map((s) => (
            <div
              key={s.id}
              onClick={() => navigate(`/services/${s.id}`)}
              style={{ border: `1px solid ${c.sandLine}`, borderRadius: 14, padding: 32, cursor: 'pointer', transition: 'box-shadow .22s,transform .22s' }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 24px 40px -28px rgba(11,27,51,.4)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
            >
              <span style={{ width: 40, height: 40, borderRadius: 9, background: c.serviceIconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `500 12px/1.4 ${fonts.mono}`, color: c.orange, marginBottom: 20 }}>{s.tag}</span>
              <h3 style={{ fontSize: 20, fontWeight: 600, color: c.navy, margin: '0 0 10px' }}>{s.title}</h3>
              <p style={{ fontSize: 14.8, lineHeight: 1.62, color: c.textMuted, margin: '0 0 18px' }}>{s.body}</p>
              <span style={{ fontSize: 14, fontWeight: 600, color: c.orange }}>Open service page →</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
