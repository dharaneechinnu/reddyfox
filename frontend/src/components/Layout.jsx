import { useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { NAV, FOOTER_COLS } from '../data';
import { COMPANY } from '../company';
import { c, fs, fonts, wrap, stamp, btnOnBrand } from '../tokens';
import { useFeatureFlag } from '../context/FeatureFlagsContext';
import { useCompanyInfo } from '../context/CompanyInfoContext';
import useApi from '../hooks/useApi';
import { fetchSiteImages } from '../api';
import SocialIcon from './SocialIcon';
import WhatsAppButton from './WhatsAppButton';
import MobileBottomNav from './MobileBottomNav';
import OpenStatus, { HoursTable } from './OpenStatus';

// Module scope so useApi doesn't refetch this on every render — Header is
// mounted once per page via Layout.
const loadSiteImages = () => fetchSiteImages();

const LOGO_SLOT = 'site_logo';

// Every column heading in the footer, in one place: SERVICES, COMPANY,
// OPENING HOURS and the shop-info row all share it.
const footerHeading = { ...stamp, letterSpacing: '.16em', color: c.surface, marginBottom: 18 };

/**
 * The thin rail above the header: the licence, the counter's hours, the email.
 *
 * All three are standing facts about the shop. The live "Open now / Closed"
 * badge deliberately isn't here — it belongs next to the hours it qualifies, in
 * the hero and the footer, and a rail that changes through the day is a rail
 * people stop reading.
 */
function StatusRail() {
  const { contact, hours } = useCompanyInfo();
  return (
    <div style={{ background: c.orangeDark, color: c.onNavyText }}>
      <div
        className="fx-topbar-inner"
        style={{ ...wrap, padding: '8px clamp(16px,4.5vw,32px)', display: 'flex', flexWrap: 'wrap', gap: '4px 22px', alignItems: 'center', justifyContent: 'space-between', fontFamily: fonts.mono, fontSize: fs.sm, letterSpacing: '.06em', lineHeight: 1.5 }}
      >
        <span style={{ textTransform: 'uppercase', color: c.accent }}>
          {COMPANY.regulatorShort} <span aria-hidden="true" style={{ opacity: .5 }}>·</span> Since {COMPANY.since}
        </span>
        {/* The counter's hours, from the admin. The live Open now / Closed badge
            lives in the hero and the footer instead — the rail is a standing fact
            about the shop, not a clock. */}
        <span style={{ textTransform: 'uppercase', color: c.surface }}>
          {hours.weekday.labelShort} {hours.weekday.display}
        </span>
        <a href={`mailto:${contact.email}`} style={{ display: 'inline-block', padding: '3px 0', color: c.onNavyLink }}>{contact.email}</a>
      </div>
    </div>
  );
}

function NavItem({ label, to }) {
  return (
    <NavLink
      to={to}
      className="fx-navlink"
      style={({ isActive }) => ({
        padding: '6px 0', fontSize: fs.md, fontWeight: 500,
        color: isActive ? c.surface : c.onNavyText, textDecoration: 'none', whiteSpace: 'nowrap',
        transition: 'color .18s ease',
      })}
    >
      {label}
    </NavLink>
  );
}

// There is no hover dropdown on "Services". It opened a full-width panel over
// the page on nothing more than the pointer passing through, which is a lot of
// movement to trigger by accident — and it could never work on touch anyway, so
// the phone build already had to route people to /services. Everyone uses that
// same route now.

// The static /favicon.svg in index.html is the fallback for crawlers/browsers that grab it
// before any JS runs, and for as long as staff haven't uploaded a logo. Once the site_logo
// SiteImage loads, the tab icon should match the header logo rather than staying stuck on the
// old placeholder — same "the on-site upload wins as soon as it exists" rule as LogoMark below.
function useFaviconFromLogo(logo) {
  useEffect(() => {
    if (!logo) return;
    let el = document.head.querySelector('link[rel="icon"]');
    if (!el) {
      el = document.createElement('link');
      el.setAttribute('rel', 'icon');
      document.head.appendChild(el);
    }
    el.removeAttribute('type'); // the fallback declares image/svg+xml; an upload is JPEG/PNG/WebP
    el.setAttribute('href', logo.url);
  }, [logo]);
}

function LogoMark({ logo, size = 30 }) {
  if (logo) {
    return <img src={logo.url} alt={logo.alt_text} style={{ height: size + 14, width: 'auto', display: 'block' }} />;
  }
  return <span style={{ width: size, height: size, background: c.accent, transform: 'rotate(45deg)', borderRadius: 6, display: 'block' }} />;
}

function Header() {
  const ratesPageOn = useFeatureFlag('exchange_rates_page');
  const nav = ratesPageOn ? NAV : NAV.filter(([, to]) => to !== '/rates');
  const { data: images } = useApi(loadSiteImages, {});
  const { primaryPhone } = useCompanyInfo();
  const logo = images[LOGO_SLOT];
  useFaviconFromLogo(logo);
  return (
    // Indigo, not a light bar: the header now runs into the hero panel below it
    // as one field of colour, and stays indigo once cream sections scroll under
    // it so it doesn't change identity halfway down the page.
    <div style={{ position: 'sticky', top: 0, zIndex: 60, background: c.orange, borderBottom: `1px solid ${c.navyLine}` }}>
      <div style={{ ...wrap, padding: '16px clamp(16px,4.5vw,32px)', display: 'flex', alignItems: 'center', gap: 'clamp(20px,3vw,40px)' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'baseline', gap: 9, cursor: 'pointer', flex: 'none', textDecoration: 'none' }}>
          {logo && <LogoMark logo={logo} />}
          <span style={{ fontFamily: fonts.serif, fontSize: fs['3xl'], letterSpacing: '.01em', color: c.surface }}>{COMPANY.wordmark}</span>
          <span className="fx-wordmark-sub" style={{ fontFamily: fonts.mono, fontSize: fs['2xs'], letterSpacing: '.22em', color: c.accent }}>PVT LTD</span>
        </Link>

        <nav className="fx-nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: 'clamp(16px,2.2vw,28px)', flex: 1, justifyContent: 'center' }}>
          {nav.map(([label, to]) => (
            <NavItem key={to} label={label} to={to} />
          ))}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flex: 'none', marginLeft: 'auto' }}>
          {/* The phone number sits in the header as text, not behind an icon:
              a call is the outcome this whole site is built to produce. */}
          <a
            href={`tel:${primaryPhone.tel}`}
            className="fx-header-phone"
            style={{ fontFamily: fonts.mono, fontSize: fs.md, fontWeight: 500, color: c.surface, whiteSpace: 'nowrap' }}
          >
            {primaryPhone.display}
          </a>
          <Link
            to="/quote"
            className="fx-header-cta"
            style={btnOnBrand}
            onMouseEnter={(e) => { e.currentTarget.style.background = c.brandPale; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = c.surface; }}
          >
            Get a rate
          </Link>
        </div>
      </div>
    </div>
  );
}

