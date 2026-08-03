import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { NAV, SERVICES, FOOTER_COLS } from '../data';
import { COMPANY } from '../company';
import { c, fonts, wrap } from '../tokens';
import { useFeatureFlag } from '../context/FeatureFlagsContext';
import { useCompanyInfo } from '../context/CompanyInfoContext';
import SocialIcon from './SocialIcon';
import WhatsAppButton from './WhatsAppButton';
import MobileBottomNav from './MobileBottomNav';

function TopBar() {
  const { contact, primaryPhone } = useCompanyInfo();
  return (
    <div style={{ background: c.navy, color: '#AEB8C9', fontSize: 12.5, letterSpacing: '.01em' }}>
      <div className="fx-topbar-inner" style={{ ...wrap, padding: '10px 32px', display: 'flex', flexWrap: 'wrap', gap: '8px 20px', alignItems: 'center', justifyContent: 'space-between', lineHeight: 1.5 }}>
        <div style={{ display: 'flex', gap: 22, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.green, display: 'inline-block', animation: 'fx-pulse 2.4s ease-in-out infinite' }} />
            {COMPANY.regulator}
          </span>
          <span className="fx-topbar-years" style={{ opacity: .45 }}>|</span>
          <span className="fx-topbar-years">{COMPANY.yearsExperience} years of experience</span>
        </div>
        <div style={{ display: 'flex', gap: 22, alignItems: 'center', flexWrap: 'wrap' }}>
          <a href={`tel:${primaryPhone.tel}`} style={{ color: '#E9EDF3' }}>{primaryPhone.display}</a>
          <span style={{ opacity: .45 }}>|</span>
          <a href={`mailto:${contact.email}`} style={{ color: '#E9EDF3' }}>{contact.email}</a>
        </div>
      </div>
    </div>
  );
}

function NavItem({ label, to, onEnter }) {
  const [hover, setHover] = useState(false);
  return (
    <NavLink
      to={to}
      style={{
        padding: '9px 13px', borderRadius: 7, fontSize: 14.5, fontWeight: 500,
        color: hover ? c.navy : c.navyMid, cursor: 'pointer', transition: 'background .18s,color .18s',
        whiteSpace: 'nowrap', background: hover ? c.sandCard : 'transparent', textDecoration: 'none',
      }}
      onPointerEnter={() => { setHover(true); onEnter && onEnter(); }}
      onPointerLeave={() => setHover(false)}
    >
      {label}
    </NavLink>
  );
}

