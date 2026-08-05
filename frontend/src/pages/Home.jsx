import { useNavigate } from 'react-router-dom';
import { useFx } from '../context/FxContext';
import { useFeatureFlag } from '../context/FeatureFlagsContext';
import { STATS, SERVICES, REASONS, fmt } from '../data';
import { c, fs, fonts, wrap, sectionY, stamp, card, btnOnBrand, btnGhost } from '../tokens';
import FaqAccordion from '../components/FaqAccordion';
import CallbackBar from '../components/CallbackBar';
import Seo from '../components/Seo';
import SitePhoto from '../components/SitePhoto';
import SectionHead from '../components/SectionHead';
import HowItWorks from '../components/HowItWorks';
import HeroPhones from '../components/HeroPhones';
import VisitCounter from '../components/VisitCounter';
import OpenStatus from '../components/OpenStatus';
import useApi from '../hooks/useApi';
import { fetchTestimonials, fetchFaqs, fetchCurrencies, toRatesMap } from '../api';
import { useCompanyInfo } from '../context/CompanyInfoContext';

const LIVE_BOARD_GRID = '2fr 1fr 1fr 1fr 1fr 1fr';

// Module-scope so useApi doesn't refetch on every render.
const loadTestimonials = () => fetchTestimonials();
const loadHomepageFaqs = () => fetchFaqs({ homepageOnly: true });
const loadForexCardRates = () => fetchCurrencies('forex_card').then(toRatesMap);

// The static FinancialService/LocalBusiness JSON-LD lives in index.html, not
// here — this is a single-page app, so that tag stays in the DOM across every
// client-side route change and never needs to be (re)written per page. Adding
// another copy here would just duplicate it.

