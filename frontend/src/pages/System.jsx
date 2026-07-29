import { Link } from 'react-router-dom';
import { TOKENS, TYPE_SCALE, SPACING, RADII } from '../data';
import { c, fonts, wrap } from '../tokens';

export default function System() {
  return (
    <div>
      <section style={{ background: c.navy, padding: '60px 0 72px' }}>
        <div style={wrap}>
          <div style={{ font: `400 12.5px/1.4 ${fonts.mono}`, color: c.navyMuted, marginBottom: 22 }}>
            <Link to="/" style={{ cursor: 'pointer', color: c.onNavyText }}>Home</Link> / Design system
          </div>
          <h1 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: 'clamp(34px,4vw,54px)', lineHeight: 1.05, color: '#fff', margin: '0 0 14px' }}>Reddy Forex design system</h1>
          <p style={{ fontSize: 16.5, lineHeight: 1.6, color: c.onNavyText, margin: 0, maxWidth: 600 }}>Tokens and components as implemented — ready to port into a React or Next.js codebase.</p>
        </div>
      </section>

      <section style={{ background: '#fff', padding: '72px 0 96px' }}>
        <div style={{ ...wrap, display: 'flex', flexDirection: 'column', gap: 72 }}>

          <div>
            <h2 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: 32, color: c.navy, margin: '0 0 24px' }}>Colour tokens</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16 }}>
              {TOKENS.map((t) => (
                <div key={t.hex} style={{ border: `1px solid ${c.sandLine}`, borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ height: 84, background: t.hex }} />
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: c.navy, marginBottom: 4 }}>{t.name}</div>
                    <div style={{ fontFamily: fonts.mono, fontSize: 12, color: c.textFainter }}>{t.hex}</div>
                    <div style={{ fontSize: 12, color: c.textFainter, marginTop: 6 }}>{t.use}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: 32, color: c.navy, margin: '0 0 24px' }}>Typography scale</h2>
            <div style={{ border: `1px solid ${c.sandLine}`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 180px', gap: 20, padding: '14px 24px', background: c.navy, font: `500 11px/1.4 ${fonts.mono}`, letterSpacing: '.14em', color: c.navyMuted2 }}>
                <span>TOKEN</span><span>SAMPLE</span><span>SPEC</span>
              </div>
              {TYPE_SCALE.map((t) => (
                <div key={t.token} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 180px', gap: 20, padding: '20px 24px', borderBottom: `1px solid ${c.sandLine3}`, alignItems: 'center' }}>
                  <span style={{ fontFamily: fonts.mono, fontSize: 12.5, color: c.orange }}>{t.token}</span>
                  <span style={{ fontFamily: t.family, fontSize: t.size, fontWeight: t.weight, color: c.navy, lineHeight: 1.15 }}>Exchange with confidence</span>
                  <span style={{ fontFamily: fonts.mono, fontSize: 12, color: c.textFainter }}>{t.spec}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 32 }}>
            <div>
              <h2 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: 32, color: c.navy, margin: '0 0 24px' }}>Spacing &amp; radius</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {SPACING.map((s) => (
                  <div key={s.token} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontFamily: fonts.mono, fontSize: 12.5, color: c.textFainter, width: 64 }}>{s.token}</span>
                    <span style={{ height: 14, width: s.px, background: c.orange, borderRadius: 3 }} />
                    <span style={{ fontFamily: fonts.mono, fontSize: 12.5, color: c.navy }}>{s.px}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 14, marginTop: 28, flexWrap: 'wrap' }}>
                {RADII.map((r) => (
                  <div key={r.px} style={{ textAlign: 'center' }}>
                    <div style={{ width: 72, height: 56, background: c.sandCard2, border: `1px solid ${c.sandBorder}`, borderRadius: r.px }} />
                    <div style={{ fontFamily: fonts.mono, fontSize: 11.5, color: c.textFainter, marginTop: 8 }}>{r.px}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: 32, color: c.navy, margin: '0 0 24px' }}>Elevation</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 18 }}>
                <div style={{ background: '#fff', border: `1px solid ${c.sandLine}`, borderRadius: 12, height: 96, display: 'flex', alignItems: 'flex-end', padding: 12 }}><span style={{ fontFamily: fonts.mono, fontSize: 11, color: c.textFainter }}>flat</span></div>
                <div style={{ background: '#fff', border: `1px solid ${c.sandLine2}`, borderRadius: 12, height: 96, boxShadow: '0 10px 20px -14px rgba(11,27,51,.35)', display: 'flex', alignItems: 'flex-end', padding: 12 }}><span style={{ fontFamily: fonts.mono, fontSize: 11, color: c.textFainter }}>card</span></div>
                <div style={{ background: '#fff', border: `1px solid ${c.sandLine2}`, borderRadius: 12, height: 96, boxShadow: '0 24px 40px -28px rgba(11,27,51,.45)', display: 'flex', alignItems: 'flex-end', padding: 12 }}><span style={{ fontFamily: fonts.mono, fontSize: 11, color: c.textFainter }}>raised</span></div>
                <div style={{ background: '#fff', border: `1px solid ${c.sandLine2}`, borderRadius: 12, height: 96, boxShadow: '0 40px 70px -30px rgba(11,27,51,.6)', display: 'flex', alignItems: 'flex-end', padding: 12 }}><span style={{ fontFamily: fonts.mono, fontSize: 11, color: c.textFainter }}>overlay</span></div>
              </div>
            </div>
          </div>

          <div>
            <h2 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: 32, color: c.navy, margin: '0 0 24px' }}>Buttons &amp; badges</h2>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', marginBottom: 26 }}>
              <span style={{ background: c.orange, color: '#fff', padding: '14px 24px', borderRadius: 9, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Primary</span>
              <span style={{ background: c.navy, color: '#fff', padding: '14px 24px', borderRadius: 9, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Secondary</span>
              <span style={{ border: '1px solid #D5D0C8', color: c.navy, background: '#fff', padding: '14px 24px', borderRadius: 9, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Outline</span>
              <span style={{ color: c.orange, fontSize: 15, fontWeight: 600, cursor: 'pointer', borderBottom: `1px solid ${c.orange}`, paddingBottom: 3 }}>Text link</span>
              <span style={{ background: c.disabledBg, color: c.disabledText, padding: '14px 24px', borderRadius: 9, fontSize: 15, fontWeight: 600 }}>Disabled</span>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ background: c.greenBg, color: c.greenText, padding: '7px 12px', borderRadius: 6, font: `500 11.5px/1.4 ${fonts.mono}`, letterSpacing: '.08em' }}>RATE UP</span>
              <span style={{ background: c.redBg, color: c.redText, padding: '7px 12px', borderRadius: 6, font: `500 11.5px/1.4 ${fonts.mono}`, letterSpacing: '.08em' }}>RATE DOWN</span>
              <span style={{ background: '#FDF6E3', color: '#8A6A11', padding: '7px 12px', borderRadius: 6, font: `500 11.5px/1.4 ${fonts.mono}`, letterSpacing: '.08em' }}>PREMIUM</span>
              <span style={{ background: c.sandCard2, color: c.textMuted, padding: '7px 12px', borderRadius: 6, font: `500 11.5px/1.4 ${fonts.mono}`, letterSpacing: '.08em' }}>NEUTRAL</span>
              <span style={{ background: c.navy, color: '#fff', padding: '7px 12px', borderRadius: 6, font: `500 11.5px/1.4 ${fonts.mono}`, letterSpacing: '.08em' }}>LIVE</span>
            </div>
          </div>

          <div>
            <h2 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: 32, color: c.navy, margin: '0 0 24px' }}>Feedback states</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16 }}>
              <div style={{ border: `1px solid ${c.greenBorder}`, background: c.greenBg2, borderRadius: 11, padding: '18px 20px' }}><div style={{ fontSize: 14.5, fontWeight: 600, color: c.greenText, marginBottom: 5 }}>Rate locked</div><div style={{ fontSize: 13.5, lineHeight: 1.55, color: c.greenText2 }}>Reference FX-88421 held until 14:20 IST.</div></div>
              <div style={{ border: `1px solid ${c.redBorder}`, background: c.redBg2, borderRadius: 11, padding: '18px 20px' }}><div style={{ fontSize: 14.5, fontWeight: 600, color: c.redText, marginBottom: 5 }}>Document missing</div><div style={{ fontSize: 13.5, lineHeight: 1.55, color: c.redText2 }}>Upload the visa page to continue the reservation.</div></div>
              <div style={{ border: `1px solid ${c.sandLine}`, background: c.cream, borderRadius: 11, padding: '18px 20px', display: 'flex', gap: 12, alignItems: 'center' }}><span style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${c.orange}`, borderTopColor: 'transparent', display: 'block', animation: 'fx-pulse 1.1s linear infinite' }} /><div style={{ fontSize: 13.5, color: c.textMuted }}>Fetching the latest board rate…</div></div>
              <div style={{ border: `1px dashed ${c.dashLine}`, borderRadius: 11, padding: '18px 20px', textAlign: 'center' }}><div style={{ fontSize: 14.5, fontWeight: 600, color: c.navy, marginBottom: 5 }}>No favourites yet</div><div style={{ fontSize: 13.5, lineHeight: 1.55, color: c.textFainter }}>Star a currency on the rate board to pin it here.</div></div>
            </div>
          </div>

          <div>
            <h2 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: 32, color: c.navy, margin: '0 0 24px' }}>Currency card &amp; form fields</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20, alignItems: 'start' }}>
              <div style={{ background: '#fff', border: `1px solid ${c.sandLine}`, borderRadius: 13, padding: 22 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: c.navy }}>USD<span style={{ color: c.textFainter, fontWeight: 400 }}> / INR</span></span>
                  <span style={{ fontSize: 16, color: c.gold }}>★</span>
                </div>
                <div style={{ display: 'flex', gap: 22 }}>
                  <div><div style={{ fontSize: 11.5, color: c.textFainter, marginBottom: 4 }}>Buy</div><div style={{ fontFamily: fonts.mono, fontSize: 17, color: c.navy }}>83.12</div></div>
                  <div><div style={{ fontSize: 11.5, color: c.textFainter, marginBottom: 4 }}>Sell</div><div style={{ fontFamily: fonts.mono, fontSize: 17, color: c.navy }}>84.06</div></div>
                  <div><div style={{ fontSize: 11.5, color: c.textFainter, marginBottom: 4 }}>24h</div><div style={{ fontFamily: fonts.mono, fontSize: 17, color: c.green }}>+0.18%</div></div>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: c.textMuted, marginBottom: 7 }}>Default field</label>
                <input placeholder="Placeholder text" style={{ width: '100%', border: `1px solid ${c.softLine}`, borderRadius: 9, padding: '13px 14px', fontSize: 14.5, outline: 'none', marginBottom: 16, color: c.navy }} />
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: c.textMuted, marginBottom: 7 }}>Error state</label>
                <input value="12,00,000" readOnly style={{ width: '100%', border: `1px solid ${c.errorField}`, borderRadius: 9, padding: '13px 14px', fontSize: 14.5, outline: 'none', color: c.navy }} />
                <div style={{ fontSize: 12.5, color: c.redText, marginTop: 7 }}>Exceeds the LRS annual limit for this financial year.</div>
              </div>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
