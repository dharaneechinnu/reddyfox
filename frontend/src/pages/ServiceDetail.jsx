import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { SERVICES } from '../data';
import { c, fs, fonts, wrap, btnOnBrand, headerOffset } from '../tokens';
import useApi from '../hooks/useApi';
import { fetchFaqs } from '../api';
import { useCompanyInfo } from '../context/CompanyInfoContext';
import { useServiceRequest } from '../context/ServiceRequestContext';
import { formForService } from '../serviceForms';
import FaqAccordion from '../components/FaqAccordion';
import Seo from '../components/Seo';
import Reveal from '../components/Reveal';
import SitePhoto from '../components/SitePhoto';

const loadFaqs = () => fetchFaqs();

export default function ServiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: faqs } = useApi(loadFaqs, []);
  const { primaryPhone } = useCompanyInfo();
  const { open } = useServiceRequest();
  const active = SERVICES.find((s) => s.id === id) || SERVICES[0];

  useEffect(() => { window.scrollTo({ top: 0 }); }, [id]);

  return (
    <div>
      <Seo
        title={active.title}
        description={active.hero || active.short}
        path={`/services/${active.id}`}
      />
      <section style={{ background: c.page, padding: '60px 0 76px' }}>
        <div style={wrap}>
          <div style={{ fontFamily: fonts.mono, fontWeight: 400, fontSize: fs.sm, lineHeight: 1.4, color: c.pageMuted, marginBottom: 22 }}>
            <Link to="/" style={{ cursor: 'pointer', color: c.pageEyebrow }}>Home</Link> / <Link to="/services" style={{ cursor: 'pointer', color: c.pageEyebrow }}>Services</Link> / {active.title}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(340px,100%),1fr))', gap: 56, alignItems: 'center' }}>
            <div>
              <span style={{ display: 'inline-block', fontFamily: fonts.mono, fontWeight: 500, fontSize: fs.xs, lineHeight: 1.4, letterSpacing: '.16em', color: c.pageEyebrow, marginBottom: 18 }}>SERVICE {active.tag}</span>
              <h1 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: fs.h1, lineHeight: 1.06, color: c.pageHeading, margin: '0 0 18px' }}>{active.title}</h1>
              <p style={{ fontSize: fs.xl, lineHeight: 1.6, color: c.pageText, margin: '0 0 32px', maxWidth: 520 }}>{active.hero}</p>
              {/* Opens this service's own form over the page. It used to send
                  people to /contact with the service in the query string, so
                  someone reading about student fees landed on a generic form
                  asking for a currency and an amount — a trip away from the
                  page and a worse question at the end of it.

                  The label comes from the service's own form config, so it
                  names what it does ("Get a travel card") rather than reading
                  "Ask for a price" on all six. */}
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <span onClick={() => { if (!open(active.id)) navigate('/contact#form'); }} style={{ ...btnOnBrand, borderRadius: 9 }}>
                  {formForService(active.id)?.cta || 'Ask for a price'}
                </span>
                <a href={`tel:${primaryPhone.tel}`} style={{ border: `1px solid ${c.navyLineStrong}`, color: c.surface, padding: '15px 26px', borderRadius: 9, fontSize: fs.md, fontWeight: 600, cursor: 'pointer' }}>Call {primaryPhone.display}</a>
              </div>
            </div>
            <SitePhoto
              slot={`service_${active.id}`}
              placeholderLabel={<>PHOTOGRAPHY<br />{active.title}</>}
              style={{
                minHeight: 300,
                background: `repeating-linear-gradient(135deg,${c.navyLineFaint} 0 10px,${c.navyLine} 10px 20px)`,
                border: `1px solid ${c.navyLine}`,
              }}
            />
          </div>
        </div>
      </section>

      <nav
        aria-label="Services"
        style={{ background: c.cardBg, borderBottom: `1px solid ${c.sandLine2}`, position: 'sticky', top: headerOffset, zIndex: 40 }}
      >
        <div
          className="fx-service-nav-row"
          style={{
            ...wrap, padding: '0 32px', display: 'flex', flexWrap: 'nowrap',
            overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none',
          }}
        >
          {SERVICES.map((s) => {
            const isActive = s.id === active.id;
            return (
              <span
                key={s.id}
                className="fx-service-tab"
                onClick={() => navigate(`/services/${s.id}`)}
                style={{
                  flex: 'none', whiteSpace: 'nowrap', padding: '17px 18px', fontSize: fs.base, fontWeight: 600, cursor: 'pointer',
                  color: isActive ? c.navy : c.textMuted, borderBottom: `2px solid ${isActive ? c.orange : 'transparent'}`,
                  transition: 'color .18s, border-color .18s',
                }}
              >{s.title}</span>
            );
          })}
        </div>
      </nav>

      {/* Indigo ground, white cards — the cards are what read as raised (see
          theme.css). This section used to be white-on-white, so the cards had
          only their hairline to separate them from the page. */}
      <section style={{ background: c.page, padding: '88px 0' }}>
        <div style={wrap}>
          <p style={{ fontFamily: fonts.mono, fontWeight: 500, fontSize: fs.xs, lineHeight: 1.4, letterSpacing: '.18em', textTransform: 'uppercase', color: c.pageEyebrow, margin: '0 0 14px' }}>Benefits</p>
          <h2 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: fs.h2, lineHeight: 1.1, color: c.pageHeading, margin: '0 0 40px' }}>What you get</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(280px,100%),1fr))', gap: 20 }}>
            {active.benefits.map(([title, body, logoSlot], i) => (
              <Reveal key={title} delay={i * 0.07} className="fx-hover-lift" style={{ background: c.cardBg, border: `1px solid ${c.sandLine}`, borderRadius: 14, overflow: 'hidden', padding: logoSlot ? 0 : 28 }}>
                {logoSlot && (
                  <SitePhoto
                    slot={logoSlot}
                    placeholderLabel={title.toUpperCase()}
                    style={{ height: 160, border: 'none', borderRadius: 0 }}
                  />
                )}
                <div style={logoSlot ? { padding: 28 } : undefined}>
                  <h3 style={{ fontSize: fs.xl, fontWeight: 600, color: c.navy, margin: '0 0 10px' }}>{title}</h3>
                  <p style={{ fontSize: fs.base, lineHeight: 1.62, color: c.textMuted, margin: 0 }}>{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: c.page, padding: '88px 0' }}>
        <div style={wrap}>
          <p style={{ fontFamily: fonts.mono, fontWeight: 500, fontSize: fs.xs, lineHeight: 1.4, letterSpacing: '.18em', textTransform: 'uppercase', color: c.pageEyebrow, margin: '0 0 14px' }}>How it works</p>
          <h2 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: fs.h2, lineHeight: 1.1, color: c.pageHeading, margin: '0 0 44px' }}>Three steps, one visit</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(260px,100%),1fr))', gap: 24 }}>
            {active.process.map(([title, body], i) => (
              <Reveal key={title} delay={i * 0.08} style={{ borderTop: `2px solid ${c.pageEyebrow}`, paddingTop: 22 }}>
                <span style={{ fontFamily: fonts.mono, fontWeight: 500, fontSize: fs.xs, lineHeight: 1.4, letterSpacing: '.14em', color: c.pageEyebrow }}>{'0' + (i + 1)}</span>
                <h3 style={{ fontSize: fs['2xl'], fontWeight: 600, color: c.pageHeading, margin: '14px 0 9px' }}>{title}</h3>
                <p style={{ fontSize: fs.base, lineHeight: 1.62, color: c.pageText, margin: 0 }}>{body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {faqs.length > 0 && (
        <section style={{ background: c.page, padding: '88px 0' }}>
          <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 32px' }}>
            <h2 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: fs.h2, lineHeight: 1.1, color: c.pageHeading, margin: '0 0 36px', textAlign: 'center' }}>Common questions</h2>
            <FaqAccordion faqs={faqs} />
          </div>
        </section>
      )}

      <section style={{ background: c.page, padding: '72px 0' }}>
        <div style={{ ...wrap, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
          <h2 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: fs.h3, lineHeight: 1.12, color: c.pageHeading, margin: 0, maxWidth: 620 }}>Have a question about {active.title}?</h2>
          <span onClick={() => navigate('/contact#form')} style={{ ...btnOnBrand, padding: '16px 28px', borderRadius: 9 }}>Ask us now</span>
        </div>
      </section>
    </div>
  );
}