function RateCcBadge({ cc }) {
  return (
    <span style={{ width: 34, height: 24, borderRadius: 4, background: c.sandCard2, border: `1px solid ${c.sandBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.mono, fontWeight: 500, fontSize: fs['2xs'], lineHeight: 1.4, color: c.textMuted }}>{cc}</span>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const fx = useFx();
  const liveBoardOn = useFeatureFlag('live_board');
  const { contact, hours } = useCompanyInfo();
  const { data: testimonials } = useApi(loadTestimonials, []);
  const { data: faqs } = useApi(loadHomepageFaqs, []);
  const { data: forexCardRates } = useApi(loadForexCardRates, {});

  const extra = ['CHF', 'MYR', 'THB', 'CNY'].filter((code) => fx.rates[code]);
  const tickerCodes = fx.popular.concat(extra).concat(fx.popular);

  if (fx.ratesLoading) {
    return <div style={{ padding: '120px 32px', textAlign: 'center', color: c.textMuted }}>Loading live rates…</div>;
  }
  if (fx.ratesError) {
    return <div style={{ padding: '120px 32px', textAlign: 'center', color: c.redText }}>Couldn't reach the rates service: {fx.ratesError}</div>;
  }

  return (
    <div>
      <Seo
        title="Foreign Currency Exchange in Chennai"
        description="RBI-authorised money changer in T. Nagar, Chennai since 2000. Buy and sell foreign currency, Western Union money transfer, forex cards and outward remittance at competitive rates. Open Monday to Saturday."
        path="/"
      />

      {/* ---- Hero -----------------------------------------------------------
          One indigo field running up into the header, with the pitch on the left
          and a fan of three phones on the right. The phones are marketing, not
          inputs — nothing is priced or bought on this site, every deal is agreed
          on a call with a dealer, so they carry what we offer rather than any
          figure (see HeroPhones.jsx). The form lives in the bar pinned to the
          bottom of the window instead, where it stays reachable at any scroll
          position. */}
      <section style={{ background: c.orange, position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden="true" style={{ position: 'absolute', top: -220, right: -180, width: 700, height: 700, borderRadius: '50%', background: `radial-gradient(circle, color-mix(in srgb, ${c.accent} 26%, transparent), transparent 64%)` }} />

        <div className="fx-hero-grid" style={{ position: 'relative', ...wrap, padding: 'clamp(48px,6vw,88px) clamp(16px,4.5vw,32px) clamp(44px,5vw,72px)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(32px,4vw,56px)', alignItems: 'center' }}>
          <div>
            <div className="fx-rise" style={{ ...stamp, color: c.accent, marginBottom: 26 }}>
              T. Nagar, Chennai <span aria-hidden="true" style={{ opacity: .5 }}>·</span> One counter, no branches
            </div>

            <h1 className="fx-rise" style={{ '--fx-delay': '.06s', fontFamily: fonts.serif, fontWeight: 400, fontSize: fs.hero, lineHeight: 1.04, letterSpacing: '-.02em', color: c.surface, margin: '0 0 24px' }}>
              Foreign currency,
              <br />
              handed over
              <br />
              in person.
            </h1>

            <p className="fx-rise" style={{ '--fx-delay': '.12s', fontSize: fs.xl, lineHeight: 1.6, color: c.onNavyText, maxWidth: 470, margin: '0 0 32px' }}>
              Ask for the rate on the phone. Collect at the counter or take same-day home delivery.
              Nothing is charged before you agree the number.
            </p>

            <div className="fx-rise" style={{ '--fx-delay': '.18s', display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
              <a href={`tel:${contact.mobiles[0]?.tel}`} style={btnOnBrand}>
                Call {contact.mobiles[0]?.display}
              </a>
              <span onClick={() => navigate('/services')} style={btnGhost(true)}>
                What we do
              </span>
            </div>

            {/* The live badge, which the rail above deliberately doesn't carry. */}
            <div className="fx-rise" style={{ '--fx-delay': '.24s', borderTop: `1px solid ${c.navyLine}`, paddingTop: 20, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <OpenStatus tone="ink" />
              <span aria-hidden="true" style={{ width: 1, height: 12, background: c.navyLine }} />
              <span style={{ fontSize: fs.sm, color: c.navyMuted2 }}>
                {hours.weekday.labelShort} {hours.weekday.display} · {hours.sunday.labelShort} {hours.sunday.display.toLowerCase()}
              </span>
            </div>
          </div>

          <div className="fx-rise" style={{ '--fx-delay': '.2s' }}>
            <HeroPhones />
          </div>
        </div>

        {/* The form closes the first screen, with the ticker running under it. */}
        <CallbackBar />

        {/* Live figures, moving — the board's own detail, not a decoration. */}
        <div style={{ position: 'relative', borderTop: `1px solid ${c.navyLine}`, background: 'rgba(0,0,0,.24)', overflow: 'hidden' }}>
          <div className="fx-ticker-track" style={{ display: 'flex', width: 'max-content' }}>
            {tickerCodes.map((code, i) => {
              const r = fx.rates[code];
              return (
                <div key={code + i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 26px', borderRight: `1px solid ${c.navyLine}`, whiteSpace: 'nowrap' }}>
                  <span style={{ fontFamily: fonts.mono, fontWeight: 500, fontSize: fs.xs, lineHeight: 1.4, letterSpacing: '.1em', color: c.surface }}>{code}/INR</span>
                  <span style={{ fontFamily: fonts.mono, fontSize: fs.xs, color: c.onNavyText }}>{fmt(r.s, r.s < 5 ? 3 : 2)}</span>
                  <span style={{ fontFamily: fonts.mono, fontSize: fs.xs, color: r.d >= 0 ? c.greenLight : c.redLight }}>{(r.d >= 0 ? '+' : '') + r.d.toFixed(2) + '%'}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Clear ink below the ticker for the facts strip to overlap into, so
            the strip breaks the panel's edge without covering live figures. */}
        <div aria-hidden="true" style={{ height: 'clamp(30px,4vw,58px)' }} />
      </section>

      {/* ---- The four facts, overlapping the board's edge ------------------ */}
      <section style={{ background: c.sand }}>
        <div style={{ ...wrap, position: 'relative' }}>
          <div className="fx-stat-strip" style={{ background: c.surface, border: `1px solid ${c.sandLine}`, borderRadius: 10, marginTop: 'clamp(-52px,-4vw,-28px)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(220px,100%),1fr))' }}>
            {STATS.map((s, i) => (
              <div key={s.label} style={{ padding: 'clamp(22px,2.4vw,30px)', borderLeft: i === 0 ? 'none' : `1px solid ${c.sandLine3}` }}>
                <div style={{ fontFamily: fonts.mono, fontSize: fs['3xl'], lineHeight: 1, color: c.navy, marginBottom: 12 }}>{s.value}</div>
                <div style={{ fontSize: fs.base, fontWeight: 600, color: c.navyMid, marginBottom: 5 }}>{s.label}</div>
                <div style={{ fontSize: fs.sm, lineHeight: 1.55, color: c.textFaint }}>{s.note}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Breathing room under the strip; the process gets its own band. */}
        <div aria-hidden="true" style={{ height: 'clamp(40px,5vw,72px)' }} />
      </section>

      <HowItWorks />

      {liveBoardOn && (
        <section style={{ background: c.sand, ...sectionY, borderTop: `1px solid ${c.sandLine}` }}>
          <div style={wrap}>
            <SectionHead
              label="Live board"
              title="Today’s counter rates"
              aside={<span onClick={() => navigate('/rates')} style={{ fontSize: fs.md, fontWeight: 600, color: c.navy, borderBottom: `1px solid ${c.orange}`, paddingBottom: 3, cursor: 'pointer' }}>See every currency we hold</span>}
            />
            <div style={{ ...card, overflow: 'auto' }}>
              <div style={{ minWidth: 640 }}>
                <div style={{ display: 'grid', gridTemplateColumns: LIVE_BOARD_GRID, gap: 16, padding: '10px 26px 0', background: c.navy, fontFamily: fonts.mono, fontWeight: 500, fontSize: fs['2xs'], lineHeight: 1.4, letterSpacing: '.1em', color: c.navyMuted2 }}>
                  <span />
                  <span style={{ gridColumn: 'span 2', textAlign: 'center', borderBottom: `1px solid ${c.navyLine}`, paddingBottom: 6 }}>WE BUY</span>
                  <span style={{ gridColumn: 'span 2', textAlign: 'center', borderBottom: `1px solid ${c.navyLine}`, paddingBottom: 6 }}>WE SELL</span>
                  <span />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: LIVE_BOARD_GRID, gap: 16, padding: '8px 26px 16px', background: c.navy, fontFamily: fonts.mono, fontWeight: 500, fontSize: fs.xs, lineHeight: 1.4, letterSpacing: '.14em', color: c.navyMuted2 }}>
                  <span>CURRENCY</span>
                  <span style={{ textAlign: 'right' }}>FOREX CARD</span><span style={{ textAlign: 'right' }}>CURRENCY</span>
                  <span style={{ textAlign: 'right' }}>FOREX CARD</span><span style={{ textAlign: 'right' }}>CURRENCY</span>
                  <span style={{ textAlign: 'right' }}>24H</span>
                </div>
                {fx.popular.slice(0, 6).map((code) => {
                  const r = fx.rates[code];
                  const fc = forexCardRates ? forexCardRates[code] : undefined;
                  return (
                    <div key={code} style={{ display: 'grid', gridTemplateColumns: LIVE_BOARD_GRID, gap: 16, padding: '18px 26px', borderBottom: `1px solid ${c.sandLine3}`, alignItems: 'center' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = c.cream)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <RateCcBadge cc={r.cc} />
                        <div>
                          <span style={{ fontSize: fs.md, fontWeight: 600, color: c.navy }}>{code}</span>
                          <span style={{ fontSize: fs.sm, color: c.textFaint, marginLeft: 9 }}>{r.n}</span>
                        </div>
                      </div>
                      <span style={{ textAlign: 'right', fontFamily: fonts.mono, fontSize: fs.md, color: fc ? c.navy : c.textFainter }}>{fc ? fmt(fc.b, fc.b < 5 ? 3 : 2) : '—'}</span>
                      <span style={{ textAlign: 'right', fontFamily: fonts.mono, fontSize: fs.md, color: c.navy }}>{fmt(r.b, r.b < 5 ? 3 : 2)}</span>
                      <span style={{ textAlign: 'right', fontFamily: fonts.mono, fontSize: fs.md, color: fc ? c.navy : c.textFainter }}>{fc ? fmt(fc.s, fc.s < 5 ? 3 : 2) : '—'}</span>
                      <span style={{ textAlign: 'right', fontFamily: fonts.mono, fontSize: fs.md, color: c.navy }}>{fmt(r.s, r.s < 5 ? 3 : 2)}</span>
                      <span style={{ textAlign: 'right', fontFamily: fonts.mono, fontSize: fs.base, color: r.d >= 0 ? c.green : c.red }}>{(r.d >= 0 ? '+' : '') + r.d.toFixed(2) + '%'}</span>
                    </div>
                  );
                })}
                <div style={{ padding: '15px 26px', fontSize: fs.sm, color: c.textFainter, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <span>Rates per 1 unit of foreign currency in INR.</span>
                  <span style={{ fontFamily: fonts.mono }}>Last updated {fx.ratesUpdatedAt}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ---- Services: one lead card, then the rest ------------------------
          The mosaic is uneven on purpose. Foreign exchange is the bulk of what
          crosses the counter, so it gets the room; the others are equals below
          it rather than six identical tiles pretending otherwise. */}
      {/* A hairline between neighbouring sections of the same colour: with the
          live board switched off, "how it works" and "what we do" would
          otherwise run together into one long field of sand. */}
      <section style={{ background: c.sand, ...sectionY, borderTop: `1px solid ${c.sandLine}` }}>
        <div style={wrap}>
          <SectionHead
            label="What we do"
            title="Every foreign exchange need, under one licence"
            aside="From a ₹5,000 holiday buy to an import settlement — handled by the same compliance team."
          />
          <div className="fx-service-mosaic" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            {SERVICES.map((s, i) => (
              <div
                key={s.id}
                onClick={() => navigate(`/services/${s.id}`)}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/services/${s.id}`); }}
                role="link"
                tabIndex={0}
                style={{
                  ...card,
                  cursor: 'pointer',
                  // The lead card takes two columns and two rows, which leaves
                  // exactly enough cells for the other five to fill the grid
                  // with no orphan tile in the last row.
                  gridColumn: i === 0 ? 'span 2' : 'span 1',
                  gridRow: i === 0 ? 'span 2' : 'span 1',
                  display: 'flex',
                  flexDirection: i === 0 ? 'row' : 'column',
                }}
              >
                <SitePhoto
                  slot={`service_${s.id}`}
                  placeholderLabel={s.title.toUpperCase()}
                  style={i === 0
                    ? { flex: '0 0 44%', minHeight: 240, border: 'none', borderRadius: 0 }
                    : { height: 148, border: 'none', borderRadius: 0 }}
                />
                <div style={{ padding: 'clamp(20px,2.2vw,28px)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ ...stamp, color: c.orange, marginBottom: 12 }}>{s.tag}</div>
                  <h3 style={{ fontSize: i === 0 ? fs.h3 : fs.xl, fontFamily: i === 0 ? fonts.serif : fonts.sans, fontWeight: i === 0 ? 400 : 600, lineHeight: 1.15, color: c.navy, margin: '0 0 10px' }}>{s.title}</h3>
                  <p style={{ fontSize: i === 0 ? fs.md : fs.base, lineHeight: 1.62, color: c.textMuted, margin: '0 0 16px' }}>{i === 0 ? s.body : s.short}</p>

                  {/* The lead card has the room to say what is actually on offer,
                      so it lists the service's own headings rather than padding
                      the space out with more prose. */}
                  {i === 0 && (
                    <ul style={{ listStyle: 'none', margin: '0 0 20px', padding: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
                      {s.benefits.slice(0, 4).map(([benefit]) => (
                        <li key={benefit} style={{ display: 'flex', gap: 10, alignItems: 'baseline', fontSize: fs.base, color: c.navyMid }}>
                          <span aria-hidden="true" style={{ color: c.orange, flex: 'none' }}>—</span>
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  )}

                  <span style={{ fontSize: fs.base, fontWeight: 600, color: c.orange }}>Learn more →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <VisitCounter />

      {/* ---- Why us -------------------------------------------------------- */}
      <section style={{ background: c.sand, ...sectionY }}>
        <div className="fx-why-grid" style={{ ...wrap, display: 'grid', gridTemplateColumns: '.9fr 1.1fr', gap: 'clamp(32px,5vw,64px)', alignItems: 'center' }}>
          <SitePhoto
            slot="home_why_us"
            placeholderLabel={<>PHOTOGRAPHY<br />Counter service, T. Nagar shop</>}
            style={{ minHeight: 440, borderRadius: 10 }}
          />
          <div>
            <SectionHead label="Why us" title="The margin you see is the margin you pay" maxWidth={480} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {REASONS.map((f) => (
                <div key={f.n} style={{ display: 'flex', gap: 18, padding: '20px 0', borderTop: `1px solid ${c.sandLine}` }}>
                  <span style={{ fontFamily: fonts.mono, fontSize: fs.xs, letterSpacing: '.14em', color: c.orange, flex: 'none', paddingTop: 5 }}>{f.n}</span>
                  <div>
                    <h3 style={{ fontSize: fs.xl, fontWeight: 600, color: c.navy, margin: '0 0 7px' }}>{f.title}</h3>
                    <p style={{ fontSize: fs.base, lineHeight: 1.62, color: c.textMuted, margin: 0 }}>{f.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {testimonials.length > 0 && (
        <section style={{ background: c.sand, ...sectionY, borderTop: `1px solid ${c.sandLine}` }}>
          <div style={wrap}>
            <SectionHead label="Customer voices" title="Trusted by travellers and finance teams" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(300px,100%),1fr))', gap: 16 }}>
              {testimonials.map((t) => (
                <div key={t.id} style={{ ...card, background: c.sand, padding: 'clamp(24px,2.6vw,30px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <p style={{ fontFamily: fonts.serif, fontSize: fs['2xl'], lineHeight: 1.42, color: c.ink, margin: '0 0 24px' }}>“{t.quote}”</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 13, borderTop: `1px solid ${c.sandLine}`, paddingTop: 18 }}>
                    <span style={{ width: 38, height: 38, borderRadius: '50%', background: c.sandCard2, border: `1px solid ${c.sandBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.mono, fontWeight: 500, fontSize: fs.xs, lineHeight: 1.4, color: c.textMuted }}>{t.initials}</span>
                    <div>
                      <div style={{ fontSize: fs.base, fontWeight: 600, color: c.navy }}>{t.name}</div>
                      <div style={{ fontSize: fs.sm, color: c.textFaint }}>{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {faqs.length > 0 && (
        <section style={{ background: c.sand, ...sectionY }}>
          <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 clamp(16px,4.5vw,32px)' }}>
            <SectionHead label="Questions" title="Before you walk in" align="center" />
            <FaqAccordion faqs={faqs} />
          </div>
        </section>
      )}

      {/* ---- Last word -----------------------------------------------------
          Cream, not a dark band: the hero is this page's one dark panel. The
          indigo buttons carry the weight here instead of the background. */}
      <section style={{ background: c.sand, borderTop: `1px solid ${c.sandLine}`, padding: 'clamp(52px,6vw,80px) 0' }}>
        <div style={{ ...wrap, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'clamp(28px,4vw,48px)', flexWrap: 'wrap' }}>
          <div>
            <div style={{ ...stamp, color: c.orange, marginBottom: 14 }}>Talk to a dealer</div>
            <h2 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: fs.h2, lineHeight: 1.08, letterSpacing: '-.015em', color: c.navy, margin: '0 0 12px' }}>Call us for today’s rate</h2>
            <p style={{ fontSize: fs.xl, lineHeight: 1.6, color: c.textMuted, margin: 0, maxWidth: 540 }}>
              Tell us the currency and the amount, and we’ll quote you. Or walk in — Challa Mall, T. Nagar, {contact.addressNote.replace(/[()]/g, '')}.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            {contact.mobiles.slice(0, 2).map((m) => (
              <a
                key={m.tel}
                href={`tel:${m.tel}`}
                style={{ background: c.orange, color: c.surface, padding: '15px 26px', borderRadius: 8, fontSize: fs.md, fontWeight: 600, fontFamily: fonts.mono, whiteSpace: 'nowrap', transition: 'background .18s ease' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = c.orangeDark)}
                onMouseLeave={(e) => (e.currentTarget.style.background = c.orange)}
              >
                {m.display}
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
