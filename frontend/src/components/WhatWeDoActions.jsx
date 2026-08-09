import { useNavigate } from 'react-router-dom';
import { c, fs, shadowChip } from '../tokens';
import SitePhoto from './SitePhoto';
import Reveal from './Reveal';

/**
 * The "What we do" homepage grid, as five full-bleed photo tiles rather than
 * the text-led mosaic this replaced — five everyday reasons someone opens
 * this site, not six formal service categories. The fuller service list
 * (including Money Transfer and Wire Transfer, which don't get a tile here)
 * still exists in full on /services; this is a teaser, not the index.
 *
 * Each tile maps to a real service and a real photo already in SiteImage —
 * no new photography, no invented action. Two tiles point at the same
 * service ('exchange'): buying and encashing foreign currency are the two
 * directions of the one licensed activity ("Buy and sell" is literally the
 * first published benefit of Foreign Exchange, and its own copy already
 * mentions "encashment of unused foreign currency after your trip" — see
 * SERVICES in data.js), so two entry points into the same page is accurate,
 * not two different claims.
 */
const ACTIONS = [
  { title: 'Buy Forex', serviceId: 'exchange', photoSlot: 'service_exchange' },
  { title: 'Send Money Abroad', serviceId: 'remittance', split: true },
  { title: 'Reload Forex Card', serviceId: 'forex-card', photoSlot: 'service_forex-card' },
  { title: 'Study Abroad', serviceId: 'student-services', photoSlot: 'service_student-services' },
  { title: 'Encash Unused Forex', serviceId: 'exchange', photoSlot: 'benefit_exchange-4' },
];

function IconArrow() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12.5 9.5 18 20 6" />
    </svg>
  );
}

// The check-mark pill that sits over a photo. Used for both halves of the
// "Send Money Abroad" split tile — a generic currency symbol, not a specific
// figure, illustrating the send-in-one/receive-in-another shape of a transfer
// rather than asserting any particular transaction.
function StatusChip({ symbol, label, style }) {
  return (
    <span
      style={{
        position: 'absolute', display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 12px 6px 8px', borderRadius: 100,
        background: c.chipSuccess, boxShadow: shadowChip,
        fontSize: fs['2xs'], fontWeight: 600, color: c.surface, whiteSpace: 'nowrap',
        ...style,
      }}
    >
      <span style={{ width: 15, height: 15, borderRadius: '50%', background: c.onInkFill, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <IconCheck />
      </span>
      {symbol} {label}
    </span>
  );
}

// Title + arrow header, shared by every tile shape — laid over the photo
// rather than in flow, so the photo runs the tile's full height.
function TileHeader({ title }) {
  return (
    <>
      <div aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '46%', background: c.photoVeil, pointerEvents: 'none' }} />
      <h3 style={{ position: 'relative', margin: 0, padding: '20px 50px 0 18px', fontSize: fs.lg, fontWeight: 700, color: c.surface, lineHeight: 1.2, letterSpacing: '-.01em' }}>
        {title}
      </h3>
      <span
        className="fx-action-arrow"
        aria-hidden="true"
        style={{
          position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: '50%',
          background: c.onInkFill, border: `1px solid ${c.onInkFillStrong}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.surface,
          transition: 'background .25s ease, transform .25s ease',
        }}
      >
        <IconArrow />
      </span>
    </>
  );
}

export default function WhatWeDoActions() {
  const navigate = useNavigate();

  return (
    <div className="fx-action-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14 }}>
      {ACTIONS.map((a, i) => (
        <Reveal
          key={a.title}
          delay={i * 0.06}
          className="fx-action-card fx-hover-lift"
          onClick={() => navigate(`/services/${a.serviceId}`)}
          onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/services/${a.serviceId}`); }}
          role="link"
          tabIndex={0}
          style={{
            position: 'relative', aspectRatio: '.62', borderRadius: 18, overflow: 'hidden',
            cursor: 'pointer', background: c.panel, border: `1px solid ${c.navyLine}`,
          }}
        >
          {a.split ? (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
                <SitePhoto
                  slot="service_remittance"
                  placeholderLabel="SEND"
                  style={{ position: 'absolute', inset: 0, border: 'none', borderRadius: 0 }}
                  imgClassName="fx-photo-zoom"
                />
                <StatusChip symbol="₹" label="Sent" style={{ bottom: 12, right: 12 }} />
              </div>
              <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
                <SitePhoto
                  slot="home_hero_phone"
                  placeholderLabel="RECEIVE"
                  style={{ position: 'absolute', inset: 0, border: 'none', borderRadius: 0 }}
                  imgClassName="fx-photo-zoom"
                />
                <StatusChip symbol="$" label="Received" style={{ bottom: 12, right: 12 }} />
              </div>
            </div>
          ) : (
            <SitePhoto
              slot={a.photoSlot}
              placeholderLabel={a.title.toUpperCase()}
              style={{ position: 'absolute', inset: 0, border: 'none', borderRadius: 0 }}
              imgClassName="fx-photo-zoom"
            />
          )}

          <TileHeader title={a.title} />
        </Reveal>
      ))}
    </div>
  );
}
