import { Link, useNavigate } from 'react-router-dom';
import { useMemo, useState, useEffect } from 'react';
import { useFx } from '../context/FxContext';
import { useFeatureFlag } from '../context/FeatureFlagsContext';
import { fetchCurrencies, toRatesMap } from '../api';
import { FILTERS, fmt } from '../data';
import { c, fs, fonts, wrap } from '../tokens';
import Seo from '../components/Seo';

const GRID = '44px 2fr 1fr 1fr 1fr 1fr 0.8fr 110px';

function RateCcBadge({ cc }) {
  return (
    <span style={{ width: 34, height: 24, borderRadius: 4, background: c.sandCard2, border: `1px solid ${c.sandBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.mono, fontWeight: 500, fontSize: fs['2xs'], lineHeight: 1.4, color: c.textMuted }}>{cc}</span>
  );
}

function StarButton({ active, onClick }) {
  return (
    <span onClick={onClick} style={{ cursor: 'pointer', fontSize: fs.lg, color: active ? c.gold : c.goldOff }}>
      {active ? '★' : '☆'}
    </span>
  );
}

// "—" for a currency with no Forex Card row published in the admin yet.
function RateCell({ value }) {
  return (
    <span style={{ textAlign: 'right', fontFamily: fonts.mono, fontSize: fs.md, color: value == null ? c.textFainter : c.navy }}>
      {value == null ? '—' : fmt(value, value < 5 ? 3 : 2)}
    </span>
  );
}

export default function Rates() {
  const navigate = useNavigate();
  const fx = useFx();
  const ratesPageOn = useFeatureFlag('exchange_rates_page');

  const [forexCardRates, setForexCardRates] = useState(null);
  const [forexCardError, setForexCardError] = useState(null);

  useEffect(() => {
    fetchCurrencies('forex_card')
      .then((list) => setForexCardRates(toRatesMap(list)))
      .catch((err) => setForexCardError(err.message));
  }, []);

  const allCodes = Object.keys(fx.rates).filter((code) => code !== 'INR');
  const q = fx.q.trim().toLowerCase();

  const rows = useMemo(() => allCodes.filter((code) => {
    const r = fx.rates[code];
    if (q && (code + ' ' + r.n).toLowerCase().indexOf(q) < 0) return false;
    if (fx.filter === 'Popular') return fx.popular.indexOf(code) >= 0;
    if (fx.filter === 'Favourites') return fx.favs.indexOf(code) >= 0;
    if (fx.filter !== 'All') return r.r === fx.filter;
    return true;
  }), [q, fx.filter, fx.favs, fx.rates, fx.popular]);

  if (!ratesPageOn) {
    return (
      <div style={{ padding: '120px 32px', textAlign: 'center' }}>
        <Seo title="Exchange Rates" description="Live buy and sell rates." path="/rates" />
        <p style={{ fontSize: fs.xl, color: c.textMuted, marginBottom: 20 }}>The exchange rates page isn't available right now.</p>
        <Link to="/" style={{ fontSize: fs.base, fontWeight: 600, color: c.orange }}>Back to home</Link>
      </div>
    );
  }

  if (fx.ratesLoading) {
    return <div style={{ padding: '120px 32px', textAlign: 'center', color: c.textMuted }}>Loading live rates…</div>;
  }

  return (
    <div>
      <Seo
        title="Today's Foreign Exchange Rates"
        description="Live buy and sell rates for USD, EUR, GBP and other major currencies at Reddy Forex, T. Nagar, Chennai — updated daily by our RBI-authorised dealing desk."
        path="/rates"
      />
      <section style={{ background: c.page, padding: '60px 0 44px' }}>
        <div style={wrap}>
          <div style={{ fontFamily: fonts.mono, fontWeight: 400, fontSize: fs.sm, lineHeight: 1.4, color: c.navyMuted, marginBottom: 22 }}>
            <Link to="/" style={{ cursor: 'pointer', color: c.onNavyText }}>Home</Link> / Exchange rates
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 32, flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: fs.h1, lineHeight: 1.05, color: c.surface, margin: '0 0 14px' }}>Live exchange rates</h1>
              <p style={{ fontSize: fs.lg, lineHeight: 1.6, color: c.onNavyText, margin: 0, maxWidth: 560 }}>Counter rates at our T. Nagar shop, quoted in INR per unit of foreign currency. Forex Card rates shown alongside where published.</p>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', border: '1px solid rgba(255,255,255,.16)', borderRadius: 9, padding: '11px 16px' }}>
              {/* "Live" dot, matching OpenStatus. Green here read as "rates are
                  up", which is the one thing green means on this page. */}
              <span className="fx-dot-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: c.accent, display: 'block' }} />
              <span style={{ fontFamily: fonts.mono, fontWeight: 500, fontSize: fs.xs, lineHeight: 1.4, letterSpacing: '.12em', color: c.onNavyText2 }}>UPDATED {fx.ratesUpdatedAt}</span>
            </div>
          </div>
        </div>
      </section>

      <section style={{ background: c.page, padding: '44px 0 96px' }}>
        <div style={wrap}>
          {fx.favs.length > 0 && (
            <div style={{ marginBottom: 36 }}>
              <p style={{ fontFamily: fonts.mono, fontWeight: 500, fontSize: fs.xs, lineHeight: 1.4, letterSpacing: '.18em', textTransform: 'uppercase', color: c.accent, margin: '0 0 16px' }}>Favourites</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(230px,100%),1fr))', gap: 16 }}>
                {fx.favs.map((code) => {
                  const r = fx.rates[code];
                  return (
                    <div key={code} className="fx-hover-lift" style={{ background: c.surface, border: `1px solid ${c.sandLine}`, borderRadius: 13, padding: '20px 22px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <span style={{ fontSize: fs.md, fontWeight: 600, color: c.navy }}>{code}<span style={{ color: c.textFainter, fontWeight: 400 }}> / INR</span></span>
                        <StarButton active onClick={() => fx.toggleFav(code)} />
                      </div>
                      <div style={{ display: 'flex', gap: 22 }}>
                        <div><div style={{ fontSize: fs.xs, color: c.textFainter, marginBottom: 4 }}>Buy</div><div style={{ fontFamily: fonts.mono, fontSize: fs.xl, color: c.navy }}>{fmt(r.b, r.b < 5 ? 3 : 2)}</div></div>
                        <div><div style={{ fontSize: fs.xs, color: c.textFainter, marginBottom: 4 }}>Sell</div><div style={{ fontFamily: fonts.mono, fontSize: fs.xl, color: c.navy }}>{fmt(r.s, r.s < 5 ? 3 : 2)}</div></div>
                        <div><div style={{ fontSize: fs.xs, color: c.textFainter, marginBottom: 4 }}>24h</div><div style={{ fontFamily: fonts.mono, fontSize: fs.xl, color: r.d >= 0 ? c.green : c.red }}>{(r.d >= 0 ? '+' : '') + r.d.toFixed(2) + '%'}</div></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {forexCardError && (
            <div style={{ marginBottom: 20, fontSize: fs.sm, color: c.redLight }}>Couldn't load Forex Card rates: {forexCardError} — showing Currency rates only.</div>
          )}

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {FILTERS.map((t) => (
                <span
                  key={t}
                  onClick={() => fx.setFilter(t)}
                  style={{
                    padding: '9px 15px', borderRadius: 100, border: `1px solid ${c.sandBorder3}`, fontSize: fs.base, fontWeight: 500, cursor: 'pointer',
                    background: fx.filter === t ? c.navy : c.surface, color: fx.filter === t ? c.surface : c.text, transition: 'all .18s',
                  }}
                >{t}</span>
              ))}
            </div>
            <input
              value={fx.q}
              onChange={(e) => fx.setQ(e.target.value)}
              placeholder="Search currency or code"
              style={{ minWidth: 260, border: `1px solid ${c.softLine}`, borderRadius: 9, padding: '12px 16px', fontSize: fs.base, background: c.surface, outline: 'none', color: c.navy }}
            />
          </div>

          <div style={{ background: c.surface, border: `1px solid ${c.sandLine}`, borderRadius: 16, overflow: 'auto' }}>
            <div style={{ minWidth: 760 }}>
              <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 14, padding: '10px 26px 0', background: c.navy, fontFamily: fonts.mono, fontWeight: 500, fontSize: fs['2xs'], lineHeight: 1.4, letterSpacing: '.1em', color: c.navyMuted2 }}>
                <span /><span />
                <span style={{ gridColumn: 'span 2', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,.16)', paddingBottom: 6 }}>WE BUY</span>
                <span style={{ gridColumn: 'span 2', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,.16)', paddingBottom: 6 }}>WE SELL</span>
                <span /><span />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 14, padding: '8px 26px 15px', background: c.navy, fontFamily: fonts.mono, fontWeight: 500, fontSize: fs.xs, lineHeight: 1.4, letterSpacing: '.14em', color: c.navyMuted2, alignItems: 'center' }}>
                <span /><span>CURRENCY</span>
                <span style={{ textAlign: 'right' }}>FOREX CARD</span><span style={{ textAlign: 'right' }}>CURRENCY</span>
                <span style={{ textAlign: 'right' }}>FOREX CARD</span><span style={{ textAlign: 'right' }}>CURRENCY</span>
                <span style={{ textAlign: 'right' }}>24H</span><span style={{ textAlign: 'right' }}>ACTION</span>
              </div>
              {rows.map((code) => {
                const r = fx.rates[code];
                const fc = forexCardRates ? forexCardRates[code] : undefined;
                const fav = fx.favs.indexOf(code) >= 0;
                return (
                  <div key={code} style={{ display: 'grid', gridTemplateColumns: GRID, gap: 14, padding: '17px 26px', borderBottom: `1px solid ${c.sandLine3}`, alignItems: 'center' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = c.cream)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <StarButton active={fav} onClick={() => fx.toggleFav(code)} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <RateCcBadge cc={r.cc} />
                      <div>
                        <span style={{ fontSize: fs.md, fontWeight: 600, color: c.navy }}>{code}</span>
                        <span style={{ fontSize: fs.sm, color: c.textFaint, marginLeft: 9 }}>{r.n}</span>
                      </div>
                    </div>
                    <RateCell value={fc ? fc.b : null} />
                    <RateCell value={r.b} />
                    <RateCell value={fc ? fc.s : null} />
                    <RateCell value={r.s} />
                    <span style={{ textAlign: 'right', fontFamily: fonts.mono, fontSize: fs.base, color: r.d >= 0 ? c.green : c.red }}>{(r.d >= 0 ? '+' : '') + r.d.toFixed(2) + '%'}</span>
                    <span
                      onClick={() => { fx.setFrom(code); fx.setTo('INR'); navigate('/'); }}
                      style={{ textAlign: 'right', fontSize: fs.base, fontWeight: 600, color: c.orange, cursor: 'pointer' }}
                    >Convert →</span>
                  </div>
                );
              })}
              <div style={{ padding: '18px 26px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, fontSize: fs.sm, color: c.textFainter }}>
                <span>Showing {rows.length} currencies · rates indicative, confirmed at the counter</span>
                <span style={{ fontFamily: fonts.mono }}>Board refreshed every 15 minutes</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