function Footer() {
  const navigate = useNavigate();
  const { contact, socials, footer } = useCompanyInfo();
  const { data: images } = useApi(loadSiteImages, {});
  const logo = images[LOGO_SLOT];
  return (
    <footer style={{ background: c.orangeDark, color: c.navyMuted2, padding: 'clamp(52px,6vw,76px) 0 0' }}>
      <div style={wrap}>
        <div className="fx-footer-grid" style={{ display: 'grid', gap: 'clamp(28px,3.4vw,44px)', paddingBottom: 48, borderBottom: `1px solid ${c.navyLine}` }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 18 }}>
              {logo ? (
                <span style={{ background: c.surface, borderRadius: 6, padding: '4px 6px', display: 'flex', alignItems: 'center' }}>
                  <img src={logo.url} alt={logo.alt_text} style={{ height: 22, width: 'auto', display: 'block' }} />
                </span>
              ) : (
                <span style={{ width: 26, height: 26, background: c.orange, transform: 'rotate(45deg)', borderRadius: 5, display: 'block' }} />
              )}
              <span style={{ fontFamily: fonts.serif, fontSize: fs['2xl'], color: c.surface }}>{COMPANY.wordmark}</span>
            </div>
            <p style={{ fontSize: fs.base, lineHeight: 1.68, margin: '0 0 20px', maxWidth: 280 }}>
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
                  style={{ width: 36, height: 36, border: `1px solid ${c.navyLine}`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.onNavyText3, transition: 'background .18s,border-color .18s,color .18s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.08)'; e.currentTarget.style.borderColor = c.orange; e.currentTarget.style.color = c.surface; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = c.navyLine; e.currentTarget.style.color = c.onNavyText3; }}
                >
                  <SocialIcon name={s.icon} />
                </a>
              ))}
            </div>
          </div>
          {FOOTER_COLS.map((col) => (
            <div key={col.title}>
              <div style={footerHeading}>{col.title}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {col.links.map(([label, to]) => (
                  <span key={label} onClick={() => navigate(to)} style={{ fontSize: fs.base, color: c.onNavyText4, cursor: 'pointer' }}>{label}</span>
                ))}
              </div>
            </div>
          ))}

          {/* Opening hours in the footer as well as the header rail: this is
              where people look for them once they have scrolled past the top. */}
          <div>
            <div style={footerHeading}>OPENING HOURS</div>
            <HoursTable tone="ink" />
            <div style={{ marginTop: 14 }}>
              <OpenStatus tone="ink" />
            </div>
          </div>

          {/* Address, mobiles, landlines and email as four peer columns across the
              row, matching the columns above them. Stacking the three contact
              groups under one "CONTACT" heading left the right half of the footer
              empty and pushed the email a long way down the page. Any group with
              nothing in it drops out — staff can blank the optional mobiles and
              the landlines in the admin — and the rest close up. */}
          <div className="fx-footer-shop">
            <div className="fx-footer-shop-inner">
              <div>
                <div style={footerHeading}>SHOP INFO</div>
                <p style={{ fontSize: fs.base, lineHeight: 1.68, margin: 0 }}>
                  {contact.addressLines.map((l) => <span key={l}>{l}<br /></span>)}
                  {contact.addressNote}
                </p>
              </div>

              {[
                ['MOBILE', contact.mobiles, c.surface],
                ['LANDLINE', contact.landlines, c.onNavyText4],
              ].filter(([, numbers]) => numbers.length > 0).map(([groupLabel, numbers, tone]) => (
                <div key={groupLabel}>
                  <div style={footerHeading}>{groupLabel}</div>
                  {/* Block links rather than inline text split by <br>: each number
                      is its own row, so it should be a row-sized tap target. */}
                  <div style={{ display: 'flex', flexDirection: 'column', fontSize: fs.base }}>
                    {numbers.map((n) => (
                      <a key={n.tel} href={`tel:${n.tel}`} style={{ padding: '4px 0', fontFamily: fonts.mono, color: tone }}>{n.display}</a>
                    ))}
                  </div>
                </div>
              ))}

              {contact.email && (
                <div>
                  <div style={footerHeading}>EMAIL</div>
                  <a href={`mailto:${contact.email}`} style={{ display: 'inline-block', padding: '4px 0', fontSize: fs.base, color: c.surface, wordBreak: 'break-word' }}>{contact.email}</a>
                </div>
              )}
            </div>
          </div>
        </div>
        <div style={{ padding: '24px 0 32px', display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', fontSize: fs.sm }}>
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
    <div className="fx-page-shell" style={{ minHeight: '100vh', background: c.page }}>
      <StatusRail />
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