function MegaMenu({ open, onClose }) {
  const navigate = useNavigate();
  const { contact } = useCompanyInfo();
  if (!open) return null;
  return (
    <div onMouseLeave={onClose} style={{ borderTop: `1px solid ${c.sandLine}`, background: '#fff', boxShadow: '0 22px 40px -24px rgba(11,27,51,.28)' }}>
      <div style={{ ...wrap, padding: '34px 32px 38px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 44 }}>
        <div>
          <p style={{ font: `500 11px/1.4 ${fonts.mono}`, letterSpacing: '.18em', textTransform: 'uppercase', color: c.orange, margin: '0 0 20px' }}>Our services</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(240px,100%),1fr))', gap: 6 }}>
            {SERVICES.map((s) => (
              <div
                key={s.id}
                onClick={() => { navigate(`/services/${s.id}`); onClose(); }}
                style={{ padding: '14px 16px', borderRadius: 10, cursor: 'pointer' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#F7F5F2')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ fontSize: 15, fontWeight: 600, color: c.navy, marginBottom: 4 }}>{s.title}</div>
                <div style={{ fontSize: 13, lineHeight: 1.5, color: c.textMuted }}>{s.short}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: c.navy, borderRadius: 14, padding: 26, color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <p style={{ font: `500 11px/1.4 ${fonts.mono}`, letterSpacing: '.18em', color: c.accent, margin: '0 0 12px' }}>CALL FOR A QUOTE</p>
            <p style={{ fontFamily: fonts.serif, fontSize: 26, lineHeight: 1.15, margin: '0 0 10px' }}>Talk to the counter</p>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, color: c.onNavyText, margin: 0 }}>Ring us for today’s rate on the currency you need, or to reserve notes for collection at our T. Nagar shop.</p>
          </div>
          <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {contact.mobiles.slice(0, 2).map((m) => (
              <a key={m.tel} href={`tel:${m.tel}`} style={{ fontFamily: fonts.mono, fontSize: 15, color: '#fff' }}>{m.display}</a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Header() {
  const [mega, setMega] = useState(false);
  const ratesPageOn = useFeatureFlag('exchange_rates_page');
  const nav = ratesPageOn ? NAV : NAV.filter(([, to]) => to !== '/rates');
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 60, background: 'rgba(255,255,255,.94)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${c.sandLine}` }}>
      <div style={{ ...wrap, padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 36 }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 11, cursor: 'pointer', flex: 'none', textDecoration: 'none' }}>
          <span style={{ width: 30, height: 30, background: c.orange, transform: 'rotate(45deg)', borderRadius: 6, display: 'block' }} />
          <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <span style={{ fontFamily: fonts.serif, fontSize: 21, letterSpacing: '.01em', color: c.navy }}>{COMPANY.wordmark}</span>
            <span style={{ fontFamily: fonts.mono, fontSize: 9.5, letterSpacing: '.24em', color: c.textFainter, marginTop: 4 }}>{COMPANY.wordmarkSub}</span>
          </span>
        </Link>

        <nav className="fx-nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, flexWrap: 'wrap' }}>
          {nav.map(([label, to]) => (
            <NavItem key={to} label={label} to={to} onEnter={() => setMega(to === '/services')} />
          ))}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 'none', marginLeft: 'auto' }}>
          {ratesPageOn && (
            <Link to="/rates" className="fx-header-rates-link" style={{ fontSize: 14.5, fontWeight: 500, color: c.navyMid, cursor: 'pointer', whiteSpace: 'nowrap' }}>Today's rates</Link>
          )}
          <Link
            to="/quote"
            style={{ background: c.orange, color: '#fff', padding: '12px 20px', borderRadius: 8, fontSize: 14.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background .18s,transform .18s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = c.orangeDark; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = c.orange; e.currentTarget.style.transform = 'none'; }}
          >
            Get a quote
          </Link>
        </div>
      </div>
      <MegaMenu open={mega} onClose={() => setMega(false)} />
    </div>
  );
}

function Footer() {
  const navigate = useNavigate();
  const { contact, socials, footer } = useCompanyInfo();
  return (
    <footer style={{ background: c.navyDeep, color: c.navyMuted2, padding: '76px 0 0' }}>
      <div style={wrap}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(200px,100%),1fr))', gap: 44, paddingBottom: 52, borderBottom: '1px solid rgba(255,255,255,.1)' }}>
          <div style={{ gridColumn: 'span 1', minWidth: 220 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 18 }}>
              <span style={{ width: 26, height: 26, background: c.orange, transform: 'rotate(45deg)', borderRadius: 5, display: 'block' }} />
              <span style={{ fontFamily: fonts.serif, fontSize: 20, color: '#fff' }}>{COMPANY.wordmark}</span>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.68, margin: '0 0 22px', maxWidth: 280 }}>
              {footer.tagline}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              {socials.map((s) => (
                <a
                  key={s.icon}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={`${COMPANY.shortName} on ${s.label}`}
                  title={s.label}
                  style={{ width: 36, height: 36, border: '1px solid rgba(255,255,255,.16)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.onNavyText3, transition: 'background .18s,border-color .18s,color .18s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.08)'; e.currentTarget.style.borderColor = c.orange; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.16)'; e.currentTarget.style.color = c.onNavyText3; }}
                >
                  <SocialIcon name={s.icon} />
                </a>
              ))}
            </div>
          </div>
          {FOOTER_COLS.map((col) => (
            <div key={col.title}>
              <div style={{ font: `500 11px/1.4 ${fonts.mono}`, letterSpacing: '.16em', color: '#fff', marginBottom: 20 }}>{col.title}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {col.links.map(([label, to]) => (
                  <span key={label} onClick={() => navigate(to)} style={{ fontSize: 14, color: c.onNavyText4, cursor: 'pointer' }}>{label}</span>
                ))}
              </div>
            </div>
          ))}
          <div>
            <div style={{ font: `500 11px/1.4 ${fonts.mono}`, letterSpacing: '.16em', color: '#fff', marginBottom: 20 }}>SHOP INFO</div>
            <p style={{ fontSize: 14, lineHeight: 1.68, margin: '0 0 14px' }}>
              {contact.addressLines.map((l) => <span key={l}>{l}<br /></span>)}
              {contact.addressNote}
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.9, margin: 0 }}>
              {contact.mobiles.map((m) => (
                <span key={m.tel}><a href={`tel:${m.tel}`} style={{ color: '#fff' }}>{m.display}</a><br /></span>
              ))}
              {contact.landlines.map((l) => (
                <span key={l.tel}><a href={`tel:${l.tel}`} style={{ color: c.onNavyText4 }}>{l.display}</a><br /></span>
              ))}
              <a href={`mailto:${contact.email}`}>{contact.email}</a>
            </p>
          </div>
        </div>
        <div style={{ padding: '26px 0 34px', display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', fontSize: 12.8 }}>
          <span>© {new Date().getFullYear()} {footer.legalName}. All rights reserved.</span>
          <div style={{ display: 'flex', gap: 24 }}>
            <Link to="/faq" style={{ cursor: 'pointer', color: c.onNavyText4 }}>FAQ</Link>
            <Link to="/contact" style={{ cursor: 'pointer', color: c.onNavyText4 }}>Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function Layout() {
  return (
    <div className="fx-page-shell" style={{ minHeight: '100vh', background: '#fff' }}>
      <TopBar />
      <Header />
      <Outlet />
      <Footer />
      <div className="fx-floating-actions" style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 70, display: 'flex', gap: 10, alignItems: 'center' }}>
        <WhatsAppButton />
      </div>
      <MobileBottomNav />
    </div>
  );
}
