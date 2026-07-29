import { Link, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { useFx } from '../context/FxContext';
import { FILTERS, fmt } from '../data';
import { c, fonts, wrap } from '../tokens';
import Seo from '../components/Seo';


function RateCcBadge({ cc }) {
  return (
    <span style={{ width: 34, height: 24, borderRadius: 4, background: c.sandCard2, border: `1px solid ${c.sandBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `500 10px/1.4 ${fonts.mono}`, color: c.textMuted }}>{cc}</span>
  );
}

function StarButton({ active, onClick }) {
  return (
    <span onClick={onClick} style={{ cursor: 'pointer', fontSize: 16, color: active ? c.gold : '#C3C8D0' }}>
      {active ? '★' : '☆'}
    </span>
  );
}

export default function Rates() {
  const navigate = useNavigate();
  const fx = useFx();

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
      <section style={{ background: c.navy, padding: '60px 0 44px' }}>
        <div style={wrap}>
          <div style={{ font: `400 12.5px/1.4 ${fonts.mono}`, color: c.navyMuted, marginBottom: 22 }}>
            <Link to="/" style={{ cursor: 'pointer', color: c.onNavyText }}>Home</Link> / Exchange rates
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 32, flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: 'clamp(34px,4vw,56px)', lineHeight: 1.05, color: '#fff', margin: '0 0 14px' }}>Live exchange rates</h1>
              <p style={{ fontSize: 16.5, lineHeight: 1.6, color: c.onNavyText, margin: 0, maxWidth: 560 }}>Counter rates at our T. Nagar shop, quoted in INR per unit of foreign currency.</p>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', border: '1px solid rgba(255,255,255,.16)', borderRadius: 9, padding: '11px 16px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.green, display: 'block', animation: 'fx-pulse 2.4s ease-in-out infinite' }} />
              <span style={{ font: `500 11.5px/1.4 ${fonts.mono}`, letterSpacing: '.12em', color: c.onNavyText2 }}>UPDATED {fx.ratesUpdatedAt}</span>
            </div>
          </div>
        </div>
      </section>

      <section style={{ background: c.sand, padding: '44px 0 96px' }}>
        <div style={wrap}>
          {fx.favs.length > 0 && (
            <div style={{ marginBottom: 36 }}>
              <p style={{ font: `500 11.5px/1.4 ${fonts.mono}`, letterSpacing: '.18em', textTransform: 'uppercase', color: c.orange, margin: '0 0 16px' }}>Favourites</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 16 }}>
                {fx.favs.map((code) => {
                  const r = fx.rates[code];
                  return (
                    <div key={code} style={{ background: '#fff', border: `1px solid ${c.sandLine}`, borderRadius: 13, padding: '20px 22px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <span style={{ fontSize: 15, fontWeight: 600, color: c.navy }}>{code}<span style={{ color: c.textFainter, fontWeight: 400 }}> / INR</span></span>
                        <StarButton active onClick={() => fx.toggleFav(code)} />
                      </div>
                      <div style={{ display: 'flex', gap: 22 }}>
                        <div><div style={{ fontSize: 11.5, color: c.textFainter, marginBottom: 4 }}>Buy</div><div style={{ fontFamily: fonts.mono, fontSize: 17, color: c.navy }}>{fmt(r.b, r.b < 5 ? 3 : 2)}</div></div>
                        <div><div style={{ fontSize: 11.5, color: c.textFainter, marginBottom: 4 }}>Sell</div><div style={{ fontFamily: fonts.mono, fontSize: 17, color: c.navy }}>{fmt(r.s, r.s < 5 ? 3 : 2)}</div></div>
                        <div><div style={{ fontSize: 11.5, color: c.textFainter, marginBottom: 4 }}>24h</div><div style={{ fontFamily: fonts.mono, fontSize: 17, color: r.d >= 0 ? c.green : c.red }}>{(r.d >= 0 ? '+' : '') + r.d.toFixed(2) + '%'}</div></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {FILTERS.map((t) => (
                <span
                  key={t}
                  onClick={() => fx.setFilter(t)}
                  style={{
                    padding: '9px 15px', borderRadius: 100, border: `1px solid ${c.sandBorder3}`, fontSize: 13.5, fontWeight: 500, cursor: 'pointer',
                    background: fx.filter === t ? c.navy : '#fff', color: fx.filter === t ? '#fff' : c.text, transition: 'all .18s',
                  }}
                >{t}</span>
              ))}
            </div>
            <input
              value={fx.q}
              onChange={(e) => fx.setQ(e.target.value)}
              placeholder="Search currency or code"
              style={{ minWidth: 260, border: `1px solid ${c.softLine}`, borderRadius: 9, padding: '12px 16px', fontSize: 14.5, background: '#fff', outline: 'none', color: c.navy }}
            />
          </div>

          <div style={{ background: '#fff', border: `1px solid ${c.sandLine}`, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '44px 2fr 1fr 1fr 1fr 120px', gap: 14, padding: '15px 26px', background: c.navy, font: `500 11px/1.4 ${fonts.mono}`, letterSpacing: '.14em', color: c.navyMuted2, alignItems: 'center' }}>
              <span /><span>CURRENCY</span><span style={{ textAlign: 'right' }}>WE BUY</span><span style={{ textAlign: 'right' }}>WE SELL</span><span style={{ textAlign: 'right' }}>24H</span><span style={{ textAlign: 'right' }}>ACTION</span>
            </div>
            {rows.map((code) => {
              const r = fx.rates[code];
              const fav = fx.favs.indexOf(code) >= 0;
              return (
                <div key={code} style={{ display: 'grid', gridTemplateColumns: '44px 2fr 1fr 1fr 1fr 120px', gap: 14, padding: '17px 26px', borderBottom: `1px solid ${c.sandLine3}`, alignItems: 'center' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = c.cream)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <StarButton active={fav} onClick={() => fx.toggleFav(code)} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <RateCcBadge cc={r.cc} />
                    <div>
                      <span style={{ fontSize: 15, fontWeight: 600, color: c.navy }}>{code}</span>
                      <span style={{ fontSize: 13, color: c.textFaint, marginLeft: 9 }}>{r.n}</span>
                    </div>
                  </div>
                  <span style={{ textAlign: 'right', fontFamily: fonts.mono, fontSize: 15, color: c.navy }}>{fmt(r.b, r.b < 5 ? 3 : 2)}</span>
                  <span style={{ textAlign: 'right', fontFamily: fonts.mono, fontSize: 15, color: c.navy }}>{fmt(r.s, r.s < 5 ? 3 : 2)}</span>
                  <span style={{ textAlign: 'right', fontFamily: fonts.mono, fontSize: 13.5, color: r.d >= 0 ? c.green : c.red }}>{(r.d >= 0 ? '+' : '') + r.d.toFixed(2) + '%'}</span>
                  <span
                    onClick={() => { fx.setFrom(code); fx.setTo('INR'); navigate('/converter'); }}
                    style={{ textAlign: 'right', fontSize: 13.5, fontWeight: 600, color: c.orange, cursor: 'pointer' }}
                  >Convert →</span>
                </div>
              );
            })}
            <div style={{ padding: '18px 26px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, fontSize: 12.5, color: c.textFainter }}>
              <span>Showing {rows.length} currencies · rates indicative, confirmed at the counter</span>
              <span style={{ fontFamily: fonts.mono }}>Board refreshed every 15 minutes</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
