import { useState } from 'react';
import { c, fs, fonts, stamp } from '../tokens';
import useApi from '../hooks/useApi';
import { fetchSiteImages, fetchSiteSettings } from '../api';
import { useCompanyInfo } from '../context/CompanyInfoContext';

// Module scope so useApi doesn't refetch on every render, and these share the
// requests every other component on the page already makes.
const loadSiteImages = () => fetchSiteImages();
const loadSiteSettings = () => fetchSiteSettings();

const CENTRE_SLOT = 'home_hero_phone';

/**
 * The three-phone fan on the homepage hero.
 *
 * These are marketing panels, not a product. Nothing is bought or priced on this
 * site — every deal is agreed on a phone call with a dealer, who decides the
 * rate — so the screens deliberately carry NO figures: no rates, no card
 * numbers, no balances. An early version showed the live board inside them and
 * that was wrong twice over: it implied the website quotes you, and a screenshot
 * of numbers invites someone to hold us to them.
 *
 * What they carry instead is what the business offers: the service list on the
 * left, how to ask in the middle, and the reasons to use it on the right — all
 * restating what is already published (see SERVICES and REASONS in data.js).
 *
 * In the fan the middle phone covers part of the outer two, so hovering — or
 * tapping, or tabbing to — any of them brings that one forward, straightens it
 * and shows it whole. That is why these are focusable and NOT aria-hidden: the
 * copy inside is real information about the service, so hiding it from a screen
 * reader to keep the markup tidy would be hiding the point.
 *
 * Staff can override the centre screen with a photo: Content → Site images →
 * "Homepage — hero phone screen". Portrait crops suit it; the frame is 9:19.
 */

// Widths, the overlap between phones and how far a picked one grows all live in
// index.css as custom properties on .fx-hero-phones, because they change with the
// viewport: all three stay on screen down to phone width, which only works if the
// whole fan scales. At desktop size the fan's height lands within a few pixels of
// the hero copy beside it, which is what gives the two columns one shared top and
// bottom edge — re-check that pairing if the desktop values change.

// --- the device -------------------------------------------------------------

function Phone({ children, variant, tilt, label, active, dimmed, baseZ, onActivate, onLeave, style }) {
  return (
    <div
      className={`fx-phone fx-phone--${variant}`}
      role="group"
      aria-label={label}
      tabIndex={0}
      onMouseEnter={onActivate}
      onMouseLeave={onLeave}
      onFocus={onActivate}
      onBlur={onLeave}
      onClick={onActivate}
      style={{
        flex: 'none',
        // Ink bezel rather than indigo, so the indigo inside the screen stays
        // the thing your eye lands on.
        background: c.navy,
        borderRadius: 30,
        padding: 8,
        cursor: 'pointer',
        // Brought forward it straightens, lifts and grows a little; the other two
        // sit back, so which one you asked for is unambiguous.
        transform: active
          ? 'rotate(0deg) translateY(-12px) scale(var(--fx-phone-grow))'
          : `rotate(${tilt}deg) scale(${dimmed ? 0.97 : 1})`,
        opacity: dimmed ? 0.62 : 1,
        boxShadow: active
          ? '0 44px 80px -18px rgba(0,0,0,.6)'
          : '0 34px 64px -22px rgba(0,0,0,.5)',
        ...style,
        // Last word on stacking: the raised phone has to sit above both others,
        // and a spread `style` would otherwise put its base value back.
        zIndex: active ? 6 : baseZ,
      }}
    >
      <div style={{ background: c.surface, borderRadius: 23, overflow: 'hidden', aspectRatio: '9 / 19', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
}

/** The indigo header every screen starts with. */
function ScreenHead({ label, title, statusBar, align }) {
  return (
    <div style={{ background: c.orange, color: c.surface, padding: statusBar ? '11px 15px 15px' : '15px', textAlign: align }}>
      {statusBar && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, fontFamily: fonts.mono, fontSize: fs['2xs'], color: c.accent }}>
          <span>9:41</span>
          <span aria-hidden="true" style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <span style={{ width: 16, height: 9, border: `1px solid ${c.accent}`, borderRadius: 2, padding: 1, display: 'block' }}>
              <span style={{ display: 'block', width: '100%', height: '100%', background: c.accent, borderRadius: 1 }} />
            </span>
            <span style={{ width: 2, height: 4, background: c.accent, borderRadius: '0 1px 1px 0', display: 'block' }} />
          </span>
        </div>
      )}
      <div style={{ ...stamp, fontSize: fs['2xs'], color: c.accent, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: fonts.serif, fontSize: fs['2xl'], lineHeight: 1.12 }}>{title}</div>
    </div>
  );
}

