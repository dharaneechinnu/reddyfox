import { c, fonts } from '../tokens';
import Seo from '../components/Seo';

const fieldInput = { width: '100%', border: `1px solid ${c.softLine}`, borderRadius: 9, padding: 14, fontSize: 15, outline: 'none', marginBottom: 16, color: c.navy };

export default function Login() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(360px,1fr))', minHeight: 720 }}>
      <Seo title="Client Portal Sign In" path="/login" noindex />
      <div style={{ background: c.navy, padding: 'clamp(40px,8vw,80px) clamp(24px,6vw,56px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px)', backgroundSize: '64px 64px' }} />
        <div style={{ position: 'relative' }}>
          <p style={{ font: `500 11px/1.4 ${fonts.mono}`, letterSpacing: '.16em', color: c.accent, margin: '0 0 22px' }}>CLIENT PORTAL</p>
          <h1 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: 'clamp(30px,3.4vw,46px)', lineHeight: 1.1, color: '#fff', margin: '0 0 18px', maxWidth: 420 }}>Deal tickets, statements and forward positions</h1>
          <p style={{ fontSize: 16, lineHeight: 1.65, color: c.onNavyText, margin: 0, maxWidth: 400 }}>Corporate clients track every contract, settlement and FIRC in one place.</p>
        </div>
        <div style={{ position: 'relative', display: 'flex', gap: 28, flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,.12)', paddingTop: 24 }}>
          <div><div style={{ fontFamily: fonts.mono, fontSize: 19, color: '#fff' }}>256-bit</div><div style={{ fontSize: 12.5, color: c.navyMuted2, marginTop: 4 }}>TLS encryption</div></div>
          <div><div style={{ fontFamily: fonts.mono, fontSize: 19, color: '#fff' }}>2FA</div><div style={{ fontSize: 12.5, color: c.navyMuted2, marginTop: 4 }}>On every login</div></div>
        </div>
      </div>
      <div style={{ background: '#fff', padding: 'clamp(40px,8vw,80px) clamp(24px,6vw,56px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <h2 style={{ fontSize: 26, fontWeight: 600, color: c.navy, margin: '0 0 8px' }}>Sign in</h2>
          <p style={{ fontSize: 14.5, color: c.textMuted, margin: '0 0 30px' }}>New to Reddy Forex? <span style={{ color: c.orange, fontWeight: 600, cursor: 'pointer' }}>Register a company account</span></p>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: c.textMuted, marginBottom: 7 }}>Registered email</label>
          <input placeholder="name@company.com" style={fieldInput} />
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: c.textMuted, marginBottom: 7 }}>Password</label>
          <input type="password" placeholder="••••••••••" style={fieldInput} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 26 }}>
            <span style={{ display: 'flex', gap: 9, alignItems: 'center', fontSize: 13.5, color: c.textMuted }}>
              <input type="checkbox" style={{ accentColor: c.orange }} />Keep me signed in
            </span>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: c.orange, cursor: 'pointer' }}>Forgot password</span>
          </div>
          <span style={{ display: 'block', textAlign: 'center', background: c.orange, color: '#fff', padding: 15, borderRadius: 9, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = c.orangeDark)} onMouseLeave={(e) => (e.currentTarget.style.background = c.orange)}
          >Sign in</span>
          <p style={{ margin: '22px 0 0', fontSize: 12.5, lineHeight: 1.6, color: c.textFainter, textAlign: 'center' }}>Protected by two-factor authentication. Never share your OTP with anyone, including our staff.</p>
        </div>
      </div>
    </div>
  );
}
