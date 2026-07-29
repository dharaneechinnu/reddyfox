import { Link } from 'react-router-dom';
import { SERVICES } from '../data';
import { COMPANY, CONTACT } from '../company';
import { c, fonts, wrap } from '../tokens';

const fieldLabel = { display: 'block', fontSize: 12.5, fontWeight: 500, color: c.textMuted, marginBottom: 7 };
const fieldInput = { width: '100%', border: `1px solid ${c.softLine}`, borderRadius: 9, padding: '13px 14px', fontSize: 14.5, outline: 'none', color: c.navy };

const MAPS_QUERY = encodeURIComponent(`${COMPANY.legalName}, ${CONTACT.addressOneLine}`);

export default function Contact() {
  return (
    <div>
      <section style={{ background: c.navy, padding: '60px 0 72px' }}>
        <div style={wrap}>
          <div style={{ font: `400 12.5px/1.4 ${fonts.mono}`, color: c.navyMuted, marginBottom: 22 }}>
            <Link to="/" style={{ cursor: 'pointer', color: c.onNavyText }}>Home</Link> / Contact
          </div>
          <h1 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: 'clamp(34px,4vw,54px)', lineHeight: 1.05, color: '#fff', margin: '0 0 14px' }}>Get a free quote</h1>
          <p style={{ fontSize: 16.5, lineHeight: 1.6, color: c.onNavyText, margin: 0, maxWidth: 560 }}>
            Call us for today’s rate, or send an enquiry and we will get back to you.
          </p>
        </div>
      </section>

      <section style={{ background: c.sand, padding: '64px 0 96px' }}>
        <div style={{ ...wrap, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 24, alignItems: 'start' }}>
          <div style={{ background: '#fff', border: `1px solid ${c.sandLine}`, borderRadius: 16, padding: 34 }}>
            <h2 style={{ fontSize: 22, fontWeight: 600, color: c.navy, margin: '0 0 24px' }}>Send an enquiry</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, marginBottom: 16 }}>
              <div><label style={fieldLabel}>Full name</label><input placeholder="As per your passport" style={fieldInput} /></div>
              <div><label style={fieldLabel}>Phone</label><input placeholder="+91" style={fieldInput} /></div>
              <div><label style={fieldLabel}>Email</label><input placeholder="name@email.com" style={fieldInput} /></div>
              <div>
                <label style={fieldLabel}>I need</label>
                <select style={{ ...fieldInput, background: '#fff', padding: '13px 12px' }}>
                  {SERVICES.map((s) => <option key={s.id}>{s.title}</option>)}
                </select>
              </div>
            </div>
            <label style={fieldLabel}>Message</label>
            <textarea rows={5} placeholder="Currency, amount and the date you need it" style={{ ...fieldInput, resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 16 }}>
              <input type="checkbox" style={{ marginTop: 3, accentColor: c.orange }} />
              <span style={{ fontSize: 13, lineHeight: 1.55, color: c.textMuted }}>I consent to being contacted about this enquiry.</span>
            </div>
            <span style={{ marginTop: 22, display: 'block', textAlign: 'center', background: c.orange, color: '#fff', padding: 15, borderRadius: 9, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = c.orangeDark)} onMouseLeave={(e) => (e.currentTarget.style.background = c.orange)}
            >Send now</span>
            <p style={{ margin: '14px 0 0', fontSize: 11.8, lineHeight: 1.55, color: c.textFainter, textAlign: 'center' }}>
              This form is not yet connected — please call or email us in the meantime.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: c.navy, borderRadius: 16, padding: 32, color: '#fff' }}>
              <p style={{ font: `500 11px/1.4 ${fonts.mono}`, letterSpacing: '.16em', color: c.accent, margin: '0 0 22px' }}>SHOP INFO</p>
              <p style={{ fontSize: 16, lineHeight: 1.7, margin: '0 0 22px', color: c.onNavyText2 }}>
                {CONTACT.addressLines.map((l) => <span key={l}>{l}<br /></span>)}
                <span style={{ color: c.navyMuted2 }}>{CONTACT.addressNote}</span>
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, borderTop: '1px solid rgba(255,255,255,.14)', paddingTop: 22, fontSize: 15 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
                  <span style={{ color: c.navyMuted2, flex: 'none' }}>Phone</span>
                  <span style={{ fontFamily: fonts.mono, textAlign: 'right' }}>
                    {CONTACT.mobiles.map((m) => (
                      <span key={m.tel}><a href={`tel:${m.tel}`} style={{ color: '#fff' }}>{m.display}</a><br /></span>
                    ))}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
                  <span style={{ color: c.navyMuted2, flex: 'none' }}>Landline</span>
                  <span style={{ fontFamily: fonts.mono, textAlign: 'right' }}>
                    {CONTACT.landlines.map((l) => (
                      <span key={l.tel}><a href={`tel:${l.tel}`} style={{ color: '#fff' }}>{l.display}</a><br /></span>
                    ))}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <span style={{ color: c.navyMuted2 }}>Email</span>
                  <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <span style={{ color: c.navyMuted2 }}>Website</span>
                  <span>{CONTACT.website}</span>
                </div>
              </div>
            </div>

            <a
              href={`https://www.google.com/maps/search/?api=1&query=${MAPS_QUERY}`}
              target="_blank"
              rel="noreferrer"
              style={{ background: c.mapBg, border: `1px solid ${c.mapBorder}`, borderRadius: 16, minHeight: 280, position: 'relative', overflow: 'hidden', display: 'block', textDecoration: 'none' }}
            >
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(11,27,51,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(11,27,51,.06) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <span style={{ width: 16, height: 16, borderRadius: '50%', background: c.orange, border: '3px solid #fff', boxShadow: '0 4px 10px rgba(11,27,51,.3)' }} />
                <span style={{ font: `400 11px/1.7 ${fonts.mono}`, letterSpacing: '.14em', color: c.mapDot, textAlign: 'center' }}>
                  CHALLA MALL, T. NAGAR<br />Open in Google Maps →
                </span>
              </div>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