/** The dark strip a screen closes with. */
function ScreenFoot({ children, align }) {
  return (
    <div style={{ background: c.navy, color: c.onNavyText, padding: '12px 15px', fontSize: fs['2xs'], lineHeight: 1.5, textAlign: align }}>
      {children}
    </div>
  );
}

/**
 * One line in a list on a phone screen.
 *
 * The marker is the site's own dash, not an emoji. Emoji were how these lists
 * were specified, but they render as a different picture on every platform and
 * would be the only pictorial thing in a design otherwise built from type and
 * hairlines. `flip` runs the row right-to-left for the right-hand phone, whose
 * left edge sits under the centre one in the fan.
 */
function ScreenLine({ children, flip }) {
  return (
    <div style={{
      display: 'flex', flexDirection: flip ? 'row-reverse' : 'row', alignItems: 'baseline', gap: 9,
      padding: '9px 0', borderBottom: `1px solid ${c.sandLine3}`,
    }}>
      <span aria-hidden="true" style={{ color: c.orange, flex: 'none', fontFamily: fonts.mono, fontSize: fs['2xs'] }}>—</span>
      <span style={{ fontSize: fs['2xs'], color: c.text, lineHeight: 1.35, textAlign: flip ? 'right' : 'left' }}>{children}</span>
    </div>
  );
}

// --- the three screens ------------------------------------------------------

// The six services. Every one is a real service page — see SERVICES in data.js,
// which carries the fuller titles ("Money Remittance" there is this outward
// remittance, "Drafts / TT / Swift Transfer" is the TT line). Adding or dropping
// a service needs the same edit here.
const SERVICE_LINES = [
  'Foreign Currency Exchange',
  'Prepaid Forex Card',
  'Money Transfer',
  'Outward Remittance',
  'TT / SWIFT Transfer',
  'Student Services',
];

function ServicesScreen() {
  return (
    <>
      <ScreenHead label="What we do" title="Our Services" />
      <div style={{ padding: '10px 14px 4px', flex: 1 }}>
        {SERVICE_LINES.map((name) => <ScreenLine key={name}>{name}</ScreenLine>)}
      </div>
      <ScreenFoot>RBI compliant · Competitive rates · Home delivery</ScreenFoot>
    </>
  );
}

function AskScreen() {
  const { data: images } = useApi(loadSiteImages, {});
  const { primaryPhone } = useCompanyInfo();
  const image = images[CENTRE_SLOT];

  if (image) {
    return <img src={image.url} alt={image.alt_text} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />;
  }

  // The same three steps the "How it works" section spells out, so the phone and
  // the page never describe the process differently.
  const steps = ['Tell us what you need', 'We confirm the rate', 'Collect or get it delivered'];

  return (
    <>
      <ScreenHead statusBar label="Step one" title="Ask for today’s rate" />
      <div style={{ padding: '15px 15px 4px', flex: 1 }}>
        <p style={{ fontSize: fs['2xs'], lineHeight: 1.6, color: c.text, margin: '0 0 12px' }}>
          Tell us the currency and how much you need. A dealer calls you back with the rate — nothing is
          charged before you agree it.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 12 }}>
          {steps.map((step, i) => (
            <div
              key={step}
              style={{
                display: 'flex', alignItems: 'center', gap: 9, padding: '10px 11px', borderRadius: 7,
                background: i === 0 ? c.serviceIconBg : c.sand,
              }}
            >
              <span style={{ width: 18, height: 18, flex: 'none', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.mono, fontSize: '0.55rem', background: i === 0 ? c.orange : c.sandCard2, color: i === 0 ? c.surface : c.textMuted }}>
                {i + 1}
              </span>
              <span style={{ fontSize: fs['2xs'], color: i === 0 ? c.navy : c.textMuted, fontWeight: i === 0 ? 600 : 400 }}>{step}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: fs['2xs'], lineHeight: 1.5, color: c.textFaint, margin: 0 }}>
          No account. No online payment. No obligation.
        </p>
      </div>
      <div style={{ padding: '0 15px 15px' }}>
        <a
          href={`tel:${primaryPhone.tel}`}
          style={{ display: 'block', background: c.orange, color: c.surface, borderRadius: 8, padding: '11px 8px', textAlign: 'center' }}
        >
          <span style={{ fontSize: fs['2xs'], fontWeight: 600, display: 'block' }}>Call the counter</span>
          <span style={{ fontFamily: fonts.mono, fontSize: '0.65rem', color: c.accent, display: 'block', marginTop: 2 }}>{primaryPhone.display}</span>
        </a>
      </div>
    </>
  );
}

