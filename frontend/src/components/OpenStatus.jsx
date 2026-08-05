import { c, fs, fonts } from '../tokens';
import { useCompanyInfo } from '../context/CompanyInfoContext';
import useOpenStatus, { clockLabel } from '../hooks/useOpenStatus';

/**
 * The shop-sign device: whether the T. Nagar counter is open at this moment,
 * and when it next changes.
 *
 * This is a walk-in counter with no online checkout, so "can I go there now?"
 * is the question the site exists to answer before the phone call. It appears
 * in the header rail, the hero, the "Visit the counter" block and the footer —
 * one recurring element rather than four different phrasings of the hours.
 *
 * Closed is styled muted, not red: a shut shop on a Sunday evening is normal,
 * not a fault, and the danger colour is reserved for things the visitor needs
 * to fix (see FormBits.jsx).
 */

// Open is indigo, closed is grey. Not green/red: the words "Open now" /
// "Closed" already carry the meaning, and the dot is there to draw the eye and
// show it is live.
const TONES = {
  // On the dark ink panels — the header rail and the hero board.
  ink: { text: c.onNavyText2, detail: c.onNavyText, openDot: c.accent, closedDot: c.navyMuted2 },
  // On the light page surfaces — the Visit block and the Contact page.
  light: { text: c.navy, detail: c.textMuted, openDot: c.orange, closedDot: c.textFainter },
};

export default function OpenStatus({ tone = 'light', showDetail = true }) {
  const { hours } = useCompanyInfo();
  const status = useOpenStatus(hours);
  const t = TONES[tone] || TONES.light;

  // Until the hours are known, render nothing rather than guessing at "Closed" —
  // wrongly telling someone the shop is shut costs a walk-in.
  if (!status.known) return null;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8, whiteSpace: 'nowrap' }}>
      {/* Only the open state breathes: a pulsing dot means "live right now". */}
      <span
        aria-hidden="true"
        className={status.open ? 'fx-dot-pulse' : undefined}
        style={{
          width: 7, height: 7, borderRadius: '50%', flex: 'none', transform: 'translateY(-1px)',
          background: status.open ? t.openDot : t.closedDot,
        }}
      />
      <span style={{ fontFamily: fonts.mono, fontWeight: 500, fontSize: fs.xs, letterSpacing: '.14em', textTransform: 'uppercase', color: t.text }}>
        {status.label}
      </span>
      {showDetail && status.detail && (
        <span style={{ fontSize: fs.sm, color: t.detail }}>{status.detail}</span>
      )}
    </span>
  );
}

/**
 * The published hours as a two-row table, with today's row marked.
 *
 * Highlighting today is the whole point of showing a table rather than a
 * sentence: it turns "which line applies to me?" into something the reader
 * doesn't have to work out.
 */
export function HoursTable({ tone = 'light' }) {
  const { hours } = useCompanyInfo();
  const isSunday = new Date().getDay() === 0;
  const onInk = tone === 'ink';

  const rows = [
    { ...hours.weekday, today: !isSunday },
    { ...hours.sunday, today: isSunday },
  ];

  return (
    <div>
      {rows.map((row) => (
        <div
          key={row.label}
          style={{
            display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'baseline',
            padding: '11px 0',
            borderBottom: `1px solid ${onInk ? c.navyLine : c.sandLine3}`,
          }}
        >
          <span style={{ fontSize: fs.base, fontWeight: row.today ? 600 : 400, color: onInk ? (row.today ? c.surface : c.onNavyText) : (row.today ? c.navy : c.textMuted) }}>
            {row.label}
            {row.today && (
              <span style={{ fontFamily: fonts.mono, fontSize: fs['2xs'], letterSpacing: '.14em', color: c.orange, marginLeft: 9 }}>TODAY</span>
            )}
          </span>
          <span style={{ fontFamily: fonts.mono, fontSize: fs.base, color: row.closed ? (onInk ? c.navyMuted2 : c.textFainter) : (onInk ? c.surface : c.navy) }}>
            {row.closed ? 'Closed' : `${clockLabel(row.opens)} – ${clockLabel(row.closes)}`}
          </span>
        </div>
      ))}
      {hours.note && (
        <p style={{ fontSize: fs.sm, lineHeight: 1.55, color: onInk ? c.onNavyText : c.textFaint, margin: '12px 0 0' }}>{hours.note}</p>
      )}
    </div>
  );
}
