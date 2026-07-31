import { NavLink } from 'react-router-dom';
import { c } from '../tokens';
import { useFeatureFlag } from '../context/FeatureFlagsContext';

function HomeIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v9.5a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
    </svg>
  );
}
function RatesIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 19V10" /><path d="M10 19V5" /><path d="M16 19v-7" /><path d="M22 19h-20" />
    </svg>
  );
}
function ServicesIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function QuoteIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function ContactIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function TabLink({ to, label, Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      style={({ isActive }) => ({
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 3, flex: 1, padding: '9px 4px 8px', textDecoration: 'none',
        color: isActive ? c.orange : c.navyMuted2,
      })}
    >
      <Icon />
      <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '.01em' }}>{label}</span>
    </NavLink>
  );
}

/**
 * Fixed bottom tab bar shown only on small screens (see .fx-bottomnav in
 * index.css) — the mobile replacement for the desktop horizontal nav, which
 * doesn't fit / isn't touch-friendly at phone widths. Always rendered; CSS
 * media queries own visibility so there's no layout-measuring JS involved.
 */
export default function MobileBottomNav() {
  const ratesPageOn = useFeatureFlag('exchange_rates_page');

  return (
    <nav className="fx-bottomnav" aria-label="Primary">
      <TabLink to="/" label="Home" Icon={HomeIcon} end />
      {ratesPageOn && <TabLink to="/rates" label="Rates" Icon={RatesIcon} />}
      <TabLink to="/services" label="Services" Icon={ServicesIcon} />
      <TabLink to="/quote" label="Quote" Icon={QuoteIcon} />
      <TabLink to="/contact" label="Contact" Icon={ContactIcon} />
    </nav>
  );
}