// Each line restates something the site already publishes: competitive rates and
// RBI compliance are in REASONS, same-day home delivery is on every service
// page, and the transfers run through banking partners. "Direct dealer support"
// is the plain description of how this business works — a dealer on the phone.
const WHY_LINES = [
  'Competitive exchange rates',
  'Same-day home delivery',
  'RBI compliant',
  'Trusted international transfers',
  'Direct dealer support',
  'Safe and secure transactions',
];

function WhyUsScreen() {
  const { data: site } = useApi(loadSiteSettings, null);
  const { primaryPhone } = useCompanyInfo();

  return (
    <>
      {/* Right-aligned: in the fan the centre phone covers this one's left edge,
          so its content hangs off the right rather than under the overlap. */}
      <ScreenHead align="right" label="Why us" title="Why Choose Us" />
      <div style={{ padding: '10px 14px 4px', flex: 1 }}>
        {WHY_LINES.map((line) => <ScreenLine key={line} flip>{line}</ScreenLine>)}
      </div>
      {/* Real links, not a picture of buttons: the whole point of this panel is
          that the next step is a person on the phone. */}
      <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 7 }}>
        <a
          href={`tel:${primaryPhone.tel}`}
          style={{ background: c.orange, color: c.surface, borderRadius: 7, padding: '10px 8px', textAlign: 'center', fontSize: fs['2xs'], fontWeight: 600 }}
        >
          Call dealer
        </a>
        {site?.whatsapp_enabled && site?.whatsapp_url && (
          <a
            href={site.whatsapp_url}
            target="_blank"
            rel="noreferrer noopener"
            style={{ background: c.whatsapp, color: c.surface, borderRadius: 7, padding: '10px 8px', textAlign: 'center', fontSize: fs['2xs'], fontWeight: 600 }}
          >
            WhatsApp dealer
          </a>
        )}
      </div>
    </>
  );
}

// --- the fan ----------------------------------------------------------------

const SCREENS = [
  { key: 'services', label: 'The services we offer', Screen: ServicesScreen, variant: 'outer', tilt: -8 },
  { key: 'ask', label: 'How to ask for today’s rate', Screen: AskScreen, variant: 'centre', tilt: 0 },
  { key: 'why', label: 'Why choose Reddy Forex', Screen: WhyUsScreen, variant: 'outer', tilt: 8 },
];

export default function HeroPhones() {
  const [active, setActive] = useState(null);

  return (
    <div className="fx-hero-phones">
      {SCREENS.map(({ key, label, Screen, variant, tilt }) => (
        <Phone
          key={key}
          label={label}
          variant={variant}
          tilt={tilt}
          active={active === key}
          dimmed={active !== null && active !== key}
          onActivate={() => setActive(key)}
          onLeave={() => setActive(null)}
          baseZ={tilt ? 1 : 3}
          style={{
            // The outer two pivot from their base so their bottom corners stay on
            // the shared baseline instead of swinging off it. The overlap itself is
            // a margin set in CSS, so it can shrink with the phones.
            transformOrigin: tilt ? 'bottom center' : 'center',
          }}
        >
          <Screen />
        </Phone>
      ))}
    </div>
  );
}
