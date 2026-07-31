import { useNavigate } from 'react-router-dom';
import { useFx } from '../context/FxContext';
import { useFeatureFlag } from '../context/FeatureFlagsContext';
import { HERO_TRUST, STATS, SERVICES, REASONS, fmt } from '../data';
import { COMPANY, CONTACT } from '../company';
import { c, fonts, wrap, eyebrow, h2Style } from '../tokens';
import FaqAccordion from '../components/FaqAccordion';
import CallbackForm from '../components/CallbackForm';
import Seo from '../components/Seo';
import useApi from '../hooks/useApi';
import { fetchTestimonials, fetchFaqs, fetchCurrencies, toRatesMap } from '../api';

const LIVE_BOARD_GRID = '2fr 1fr 1fr 1fr 1fr 1fr';

// Module-scope so useApi doesn't refetch on every render.
const loadTestimonials = () => fetchTestimonials();
const loadHomepageFaqs = () => fetchFaqs({ homepageOnly: true });
const loadForexCardRates = () => fetchCurrencies('forex_card').then(toRatesMap);

// The FinancialService/LocalBusiness JSON-LD lives as a static <script> in
// index.html, not here — this is a single-page app, so that tag stays in the
// DOM across every client-side route change and never needs to be
// (re)written per page. Adding another copy here would just duplicate it.

