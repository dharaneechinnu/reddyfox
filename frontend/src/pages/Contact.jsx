import { Link } from 'react-router-dom';
import { COMPANY, CONTACT } from '../company';
import { c, fonts, wrap } from '../tokens';
import EnquiryForm from '../components/EnquiryForm';
import Seo from '../components/Seo';
import { useCompanyInfo } from '../context/CompanyInfoContext';

export default function Contact() {
  const { contact } = useCompanyInfo();
  // Built here, not at module scope like the old static CONTACT import
  // allowed, because contact.addressOneLine now depends on the async/
  // fail-open backend value — see CompanyInfoContext.jsx.
  const mapsQuery = encodeURIComponent(`${COMPANY.legalName}, ${contact.addressOneLine}`);
  return (
    <div>
      <Seo
        title="Contact Us"
        description={`Visit Reddy Forex at ${contact.addressOneLine}, or call ${contact.mobiles[0].display} for today's rate.`}
        path="/contact"
      />
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
        <div style={{ ...wrap, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(320px,100%),1fr))', gap: 24, alignItems: 'start' }}>
          <EnquiryForm />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: c.navy, borderRadius: 16, padding: 32, color: '#fff' }}>
              <p style={{ font: `500 11px/1.4 ${fonts.mono}`, letterSpacing: '.16em', color: c.accent, margin: '0 0 22px' }}>SHOP INFO</p>
              <p style={{ fontSize: 16, lineHeight: 1.7, margin: '0 0 22px', color: c.onNavyText2 }}>
                {contact.addressLines.map((l) => <span key={l}>{l}<br /></span>)}
                <span style={{ color: c.navyMuted2 }}>{contact.addressNote}</span>
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, borderTop: '1px solid rgba(255,255,255,.14)', paddingTop: 22, fontSize: 15 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
                  <span style={{ color: c.navyMuted2, flex: 'none' }}>Phone</span>
                  <span style={{ fontFamily: fonts.mono, textAlign: 'right' }}>
                    {contact.mobiles.map((m) => (
                      <span key={m.tel}><a href={`tel:${m.tel}`} style={{ color: '#fff' }}>{m.display}</a><br /></span>
                    ))}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
                  <span style={{ color: c.navyMuted2, flex: 'none' }}>Landline</span>
                  <span style={{ fontFamily: fonts.mono, textAlign: 'right' }}>
                    {contact.landlines.map((l) => (
                      <span key={l.tel}><a href={`tel:${l.tel}`} style={{ color: '#fff' }}>{l.display}</a><br /></span>
                    ))}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <span style={{ color: c.navyMuted2 }}>Email</span>
                  <a href={`mailto:${contact.email}`}>{contact.email}</a>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <span style={{ color: c.navyMuted2 }}>Website</span>
                  <span>{CONTACT.website}</span>
                </div>
              </div>
            </div>

            <a
              href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
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
