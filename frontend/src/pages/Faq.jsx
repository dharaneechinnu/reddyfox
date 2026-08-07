import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { c, fs, fonts, wrap } from '../tokens';
import useApi from '../hooks/useApi';
import { fetchFaqs, fetchFaqCategories } from '../api';
import FaqAccordion from '../components/FaqAccordion';
import Seo from '../components/Seo';

const loadFaqs = () => fetchFaqs();
const loadCategories = () => fetchFaqCategories();

export default function Faq() {
  const navigate = useNavigate();
  const [activeCat, setActiveCat] = useState(null);
  const { data: faqs, loading, error } = useApi(loadFaqs, []);
  const { data: categories } = useApi(loadCategories, []);

  // Only offer categories that actually have visible questions behind them.
  const usedCategories = useMemo(() => {
    const names = new Set(faqs.map((f) => f.category).filter(Boolean));
    return categories.filter((cat) => names.has(cat.name));
  }, [faqs, categories]);

  const visible = activeCat ? faqs.filter((f) => f.category === activeCat) : faqs;

  // FAQPage structured data — the single highest-value schema for this
  // feature: both Google's rich results and AI answer engines (ChatGPT,
  // Claude, Perplexity) parse this exact question/answer shape to quote a
  // source directly, rather than needing to summarise unstructured prose.
  const faqJsonLd = useMemo(() => {
    if (!faqs.length) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    };
  }, [faqs]);

  const catStyle = (isActive) => ({
    padding: '11px 15px',
    borderRadius: 9,
    fontSize: fs.base,
    fontWeight: 500,
    color: isActive ? c.orange : c.onNavyText,
    background: isActive ? c.surface : 'transparent',
    cursor: 'pointer',
    transition: 'background .18s',
  });

  return (
    <div>
      <Seo
        title="FAQs"
        description="Documents, cash limits, timings and buy-back — answered plainly by Reddy Forex, the RBI-authorised money changer in T. Nagar, Chennai."
        path="/faq"
        jsonLd={faqJsonLd}
        jsonLdId="faq"
      />
      <section style={{ background: c.page, padding: '60px 0 72px' }}>
        <div style={wrap}>
          <div style={{ fontFamily: fonts.mono, fontWeight: 400, fontSize: fs.sm, lineHeight: 1.4, color: c.navyMuted, marginBottom: 22 }}>
            <Link to="/" style={{ cursor: 'pointer', color: c.onNavyText }}>Home</Link> / FAQ
          </div>
          <h1 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: fs.h1, lineHeight: 1.05, color: c.surface, margin: '0 0 14px' }}>Frequently asked questions</h1>
          <p style={{ fontSize: fs.lg, lineHeight: 1.6, color: c.onNavyText, margin: 0, maxWidth: 560 }}>Documents, limits, timings and buy-back — answered plainly.</p>
        </div>
      </section>
      <section style={{ background: c.page, padding: '64px 0 96px' }}>
        <div className="fx-faq-grid" style={{ ...wrap, display: 'grid', gridTemplateColumns: 'minmax(220px,260px) 1fr', gap: 40, alignItems: 'start' }}>
          <div className="fx-faq-rail" style={{ position: 'sticky', top: 100, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span
              onClick={() => setActiveCat(null)}
              style={catStyle(activeCat === null)}
              onMouseEnter={(e) => { if (activeCat !== null) e.currentTarget.style.background = 'rgba(255,255,255,.08)'; }}
              onMouseLeave={(e) => { if (activeCat !== null) e.currentTarget.style.background = 'transparent'; }}
            >
              All questions
            </span>
            {usedCategories.map((cat) => (
              <span
                key={cat.id}
                onClick={() => setActiveCat(cat.name)}
                style={catStyle(activeCat === cat.name)}
                onMouseEnter={(e) => { if (activeCat !== cat.name) e.currentTarget.style.background = 'rgba(255,255,255,.08)'; }}
                onMouseLeave={(e) => { if (activeCat !== cat.name) e.currentTarget.style.background = 'transparent'; }}
              >
                {cat.name}
              </span>
            ))}
          </div>

          <div>
            {loading && (
              <div style={{ background: c.surface, border: `1px solid ${c.sandLine}`, borderRadius: 14, padding: 40, textAlign: 'center', color: c.textMuted }}>
                Loading questions…
              </div>
            )}
            {error && (
              <div style={{ background: c.surface, border: `1px solid ${c.redBorder}`, borderRadius: 14, padding: 40, textAlign: 'center', color: c.redText }}>
                Couldn't load the questions: {error}
              </div>
            )}
            {!loading && !error && (
              <>
                {/* key forces the accordion to reset its open row when the filter changes */}
                <FaqAccordion
                  key={activeCat || 'all'}
                  faqs={visible}
                  padding="24px 30px"
                  answerPadding="0 30px 26px"
                />
                <div style={{ background: c.cream, border: `1px solid ${c.sandLine}`, borderTop: 'none', borderRadius: '0 0 14px 14px', padding: 30, display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: fs.md, color: c.text }}>Still unanswered? The branch team replies within an hour.</span>
                  <span onClick={() => navigate('/contact')} style={{ background: c.orange, color: c.surface, padding: '13px 22px', borderRadius: 9, fontSize: fs.base, fontWeight: 600, cursor: 'pointer' }}>Contact us</span>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