function RateCcBadge({ cc }) {
  return (
    <span style={{ width: 34, height: 24, borderRadius: 4, background: c.sandCard2, border: `1px solid ${c.sandBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `500 10px/1.4 ${fonts.mono}`, color: c.textMuted }}>{cc}</span>
  );
}

function Btn({ children, onClick, variant = 'primary', style }) {
  const base = { padding: '16px 28px', borderRadius: 9, fontSize: 15.5, fontWeight: 600, cursor: 'pointer', transition: 'background .18s,transform .18s', display: 'inline-block' };
  const variants = {
    primary: { background: c.orange, color: '#fff' },
    outline: { border: '1px solid rgba(255,255,255,.26)', color: '#fff' },
  };
  return (
    <span
      onClick={onClick}
      style={{ ...base, ...variants[variant], ...style }}
      onMouseEnter={(e) => { if (variant === 'primary') e.currentTarget.style.background = c.orangeDark; if (variant === 'outline') e.currentTarget.style.background = 'rgba(255,255,255,.08)'; e.currentTarget.style.transform = variant === 'primary' ? 'translateY(-1px)' : 'none'; }}
      onMouseLeave={(e) => { if (variant === 'primary') e.currentTarget.style.background = c.orange; e.currentTarget.style.transform = 'none'; }}
    >
      {children}
    </span>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const fx = useFx();
  const liveBoardOn = useFeatureFlag('live_board');
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
        description="RBI-authorised money changer in T. Nagar, Chennai since 2000. Buy and sell foreign currency, Western Union money transfer, forex cards and outward remittance at competitive rates."
        path="/"
      />
      <section style={{ background: c.navy, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px)', backgroundSize: '72px 72px' }} />
        <div style={{ position: 'absolute', top: -180, right: -140, width: 620, height: 620, borderRadius: '50%', background: 'radial-gradient(circle,rgba(226,87,31,.28),transparent 62%)' }} />
        <div style={{ position: 'relative', ...wrap, padding: '88px 32px 96px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(380px,100%),1fr))', gap: 64, alignItems: 'center' }}>
          <div style={{ animation: 'fx-up .7s ease both' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, border: '1px solid rgba(255,255,255,.18)', borderRadius: 100, padding: '7px 15px', marginBottom: 26 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.green, display: 'block' }} />
              <span style={{ font: `500 11.5px/1.4 ${fonts.mono}`, letterSpacing: '.14em', color: c.onNavyText2, whiteSpace: 'nowrap' }}>AUTHORISED MONEY CHANGER</span>
            </div>
            <h1 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: 'clamp(42px,4.6vw,68px)', lineHeight: 1.04, letterSpacing: '-.015em', color: '#fff', margin: '0 0 22px' }}>One of the most reputed foreign currency exchanges in Chennai.</h1>
            <p style={{ fontSize: 18, lineHeight: 1.62, color: c.onNavyText, maxWidth: 520, margin: '0 0 34px' }}>
              {COMPANY.legalName} is {COMPANY.regulator.toLowerCase()}, providing comprehensive forex services to international travellers — money exchange, money transfer and money remittance, from our shop in T. Nagar.
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 40 }}>
              <Btn onClick={() => navigate('/lock-rate')}>Lock a rate</Btn>
              <Btn variant="outline" onClick={() => navigate('/quote')}>Get a free quote</Btn>
            </div>
            <div style={{ display: 'flex', gap: 34, flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,.12)', paddingTop: 26 }}>
              {HERO_TRUST.map((t) => (
                <div key={t.label}>
                  <div style={{ fontFamily: fonts.mono, fontSize: 22, color: '#fff', marginBottom: 5 }}>{t.value}</div>
                  <div style={{ fontSize: 12.5, color: c.navyMuted2, letterSpacing: '.02em' }}>{t.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 18, padding: 30, boxShadow: '0 40px 70px -30px rgba(0,0,0,.55)', animation: 'fx-up .7s .12s ease both' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <span style={{ fontSize: 17, fontWeight: 600, color: c.navy }}>Currency converter</span>
              <span style={{ font: `500 10.5px/1.4 ${fonts.mono}`, letterSpacing: '.12em', color: c.green, background: c.greenBg, padding: '6px 10px', borderRadius: 5, whiteSpace: 'nowrap' }}>TODAY'S COUNTER RATE</span>
            </div>

            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: c.textMuted, marginBottom: 8 }}>You send</label>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <input value={fx.amount} onChange={(e) => fx.setAmount(e.target.value)} inputMode="decimal" style={{ flex: 1, minWidth: 0, border: `1px solid ${c.softLine}`, borderRadius: 10, padding: '15px 16px', fontSize: 20, fontFamily: fonts.mono, color: c.navy, outline: 'none' }} />
              <select value={fx.from} onChange={(e) => fx.setFrom(e.target.value)} style={{ border: `1px solid ${c.softLine}`, borderRadius: 10, padding: '15px 12px', fontSize: 15, fontWeight: 600, color: c.navy, background: c.sand, outline: 'none', cursor: 'pointer' }}>
                {fx.currencyList.map((cur) => <option key={cur.code} value={cur.code}>{cur.label}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '6px 0 12px' }}>
              <div style={{ flex: 1, height: 1, background: c.sandLine2 }} />
              <span
                onClick={fx.swap}
                style={{ width: 38, height: 38, borderRadius: '50%', border: `1px solid ${c.softLine}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#fff', fontSize: 15, color: c.orange, transition: 'transform .25s,border-color .18s' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'rotate(180deg)'; e.currentTarget.style.borderColor = c.orange; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = c.softLine; }}
              >⇅</span>
              <div style={{ flex: 1, height: 1, background: c.sandLine2 }} />
            </div>

            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: c.textMuted, marginBottom: 8 }}>They receive (approx.)</label>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <div style={{ flex: 1, minWidth: 0, border: `1px solid ${c.sandLine2}`, background: c.sand, borderRadius: 10, padding: '15px 16px', fontSize: 20, fontFamily: fonts.mono, color: c.navy, overflow: 'hidden', textOverflow: 'ellipsis' }}>≈ {fx.calc.converted}</div>
              <select value={fx.to} onChange={(e) => fx.setTo(e.target.value)} style={{ border: `1px solid ${c.softLine}`, borderRadius: 10, padding: '15px 12px', fontSize: 15, fontWeight: 600, color: c.navy, background: c.sand, outline: 'none', cursor: 'pointer' }}>
                {fx.currencyList.map((cur) => <option key={cur.code} value={cur.code}>{cur.label}</option>)}
              </select>
            </div>

            <div style={{ borderTop: `1px dashed ${c.sandBorder}`, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 9, fontSize: 13.5, color: c.textMuted }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Exchange rate (approx.)</span><span style={{ fontFamily: fonts.mono, color: c.navy }}>{fx.calc.rateLine}</span></div>
            </div>

            <div style={{ marginTop: 20, borderTop: `1px solid ${c.sandLine2}`, paddingTop: 20 }}>
              <CallbackForm />
            </div>
          </div>
        </div>

        <div style={{ position: 'relative', borderTop: '1px solid rgba(255,255,255,.1)', background: 'rgba(0,0,0,.22)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: 0, width: 'max-content', animation: 'fx-ticker 38s linear infinite' }}>
            {tickerCodes.map((code, i) => {
              const r = fx.rates[code];
              return (
                <div key={code + i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 26px', borderRight: '1px solid rgba(255,255,255,.07)', whiteSpace: 'nowrap' }}>
                  <span style={{ font: `500 12px/1.4 ${fonts.mono}`, letterSpacing: '.1em', color: '#fff' }}>{code}/INR</span>
                  <span style={{ fontFamily: fonts.mono, fontSize: 12, color: c.onNavyText }}>{fmt(r.s, r.s < 5 ? 3 : 2)}</span>
                  <span style={{ fontFamily: fonts.mono, fontSize: 11.5, color: r.d >= 0 ? '#5CC694' : '#E4826A' }}>{(r.d >= 0 ? '+' : '') + r.d.toFixed(2) + '%'}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section style={{ background: '#fff', borderBottom: `1px solid ${c.sandLine2}` }}>
        <div style={{ ...wrap, padding: '56px 32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(200px,100%),1fr))', gap: 40 }}>
          {STATS.map((s) => (
            <div key={s.label}>
              <div style={{ fontFamily: fonts.serif, fontSize: 44, lineHeight: 1, color: c.navy, marginBottom: 9 }}>{s.value}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: c.navyMid, marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 13, lineHeight: 1.5, color: c.textFaint }}>{s.note}</div>
            </div>
          ))}
        </div>
      </section>

      {liveBoardOn && (
      <section style={{ background: c.sand, padding: '92px 0' }}>
        <div style={wrap}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 32, flexWrap: 'wrap', marginBottom: 38 }}>
            <div>
              <p style={eyebrow}>Live board</p>
              <h2 style={h2Style}>Today's counter rates</h2>
            </div>
            <span onClick={() => navigate('/rates')} style={{ fontSize: 15, fontWeight: 600, color: c.navy, borderBottom: `1px solid ${c.orange}`, paddingBottom: 3, cursor: 'pointer' }}>View all 42 currencies</span>
          </div>
          <div style={{ background: '#fff', border: `1px solid ${c.sandLine}`, borderRadius: 16, overflow: 'auto' }}>
            <div style={{ minWidth: 640 }}>
              <div style={{ display: 'grid', gridTemplateColumns: LIVE_BOARD_GRID, gap: 16, padding: '10px 26px 0', background: c.navy, font: `500 10.5px/1.4 ${fonts.mono}`, letterSpacing: '.1em', color: c.navyMuted2 }}>
                <span />
                <span style={{ gridColumn: 'span 2', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,.16)', paddingBottom: 6 }}>WE BUY</span>
                <span style={{ gridColumn: 'span 2', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,.16)', paddingBottom: 6 }}>WE SELL</span>
                <span />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: LIVE_BOARD_GRID, gap: 16, padding: '8px 26px 16px', background: c.navy, font: `500 11px/1.4 ${fonts.mono}`, letterSpacing: '.14em', color: c.navyMuted2 }}>
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
                        <span style={{ fontSize: 15, fontWeight: 600, color: c.navy }}>{code}</span>
                        <span style={{ fontSize: 13, color: c.textFaint, marginLeft: 9 }}>{r.n}</span>
                      </div>
                    </div>
                    <span style={{ textAlign: 'right', fontFamily: fonts.mono, fontSize: 15, color: fc ? c.navy : c.textFainter }}>{fc ? fmt(fc.b, fc.b < 5 ? 3 : 2) : '—'}</span>
                    <span style={{ textAlign: 'right', fontFamily: fonts.mono, fontSize: 15, color: c.navy }}>{fmt(r.b, r.b < 5 ? 3 : 2)}</span>
                    <span style={{ textAlign: 'right', fontFamily: fonts.mono, fontSize: 15, color: fc ? c.navy : c.textFainter }}>{fc ? fmt(fc.s, fc.s < 5 ? 3 : 2) : '—'}</span>
                    <span style={{ textAlign: 'right', fontFamily: fonts.mono, fontSize: 15, color: c.navy }}>{fmt(r.s, r.s < 5 ? 3 : 2)}</span>
                    <span style={{ textAlign: 'right', fontFamily: fonts.mono, fontSize: 13.5, color: r.d >= 0 ? c.green : c.red }}>{(r.d >= 0 ? '+' : '') + r.d.toFixed(2) + '%'}</span>
                  </div>
                );
              })}
              <div style={{ padding: '15px 26px', fontSize: 12.5, color: c.textFainter, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <span>Rates per 1 unit of foreign currency in INR.</span>
                <span style={{ fontFamily: fonts.mono }}>Last updated {fx.ratesUpdatedAt}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

      <section style={{ background: '#fff', padding: '96px 0' }}>
        <div style={wrap}>
          <p style={eyebrow}>What we do</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 40, flexWrap: 'wrap', marginBottom: 44 }}>
            <h2 style={{ ...h2Style, maxWidth: 560 }}>Every foreign exchange need, under one licence</h2>
            <p style={{ fontSize: 16.5, lineHeight: 1.62, color: c.textMuted, maxWidth: 420, margin: 0 }}>From a ₹5,000 holiday buy to a ₹4 crore import settlement — handled by the same compliance team.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(320px,100%),1fr))', gap: 20 }}>
            {SERVICES.map((s) => (
              <div
                key={s.id}
                onClick={() => navigate(`/services/${s.id}`)}
                style={{ background: '#fff', border: `1px solid ${c.sandLine}`, borderRadius: 14, padding: 30, cursor: 'pointer', transition: 'box-shadow .22s,transform .22s,border-color .22s' }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 24px 40px -28px rgba(11,27,51,.4)'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = '#DAD5CD'; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = c.sandLine; }}
              >
                <span style={{ width: 40, height: 40, borderRadius: 9, background: c.serviceIconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `500 12px/1.4 ${fonts.mono}`, color: c.orange, marginBottom: 20 }}>{s.tag}</span>
                <h3 style={{ fontSize: 19, fontWeight: 600, color: c.navy, margin: '0 0 10px' }}>{s.title}</h3>
                <p style={{ fontSize: 14.5, lineHeight: 1.62, color: c.textMuted, margin: '0 0 18px' }}>{s.short}</p>
                <span style={{ fontSize: 14, fontWeight: 600, color: c.orange }}>Learn more →</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: c.sand, padding: '96px 0' }}>
        <div style={{ ...wrap, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(360px,100%),1fr))', gap: 64, alignItems: 'center' }}>
          <div style={{ background: `repeating-linear-gradient(135deg,${c.swatch} 0 10px,${c.swatch2} 10px 20px)`, border: `1px solid ${c.sandBorder4}`, borderRadius: 16, minHeight: 460, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ font: `400 11px/1.7 ${fonts.mono}`, letterSpacing: '.14em', color: c.swatchText, textAlign: 'center' }}>PHOTOGRAPHY<br />Counter service, T. Nagar branch</span>
          </div>
          <div>
            <p style={eyebrow}>Why us?</p>
            <h2 style={{ ...h2Style, fontSize: 'clamp(32px,3.4vw,46px)', lineHeight: 1.1, marginBottom: 36 }}>The margin you see is the margin you pay</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
              {REASONS.map((f) => (
                <div key={f.n} style={{ display: 'flex', gap: 18 }}>
                  <span style={{ width: 30, height: 30, flex: 'none', borderRadius: 8, background: c.navy, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', font: `500 11px/1.4 ${fonts.mono}` }}>{f.n}</span>
                  <div>
                    <h3 style={{ fontSize: 17, fontWeight: 600, color: c.navy, margin: '3px 0 7px' }}>{f.title}</h3>
                    <p style={{ fontSize: 14.8, lineHeight: 1.62, color: c.textMuted, margin: 0 }}>{f.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {testimonials.length > 0 && (
        <section style={{ background: c.sand, padding: '92px 0' }}>
          <div style={wrap}>
            <p style={eyebrow}>Customer voices</p>
            <h2 style={{ ...h2Style, fontSize: 'clamp(32px,3.4vw,46px)', marginBottom: 40 }}>Trusted by travellers and finance teams</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(300px,100%),1fr))', gap: 20 }}>
              {testimonials.map((t) => (
                <div key={t.id} style={{ background: '#fff', border: `1px solid ${c.sandLine}`, borderRadius: 14, padding: 30, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <p style={{ fontFamily: fonts.serif, fontSize: 20, lineHeight: 1.45, color: c.ink, margin: '0 0 26px' }}>“{t.quote}”</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 13, borderTop: `1px solid ${c.sandLine3}`, paddingTop: 20 }}>
                    <span style={{ width: 38, height: 38, borderRadius: '50%', background: c.sandCard2, border: `1px solid ${c.sandBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `500 12px/1.4 ${fonts.mono}`, color: c.textMuted }}>{t.initials}</span>
                    <div>
                      <div style={{ fontSize: 14.5, fontWeight: 600, color: c.navy }}>{t.name}</div>
                      <div style={{ fontSize: 12.8, color: c.textFaint }}>{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {faqs.length > 0 && (
        <section style={{ background: c.sand, padding: '92px 0' }}>
          <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 32px' }}>
            <p style={{ ...eyebrow, textAlign: 'center' }}>Questions</p>
            <h2 style={{ ...h2Style, fontSize: 'clamp(32px,3.4vw,46px)', marginBottom: 40, textAlign: 'center' }}>Before you walk in</h2>
            <FaqAccordion faqs={faqs} />
          </div>
        </section>
      )}

      <section style={{ background: c.orange, padding: '80px 0' }}>
        <div style={{ ...wrap, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 40, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: 'clamp(30px,3.2vw,44px)', lineHeight: 1.1, color: '#fff', margin: '0 0 12px' }}>Call us to get quotes</h2>
            <p style={{ fontSize: 17, lineHeight: 1.6, color: '#FCE4D8', margin: 0, maxWidth: 560 }}>
              Tell us the currency and amount and we will quote you the rate. Walk in to {CONTACT.addressNote.replace(/[()]/g, '')} — Challa Mall, T. Nagar.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            {CONTACT.mobiles.slice(0, 2).map((m) => (
              <a key={m.tel} href={`tel:${m.tel}`} style={{ background: c.navy, color: '#fff', padding: '16px 28px', borderRadius: 9, fontSize: 15.5, fontWeight: 600, fontFamily: fonts.mono, whiteSpace: 'nowrap' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = c.navyLight)} onMouseLeave={(e) => (e.currentTarget.style.background = c.navy)}
              >{m.display}</a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
