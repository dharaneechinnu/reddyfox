import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { SERVICES } from '../data';
import { c, fonts, wrap } from '../tokens';
import useApi from '../hooks/useApi';
import { fetchFaqs } from '../api';
import FaqAccordion from '../components/FaqAccordion';

const loadFaqs = () => fetchFaqs();

export default function ServiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: faqs } = useApi(loadFaqs, []);
  const active = SERVICES.find((s) => s.id === id) || SERVICES[0];

  useEffect(() => { window.scrollTo({ top: 0 }); }, [id]);

  return (
    <div>
      <section style={{ background: c.navy, padding: '60px 0 76px' }}>
        <div style={wrap}>
          <div style={{ font: `400 12.5px/1.4 ${fonts.mono}`, color: c.navyMuted, marginBottom: 22 }}>
            <Link to="/" style={{ cursor: 'pointer', color: c.onNavyText }}>Home</Link> / <Link to="/services" style={{ cursor: 'pointer', color: c.onNavyText }}>Services</Link> / {active.title}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 56, alignItems: 'center' }}>
            <div>
              <span style={{ display: 'inline-block', font: `500 11px/1.4 ${fonts.mono}`, letterSpacing: '.16em', color: c.accent, marginBottom: 18 }}>SERVICE {active.tag}</span>
              <h1 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: 'clamp(34px,4vw,54px)', lineHeight: 1.06, color: '#fff', margin: '0 0 18px' }}>{active.title}</h1>
              <p style={{ fontSize: 18, lineHeight: 1.6, color: c.onNavyText, margin: '0 0 32px', maxWidth: 520 }}>{active.hero}</p>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <span onClick={() => navigate('/contact')} style={{ background: c.orange, color: '#fff', padding: '15px 26px', borderRadius: 9, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Request a quote</span>
                <span onClick={() => navigate('/rates')} style={{ border: '1px solid rgba(255,255,255,.26)', color: '#fff', padding: '15px 26px', borderRadius: 9, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>See today's rates</span>
              </div>
            </div>
            <div style={{ background: 'repeating-linear-gradient(135deg,rgba(255,255,255,.07) 0 10px,rgba(255,255,255,.03) 10px 20px)', border: '1px solid rgba(255,255,255,.14)', borderRadius: 16, minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ font: `400 11px/1.7 ${fonts.mono}`, letterSpacing: '.14em', color: c.navyMuted, textAlign: 'center' }}>PHOTOGRAPHY<br />{active.title}</span>
            </div>
          </div>
        </div>
      </section>

      <div style={{ background: '#fff', borderBottom: `1px solid ${c.sandLine2}`, position: 'sticky', top: 73, zIndex: 40 }}>
        <div style={{ ...wrap, padding: '14px 32px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SERVICES.map((s) => (
            <span
              key={s.id}
              onClick={() => navigate(`/services/${s.id}`)}
              style={{
                padding: '9px 15px', borderRadius: 100, border: `1px solid ${c.sandBorder3}`, fontSize: 13.5, fontWeight: 500, cursor: 'pointer',
                background: s.id === active.id ? c.navy : '#fff', color: s.id === active.id ? '#fff' : c.text, transition: 'all .18s',
              }}
            >{s.title}</span>
          ))}
        </div>
      </div>

      <section style={{ background: '#fff', padding: '88px 0' }}>
        <div style={wrap}>
          <p style={{ font: `500 11.5px/1.4 ${fonts.mono}`, letterSpacing: '.18em', textTransform: 'uppercase', color: c.orange, margin: '0 0 14px' }}>Benefits</p>
          <h2 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: 'clamp(30px,3.2vw,44px)', lineHeight: 1.1, color: c.navy, margin: '0 0 40px' }}>What you get</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20 }}>
            {active.benefits.map(([title, body]) => (
              <div key={title} style={{ border: `1px solid ${c.sandLine}`, borderRadius: 14, padding: 28 }}>
                <h3 style={{ fontSize: 17.5, fontWeight: 600, color: c.navy, margin: '0 0 10px' }}>{title}</h3>
                <p style={{ fontSize: 14.8, lineHeight: 1.62, color: c.textMuted, margin: 0 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: c.sand, padding: '88px 0' }}>
        <div style={wrap}>
          <p style={{ font: `500 11.5px/1.4 ${fonts.mono}`, letterSpacing: '.18em', textTransform: 'uppercase', color: c.orange, margin: '0 0 14px' }}>How it works</p>
          <h2 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: 'clamp(30px,3.2vw,44px)', lineHeight: 1.1, color: c.navy, margin: '0 0 44px' }}>Three steps, one visit</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 24 }}>
            {active.process.map(([title, body], i) => (
              <div key={title} style={{ borderTop: `2px solid ${c.navy}`, paddingTop: 22 }}>
                <span style={{ font: `500 11.5px/1.4 ${fonts.mono}`, letterSpacing: '.14em', color: c.orange }}>{'0' + (i + 1)}</span>
                <h3 style={{ fontSize: 19, fontWeight: 600, color: c.navy, margin: '14px 0 9px' }}>{title}</h3>
                <p style={{ fontSize: 14.8, lineHeight: 1.62, color: c.textMuted, margin: 0 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {faqs.length > 0 && (
        <section style={{ background: '#fff', padding: '88px 0' }}>
          <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 32px' }}>
            <h2 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: 'clamp(30px,3.2vw,44px)', lineHeight: 1.1, color: c.navy, margin: '0 0 36px', textAlign: 'center' }}>Common questions</h2>
            <FaqAccordion faqs={faqs} />
          </div>
        </section>
      )}

      <section style={{ background: c.orange, padding: '72px 0' }}>
        <div style={{ ...wrap, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
          <h2 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: 'clamp(28px,3vw,40px)', lineHeight: 1.12, color: '#fff', margin: 0, maxWidth: 620 }}>Speak to a dealer about {active.title}</h2>
          <span onClick={() => navigate('/contact')} style={{ background: c.navy, color: '#fff', padding: '16px 28px', borderRadius: 9, fontSize: 15.5, fontWeight: 600, cursor: 'pointer' }}>Start an enquiry</span>
        </div>
      </section>
    </div>
  );
}
