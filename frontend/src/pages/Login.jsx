import { c, fs, fonts } from '../tokens';
import Seo from '../components/Seo';

const fieldInput = { width: '100%', border: `1px solid ${c.softLine}`, borderRadius: 9, padding: 14, fontSize: fs.md, outline: 'none', marginBottom: 16, color: c.navy };

export default function Login() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(360px,100%),1fr))', minHeight: 720 }}>
      <Seo title="Client Portal Sign In" path="/login" noindex />
      <div style={{ background: c.band, padding: 'clamp(40px,8vw,80px) clamp(24px,6vw,56px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${c.gridOnInk} 1px,transparent 1px),linear-gradient(90deg,${c.gridOnInk} 1px,transparent 1px)`, backgroundSize: '64px 64px' }} />
        <div style={{ position: 'relative' }}>
          <p style={{ fontFamily: fonts.mono, fontWeight: 500, fontSize: fs.xs, lineHeight: 1.4, letterSpacing: '.16em', color: c.accent, margin: '0 0 22px' }}>CLIENT PORTAL</p>
          <h1 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: fs.h2, lineHeight: 1.1, color: c.surface, margin: '0 0 18px', maxWidth: 420 }}>Deal tickets, statements and forward positions</h1>
          <p style={{ fontSize: fs.lg, lineHeight: 1.65, color: c.onNavyText, margin: 0, maxWidth: 400 }}>Corporate clients track every contract, settlement and FIRC in one place.</p>
        </div>
        <div style={{ position: 'relative', display: 'flex', gap: 28, flexWrap: 'wrap', borderTop: `1px solid ${c.navyLine}`, paddingTop: 24 }}>
          <div><div style={{ fontFamily: fonts.mono, fontSize: fs['2xl'], color: c.surface }}>256-bit</div><div style={{ fontSize: fs.sm, color: c.onNavyText, marginTop: 4 }}>TLS encryption</div></div>
          <div><div style={{ fontFamily: fonts.mono, fontSize: fs['2xl'], color: c.surface }}>2FA</div><div style={{ fontSize: fs.sm, color: c.onNavyText, marginTop: 4 }}>On every login</div></div>
        </div>
      </div>
      <div style={{ background: c.page, padding: 'clamp(40px,8vw,80px) clamp(24px,6vw,56px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <h2 style={{ fontSize: fs['3xl'], fontWeight: 600, color: c.pageHeading, margin: '0 0 8px' }}>Sign in</h2>
          <p style={{ fontSize: fs.base, color: c.pageText, margin: '0 0 30px' }}>New to Reddy Forex? <span style={{ color: c.accent, fontWeight: 600, cursor: 'pointer' }}>Register a company account</span></p>
          <label style={{ display: 'block', fontSize: fs.sm, fontWeight: 500, color: c.pageText, marginBottom: 7 }}>Registered email</label>
          <input placeholder="name@company.com" style={fieldInput} />
          <label style={{ display: 'block', fontSize: fs.sm, fontWeight: 500, color: c.pageText, marginBottom: 7 }}>Password</label>
          <input type="password" placeholder="••••••••••" style={fieldInput} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 26 }}>
            <span style={{ display: 'flex', gap: 9, alignItems: 'center', fontSize: fs.base, color: c.pageText }}>
              <input type="checkbox" style={{ accentColor: c.orange }} />Keep me signed in
            </span>
            <span style={{ fontSize: fs.base, fontWeight: 600, color: c.accent, cursor: 'pointer' }}>Forgot password</span>
          </div>
          <span style={{ display: 'block', textAlign: 'center', background: c.surface, color: c.orange, padding: 15, borderRadius: 9, fontSize: fs.md, fontWeight: 600, cursor: 'pointer' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = c.brandPale)} onMouseLeave={(e) => (e.currentTarget.style.background = c.surface)}
          >Sign in</span>
          <p style={{ margin: '22px 0 0', fontSize: fs.sm, lineHeight: 1.6, color: c.pageMuted, textAlign: 'center' }}>Protected by two-factor authentication. Never share your OTP with anyone, including our staff.</p>
        </div>
      </div>
    </div>
  );
}
