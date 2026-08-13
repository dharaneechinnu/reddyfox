import { useNavigate } from 'react-router-dom';
import { useFx } from '../context/FxContext';
import { useFeatureFlag } from '../context/FeatureFlagsContext';
import { STATS, REASONS, fmt } from '../data';
import { COMPANY } from '../company';
import { c, fs, fonts, wrap, sectionY, stamp, card, btnOnBrand, btnGhost, shadowCard, shadowFloat } from '../tokens';
import FaqAccordion from '../components/FaqAccordion';
import CallbackBar from '../components/CallbackBar';
import Seo from '../components/Seo';
import SitePhoto from '../components/SitePhoto';
import SectionHead from '../components/SectionHead';
import HeroSteps, { STEP_ONE_ID } from '../components/HeroSteps';
import WhatWeDoActions from '../components/WhatWeDoActions';
import Reveal from '../components/Reveal';
import WorldMapBackdrop from '../components/WorldMapBackdrop';
import VisitCounter from '../components/VisitCounter';
import OpenStatus from '../components/OpenStatus';
import useApi from '../hooks/useApi';
import useMarqueeHover from '../hooks/useMarqueeHover';
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
    <span style={{ width: 34, height: 24, borderRadius: 4, background: c.sandCard2, border: `1px solid ${c.sandBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.mono, fontWeight: 500, fontSize: fs['2xs'], lineHeight: 1.4, color: c.navy }}>{cc}</span>
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
  const ticker = useMarqueeHover({ selector: '.fx-ticker-track' });

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
          One indigo field running up into the header, with the dotted world map
          as the whole visual and the pitch reading across it. It is marketing,
          not an input — nothing is priced or bought on this site, every deal is
          agreed on a call with a dealer, so it carries what we offer rather
          than any figure. The form lives in the bar under the hero instead,
          where it stays reachable at any scroll position, and the three steps
          have their own panel further down. */}
      <section style={{ background: c.page, position: 'relative', overflow: 'hidden' }}>
        {/* The pitch block, with the world dotted behind it — foreign currency
            is what this counter sells, so the ground it sits on says so. The
            backdrop is scoped to this block rather than the whole section: the
            form bar and the ticker below have their own dark fills, and a map
            centred behind all three would sit half-hidden under them. */}
        <div style={{ position: 'relative' }}>
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <WorldMapBackdrop color={c.surface} opacity={.13} style={{ width: '116%', height: '92%' }} />
          </div>
          <div aria-hidden="true" style={{ position: 'absolute', top: -220, right: -180, width: 700, height: 700, borderRadius: '50%', background: `radial-gradient(circle, color-mix(in srgb, ${c.accent} 26%, transparent), transparent 64%)` }} />

          {/* Pitch left, the three steps in a row on the right. `alignItems:
              stretch` is what makes the two ends line up: the taller side sets
              the height, the pitch spreads to fill it and the step cards grow
              to match rather than floating in a half-empty cell. */}
          <div className="fx-hero-grid" style={{ position: 'relative', ...wrap, padding: 'clamp(48px,6vw,88px) clamp(16px,4.5vw,32px) clamp(44px,5vw,72px)', display: 'grid', gridTemplateColumns: '.82fr 1.18fr', gap: 'clamp(28px,3.4vw,48px)', alignItems: 'center' }}>
            <div>
              <div className="fx-rise" style={{ ...stamp, color: c.pageEyebrow, marginBottom: 26 }}>
                T. Nagar, Chennai <span aria-hidden="true" style={{ opacity: .5 }}>·</span> One counter, no branches
              </div>

              <h1 className="fx-rise" style={{ '--fx-delay': '.06s', fontFamily: fonts.serif, fontWeight: 400, fontSize: fs.hero, lineHeight: 1.04, letterSpacing: '-.02em', color: c.pageHeading, margin: '0 0 24px' }}>
                Foreign currency,
                <br />
                handed over
                <br />
                in person.
              </h1>

              <p className="fx-rise" style={{ '--fx-delay': '.12s', fontSize: fs.xl, lineHeight: 1.6, color: c.pageText, maxWidth: 520, margin: '0 0 32px' }}>
                Ask us the rate on the phone. Pick it up at the shop, or we bring it to your home
                the same day. You pay nothing until you agree the rate.
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
              <div className="fx-rise" style={{ '--fx-delay': '.24s', borderTop: `1px solid ${c.pageLine}`, paddingTop: 20, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <OpenStatus tone="ink" />
                <span aria-hidden="true" style={{ width: 1, height: 12, background: c.pageLine }} />
                <span style={{ fontSize: fs.sm, color: c.pageMuted }}>
                  {hours.weekday.labelShort} {hours.weekday.display} · {hours.sunday.labelShort} {hours.sunday.display.toLowerCase()}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex' }}>
              <HeroSteps />
            </div>
          </div>
        </div>

        {/* Live figures, moving — the board's own detail, not a decoration.
            The pointer eases it down to a crawl so a rate can be read without
            chasing it; see hooks/useMarqueeHover.js for why that is done in JS
            rather than with a CSS :hover rule. */}
        <div className="fx-ticker-wrap" {...ticker} style={{ position: 'relative', borderTop: `1px solid ${c.navyLine}`, background: c.wash, overflow: 'hidden' }}>
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

      </section>

      {/* ---- The facts, and the form -----------------------------------------
          The four facts as a 2 x 2 white box on the left, the callback form
          beside it on the right. The form left the hero when the three steps
          took that side; here it is still the first thing under the fold, next
          to the four reasons to trust the number you are about to give.
          Nothing is sold on this site, so that number is the whole conversion
          (see docs/team-notifications.md). */}
      <section style={{ background: c.page, ...sectionY }}>
        <div className="fx-facts-grid" style={{ ...wrap, display: 'grid', gridTemplateColumns: '1.15fr .85fr', gap: 'clamp(20px,3vw,32px)', alignItems: 'stretch' }}>
          <Reveal className="fx-stat-strip" style={{ background: c.panel, border: `1px solid ${c.navyLine}`, borderRadius: 16, display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            {STATS.map((s, i) => (
              <div
                key={s.label}
                className="fx-hover-lift-panel"
                style={{
                  padding: 'clamp(22px,2.4vw,32px)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  borderRadius: 12,
                  position: 'relative',
                  // Hairlines only between cells, so the box keeps a clean edge:
                  // no rule on the top row, none on the left column.
                  borderTop: i > 1 ? `1px solid ${c.navyLine}` : 'none',
                  borderLeft: i % 2 === 1 ? `1px solid ${c.navyLine}` : 'none',
                }}
              >
                <div style={{ fontFamily: fonts.mono, fontSize: fs['3xl'], lineHeight: 1, color: c.surface, marginBottom: 12 }}>{s.value}</div>
                <div style={{ fontSize: fs.base, fontWeight: 600, color: c.surface, marginBottom: 5 }}>{s.label}</div>
                <div style={{ fontSize: fs.sm, lineHeight: 1.55, color: c.onNavyText }}>{s.note}</div>
              </div>
            ))}
          </Reveal>

          {/* The hero's "start with step one" scrolls here. scroll-margin keeps
              the panel's heading clear of the sticky header once it lands. */}
          <Reveal delay={.1} id={STEP_ONE_ID} style={{ display: 'flex', scrollMarginTop: 96 }}>
            <CallbackBar />
          </Reveal>
        </div>
      </section>

      {liveBoardOn && (
        <section style={{ background: c.page, ...sectionY, borderTop: `1px solid ${c.pageLine}` }}>
          <div style={wrap}>
            <SectionHead
              label="Live board"
              title="Today’s rates at the counter"
              aside={<span onClick={() => navigate('/rates')} style={{ fontSize: fs.md, fontWeight: 600, color: c.navy, borderBottom: `1px solid ${c.orange}`, paddingBottom: 3, cursor: 'pointer' }}>See all our currencies</span>}
            />
            <div style={{ ...card, overflow: 'auto' }}>
              <div style={{ minWidth: 640 }}>
                <div style={{ display: 'grid', gridTemplateColumns: LIVE_BOARD_GRID, gap: 16, padding: '10px 26px 0', background: c.inkSurface, fontFamily: fonts.mono, fontWeight: 500, fontSize: fs['2xs'], lineHeight: 1.4, letterSpacing: '.1em', color: c.navyMuted2 }}>
                  <span />
                  <span style={{ gridColumn: 'span 2', textAlign: 'center', borderBottom: `1px solid ${c.navyLine}`, paddingBottom: 6 }}>WE BUY</span>
                  <span style={{ gridColumn: 'span 2', textAlign: 'center', borderBottom: `1px solid ${c.navyLine}`, paddingBottom: 6 }}>WE SELL</span>
                  <span />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: LIVE_BOARD_GRID, gap: 16, padding: '8px 26px 16px', background: c.inkSurface, fontFamily: fonts.mono, fontWeight: 500, fontSize: fs.xs, lineHeight: 1.4, letterSpacing: '.14em', color: c.navyMuted2 }}>
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

      {/* ---- What we do: five photo-led actions -----------------------------
          Five everyday reasons someone opens this site, not a formal list of
          every service — that full list, six of them, still lives on
          /services. See WhatWeDoActions.jsx for how each tile maps to a real
          service and an existing photo. */}
      {/* A hairline between neighbouring sections of the same colour: with the
          live board switched off, "how it works" and "what we do" would
          otherwise run together into one long field of sand. */}
      <section style={{ background: c.page, ...sectionY, borderTop: `1px solid ${c.pageLine}` }}>
        <div style={wrap}>
          <SectionHead
            label="What we do"
            title="Everything to do with foreign money, in one shop"
          />
          <WhatWeDoActions />
        </div>
      </section>

      <VisitCounter />

      {/* ---- Why us -------------------------------------------------------- */}
      <section style={{ background: c.page, ...sectionY }}>
        {/* `alignItems: stretch` (the grid default, set explicitly here) is what
            ties the photo's height to the four reason cards beside it: the
            taller column sets the row height, and the photo — the only child
            with nothing of its own to size by — fills whatever that is. */}
        <div className="fx-why-grid" style={{ ...wrap, display: 'grid', gridTemplateColumns: '.72fr 1.28fr', gap: 'clamp(28px,4vw,52px)', alignItems: 'stretch' }}>
          {/* The photo reveals like everything else on scroll, then carries its
              own small hover — the image drifts in on `fx-photo-zoom`, which is
              scoped to `.fx-photo-frame:hover img` in index.css so the frame's
              overflow:hidden always clips it, never the badges over it.

              The height is not set here beyond a mobile floor: the grid's
              align-items: stretch (see fx-why-grid above) gives this cell the
              reason column's full height, and the photo fills it by being
              absolutely positioned inside — rather than a fixed pixel guess
              that happened to look right at one viewport width.

              Every badge restates something the site already publishes —
              STATS[0] and STATS[1] from data.js, and the founding year from
              company.js. A "25k+ customers" badge was asked for here and
              deliberately not built: no customer count exists in company.js,
              data.js or the database, and CLAUDE.md's never-invent-a-fact rule
              is not negotiable on a regulated money changer's homepage. */}
          <Reveal className="fx-photo-frame" style={{ position: 'relative', minHeight: 300, borderRadius: 16, overflow: 'hidden', border: `1px solid ${c.navyLine}`, boxShadow: shadowCard }}>
            <SitePhoto
              slot="home_why_us"
              placeholderLabel={<>PHOTOGRAPHY<br />Counter service, T. Nagar shop</>}
              style={{ position: 'absolute', inset: 0, border: 'none', borderRadius: 0 }}
              imgClassName="fx-photo-zoom"
            />
            {/* Two overlays, not one: a flat wash that darkens the whole photo
                so white badges read anywhere on it, plus the original corner
                gradient deepened, which keeps the bottom-left corner darkest
                where the largest badge sits. */}
            <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: c.photoWash, pointerEvents: 'none' }} />
            <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: `linear-gradient(200deg, transparent 35%, color-mix(in srgb, ${c.navyDeep} 88%, transparent) 100%)`, pointerEvents: 'none' }} />

            <div className="fx-float" style={{ '--fx-float-delay': '0s', position: 'absolute', left: 18, bottom: 18, background: c.panel, border: `1px solid ${c.navyLine}`, borderRadius: 12, padding: '11px 16px', display: 'flex', alignItems: 'baseline', gap: 9, boxShadow: shadowFloat }}>
              <span style={{ fontFamily: fonts.mono, fontSize: fs.xl, color: c.surface }}>{STATS[0].value}</span>
              <span style={{ fontSize: fs.xs, color: c.onNavyText }}>{STATS[0].label}</span>
            </div>

            <div className="fx-float" style={{ '--fx-float-delay': '-1.7s', position: 'absolute', right: 18, top: 18, background: c.panel, border: `1px solid ${c.navyLine}`, borderRadius: 12, padding: '11px 16px', display: 'flex', alignItems: 'baseline', gap: 9, boxShadow: shadowFloat }}>
              <span style={{ fontFamily: fonts.mono, fontSize: fs.xl, color: c.accentOnInk }}>{STATS[1].value}</span>
              <span style={{ fontSize: fs.xs, color: c.onNavyText }}>{STATS[1].label}</span>
            </div>

            <div className="fx-float" style={{ '--fx-float-delay': '-3.3s', position: 'absolute', right: 18, bottom: 18, background: c.panel, border: `1px solid ${c.navyLine}`, borderRadius: 12, padding: '11px 16px', display: 'flex', alignItems: 'baseline', gap: 9, boxShadow: shadowFloat }}>
              <span style={{ fontFamily: fonts.mono, fontSize: fs.xl, color: c.surface }}>Since {COMPANY.since}</span>
            </div>
          </Reveal>
          <div>
            <SectionHead label="Why us" title="The rate we tell you is the rate you pay" maxWidth={480} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {REASONS.map((f, i) => (
                <Reveal
                  key={f.n}
                  delay={i * 0.08}
                  className="fx-hover-lift-panel"
                  style={{ display: 'flex', gap: 14, padding: '14px 16px', borderRadius: 12, border: `1px solid ${c.navyLine}` }}
                >
                  <span style={{ fontFamily: fonts.mono, fontSize: fs['2xs'], letterSpacing: '.14em', color: c.accent, flex: 'none', paddingTop: 4 }}>{f.n}</span>
                  <div>
                    <h3 style={{ fontSize: fs.md, fontWeight: 600, color: c.surface, margin: '0 0 5px' }}>{f.title}</h3>
                    <p style={{ fontSize: fs.sm, lineHeight: 1.6, color: c.onNavyText, margin: 0 }}>{f.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {testimonials.length > 0 && (
        <section style={{ background: c.page, ...sectionY, borderTop: `1px solid ${c.pageLine}` }}>
          <div style={wrap}>
            <SectionHead label="Customer voices" title="What our customers say" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(300px,100%),1fr))', gap: 16 }}>
              {testimonials.map((t, i) => (
                <Reveal key={t.id} delay={i * 0.08} className="fx-hover-lift-panel" style={{ background: c.panel, border: `1px solid ${c.navyLine}`, borderRadius: 10, overflow: 'hidden', padding: 'clamp(24px,2.6vw,30px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    {/* Five filled stars, not a stored rating — Testimonial has no
                        rating field, and every quote shown here is one staff
                        chose to publish, so a full row is accurate rather than
                        an invented number. */}
                    <div aria-hidden="true" style={{ color: c.gold, fontSize: fs.md, letterSpacing: '2px', marginBottom: 14 }}>★★★★★</div>
                    <p style={{ fontFamily: fonts.serif, fontSize: fs['2xl'], lineHeight: 1.42, color: c.surface, margin: 0 }}>“{t.quote}”</p>
                  </div>
                  <div style={{ borderTop: `1px solid ${c.navyLine}`, paddingTop: 18, marginTop: 24 }}>
                    <div style={{ fontSize: fs.base, fontWeight: 600, color: c.surface }}>{t.name}</div>
                    <div style={{ fontSize: fs.sm, color: c.onNavyText }}>{t.role}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {faqs.length > 0 && (
        <section style={{ background: c.page, ...sectionY }}>
          <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 clamp(16px,4.5vw,32px)' }}>
            <SectionHead label="Questions" title="Before you come in" align="center" />
            <FaqAccordion faqs={faqs} />
          </div>
        </section>
      )}

      {/* ---- Last word -----------------------------------------------------
          The page opens on the dark panel and closes on one too, so the call to
          action carries the same weight the first screen did.

          Lifted toward the brand indigo (--fx-band), not filled with the ink.
          Ink sits within a few points of the page ground now, so this section
          was a black band on a black page: the closing call to action, the last
          thing the page says, had no edge at all. */}
      <section style={{ background: c.band, padding: 'clamp(52px,6vw,80px) 0' }}>
        <div style={{ ...wrap, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'clamp(28px,4vw,48px)', flexWrap: 'wrap' }}>
          <div>
            {/* accentOnInk, not accent: this band is lifted toward the brand
                now, and the cream-ground gold on it falls to 3.3:1 — under AA.
                The lightened gold is what theme.css keeps for exactly this,
                text on a raised brand panel. */}
            <div style={{ ...stamp, color: c.accentOnInk, marginBottom: 14 }}>Talk to a dealer</div>
            <h2 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: fs.h2, lineHeight: 1.08, letterSpacing: '-.015em', color: c.surface, margin: '0 0 12px' }}>Call us for today’s rate</h2>
            <p style={{ fontSize: fs.xl, lineHeight: 1.6, color: c.onNavyText, margin: 0, maxWidth: 540 }}>
              Tell us which currency you need and how much, and we will give you the rate. Or just walk in — Challa Mall, T. Nagar, {contact.addressNote.replace(/[()]/g, '')}.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            {contact.mobiles.slice(0, 2).map((m) => (
              <a
                key={m.tel}
                href={`tel:${m.tel}`}
                style={{ background: c.surface, color: c.orange, padding: '15px 26px', borderRadius: 8, fontSize: fs.md, fontWeight: 600, fontFamily: fonts.mono, whiteSpace: 'nowrap', transition: 'background .18s ease' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = c.brandPale)}
                onMouseLeave={(e) => (e.currentTarget.style.background = c.surface)}
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
