import { Link } from 'react-router-dom';
import { COMPANY, CONTACT } from '../company';
import { c, fs, fonts, wrap, inkCard, shadowCard } from '../tokens';
import EnquiryForm from '../components/EnquiryForm';
import Seo from '../components/Seo';
import { useCompanyInfo } from '../context/CompanyInfoContext';
import OpenStatus, { HoursTable } from '../components/OpenStatus';

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
      <section style={{ background: c.page, padding: '60px 0 72px' }}>
        <div style={wrap}>
          <div style={{ fontFamily: fonts.mono, fontWeight: 400, fontSize: fs.sm, lineHeight: 1.4, color: c.pageMuted, marginBottom: 22 }}>
            <Link to="/" style={{ cursor: 'pointer', color: c.pageEyebrow }}>Home</Link> / Contact
          </div>
          <h1 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: fs.h1, lineHeight: 1.05, color: c.pageHeading, margin: '0 0 14px' }}>Talk to us</h1>
          {/* This page is for the question that doesn't fit a service form.
              Anyone who knows which service they want gets that service's own
              pop-up from its card or its page, so the link out matters. */}
          <p style={{ fontSize: fs.lg, lineHeight: 1.6, color: c.pageText, margin: 0, maxWidth: 560 }}>
            Ask us anything and we will call you back. Know what you need already?{' '}
            <Link to="/services" style={{ color: c.pageEyebrow, textDecoration: 'underline' }}>Pick a service</Link>{' '}
            and tell us the details straight away.
          </p>
        </div>
      </section>

      <section style={{ background: c.page, padding: '64px 0 96px' }}>
        <div style={{ ...wrap, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(320px,100%),1fr))', gap: 24, alignItems: 'start' }}>
          <EnquiryForm />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Was filled with the ink, which on the indigo ground was a black
                rectangle on a black field — see --fx-panel-raised in theme.css. */}
            <div style={inkCard}>
              <p style={{ fontFamily: fonts.mono, fontWeight: 500, fontSize: fs.xs, lineHeight: 1.4, letterSpacing: '.16em', color: c.accentOnInk, margin: '0 0 22px' }}>SHOP INFO</p>
              <p style={{ fontSize: fs.lg, lineHeight: 1.7, margin: '0 0 22px', color: c.onNavyText2 }}>
                {contact.addressLines.map((l) => <span key={l}>{l}<br /></span>)}
                <span style={{ color: c.onNavyText }}>{contact.addressNote}</span>
              </p>
              {/* Opening hours, with today's line marked and a live open/closed
                  badge — the same block as the homepage and the footer, so the
                  hours are never phrased two different ways. */}
              <div style={{ borderTop: `1px solid ${c.navyLine}`, paddingTop: 22, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 10 }}>
                  <span style={{ fontFamily: fonts.mono, fontWeight: 500, fontSize: fs.xs, letterSpacing: '.16em', textTransform: 'uppercase', color: c.accentOnInk }}>Opening hours</span>
                  <OpenStatus tone="ink" />
                </div>
                <HoursTable tone="ink" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, borderTop: `1px solid ${c.navyLine}`, paddingTop: 22, fontSize: fs.md }}>
                {/* One block link per number, so each is a row-sized tap target
                    on a phone rather than the height of its own digits. */}
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
                  <span style={{ color: c.onNavyText, flex: 'none' }}>Phone</span>
                  <span style={{ fontFamily: fonts.mono, textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                    {contact.mobiles.map((m) => (
                      <a key={m.tel} href={`tel:${m.tel}`} style={{ padding: '4px 0', color: c.surface }}>{m.display}</a>
                    ))}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
                  <span style={{ color: c.onNavyText, flex: 'none' }}>Landline</span>
                  <span style={{ fontFamily: fonts.mono, textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                    {contact.landlines.map((l) => (
                      <a key={l.tel} href={`tel:${l.tel}`} style={{ padding: '4px 0', color: c.surface }}>{l.display}</a>
                    ))}
                  </span>
                </div>
                {/* Same shape as the two rows above: label pinned left and not
                    allowed to shrink, value right-aligned. These two were the
                    odd ones out — no `flex: none` on the label and no
                    `textAlign: right` on the value — so on a narrow card the
                    label gave way before the value did and the four rows
                    stopped lining up with each other. `break-word` on the
                    address only: it is the one value long enough to need it,
                    and it should break rather than overrun the card. */}
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <span style={{ color: c.onNavyText, flex: 'none' }}>Email</span>
                  <a href={`mailto:${contact.email}`} style={{ color: c.surface, textAlign: 'right', wordBreak: 'break-word' }}>{contact.email}</a>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <span style={{ color: c.onNavyText, flex: 'none' }}>Website</span>
                  <span style={{ textAlign: 'right' }}>{CONTACT.website}</span>
                </div>
              </div>
            </div>

            <a
              href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
              target="_blank"
              rel="noreferrer"
              style={{ background: c.mapBg, border: `1px solid ${c.mapBorder}`, borderRadius: 16, minHeight: 280, position: 'relative', overflow: 'hidden', display: 'block', textDecoration: 'none' }}
            >
              <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${c.gridOnLight} 1px,transparent 1px),linear-gradient(90deg,${c.gridOnLight} 1px,transparent 1px)`, backgroundSize: '48px 48px' }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <span style={{ width: 16, height: 16, borderRadius: '50%', background: c.orange, border: `3px solid ${c.surface}`, boxShadow: shadowCard }} />
                <span style={{ fontFamily: fonts.mono, fontWeight: 400, fontSize: fs.xs, lineHeight: 1.7, letterSpacing: '.14em', color: c.mapDot, textAlign: 'center' }}>
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
