import { Link, useNavigate } from 'react-router-dom';
import { useFx } from '../context/FxContext';
import { fonts, c, wrap } from '../tokens';

export default function Converter() {
  const navigate = useNavigate();
  const fx = useFx();

  return (
    <div>
      <section style={{ background: c.navy, padding: '60px 0 120px' }}>
        <div style={wrap}>
          <div style={{ font: `400 12.5px/1.4 ${fonts.mono}`, color: c.navyMuted, marginBottom: 22 }}>
            <Link to="/" style={{ cursor: 'pointer', color: c.onNavyText }}>Home</Link> / Converter
          </div>
          <h1 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: 'clamp(34px,4vw,56px)', lineHeight: 1.05, color: '#fff', margin: '0 0 14px' }}>Currency converter</h1>
          <p style={{ fontSize: 16.5, lineHeight: 1.6, color: c.onNavyText, margin: 0, maxWidth: 560 }}>Work out what your currency converts to at today’s counter rate, before you reach the shop.</p>
        </div>
      </section>

      <section style={{ background: c.sand, padding: '0 0 96px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 32px', marginTop: -72 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 22, alignItems: 'start' }}>
            <div style={{ background: '#fff', border: `1px solid ${c.sandLine}`, borderRadius: 18, padding: 32, boxShadow: '0 30px 60px -40px rgba(11,27,51,.5)' }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: c.textMuted, marginBottom: 8 }}>Amount</label>
              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <input value={fx.amount} onChange={(e) => fx.setAmount(e.target.value)} inputMode="decimal" style={{ flex: 1, minWidth: 0, border: `1px solid ${c.softLine}`, borderRadius: 10, padding: 16, fontSize: 22, fontFamily: fonts.mono, color: c.navy, outline: 'none' }} />
                <select value={fx.from} onChange={(e) => fx.setFrom(e.target.value)} style={{ border: `1px solid ${c.softLine}`, borderRadius: 10, padding: '16px 12px', fontSize: 15, fontWeight: 600, background: c.sand, color: c.navy, outline: 'none', cursor: 'pointer' }}>
                  {fx.currencyList.map((cur) => <option key={cur.code} value={cur.code}>{cur.label}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '10px 0 14px' }}>
                <div style={{ flex: 1, height: 1, background: c.sandLine2 }} />
                <span
                  onClick={fx.swap}
                  style={{ width: 42, height: 42, borderRadius: '50%', border: `1px solid ${c.softLine}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 17, color: c.orange, transition: 'transform .25s,border-color .18s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'rotate(180deg)'; e.currentTarget.style.borderColor = c.orange; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = c.softLine; }}
                >⇅</span>
                <div style={{ flex: 1, height: 1, background: c.sandLine2 }} />
              </div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: c.textMuted, marginBottom: 8 }}>Converted to</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0, border: `1px solid ${c.sandLine2}`, background: c.sand, borderRadius: 10, padding: 16, fontSize: 22, fontFamily: fonts.mono, color: c.navy, overflow: 'hidden', textOverflow: 'ellipsis' }}>{fx.calc.converted}</div>
                <select value={fx.to} onChange={(e) => fx.setTo(e.target.value)} style={{ border: `1px solid ${c.softLine}`, borderRadius: 10, padding: '16px 12px', fontSize: 15, fontWeight: 600, background: c.sand, color: c.navy, outline: 'none', cursor: 'pointer' }}>
                  {fx.currencyList.map((cur) => <option key={cur.code} value={cur.code}>{cur.label}</option>)}
                </select>
              </div>
              <p style={{ margin: '18px 0 0', fontSize: 12.5, lineHeight: 1.6, color: c.textFainter }}>Cash purchases above ₹50,000 require PAN. Card and remittance limits apply under the LRS scheme.</p>
            </div>

            <div style={{ background: c.navy, borderRadius: 18, padding: 32, color: '#fff' }}>
              <p style={{ font: `500 11px/1.4 ${fonts.mono}`, letterSpacing: '.16em', color: c.accent, margin: '0 0 22px' }}>EXCHANGE SUMMARY</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: 14.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}><span style={{ color: c.onNavyText }}>You exchange</span><span style={{ fontFamily: fonts.mono }}>{fx.calc.amountLabel}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}><span style={{ color: c.onNavyText }}>Rate applied</span><span style={{ fontFamily: fonts.mono }}>{fx.calc.rateLine}</span></div>
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,.14)', marginTop: 24, paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16 }}>
                <span style={{ fontSize: 15, color: c.onNavyText }}>You receive</span>
                <span style={{ fontFamily: fonts.mono, fontSize: 28 }}>{fx.calc.converted}</span>
              </div>
              <span
                onClick={() => navigate('/contact')}
                style={{ marginTop: 26, display: 'block', textAlign: 'center', background: c.orange, color: '#fff', padding: 15, borderRadius: 9, fontSize: 15, fontWeight: 600, cursor: 'pointer', transition: 'background .18s' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = c.orangeDark)}
                onMouseLeave={(e) => (e.currentTarget.style.background = c.orange)}
              >Reserve this rate for 4 hours</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
