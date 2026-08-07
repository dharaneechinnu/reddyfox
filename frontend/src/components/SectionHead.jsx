import { c, fs, fonts, stamp, h2Style } from '../tokens';
import Reveal from './Reveal';

/**
 * The heading block at the top of a section: a mono label, a hairline rule that
 * runs out to the edge of the column, then the heading itself.
 *
 * The rule is the structural device the page repeats — it marks where one
 * section starts, the way ruled lines separate blocks on a printed rate sheet.
 * `aside` puts supporting copy opposite the heading on wide screens and
 * underneath it on narrow ones.
 */
// `ink` is the default now that every section ground is indigo. `light` is kept
// for the one light surface left — the inside of a white card.
const TONES = {
  light: { label: c.orange, rule: c.sandLine, title: c.navy, aside: c.textMuted },
  ink: { label: c.accent, rule: c.navyLine, title: c.surface, aside: c.onNavyText },
};

export default function SectionHead({ label, title, aside, align = 'left', maxWidth = 620, tone = 'ink' }) {
  const centred = align === 'center';
  const t = TONES[tone] || TONES.light;
  return (
    <Reveal style={{ marginBottom: 'clamp(32px,4vw,48px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18, justifyContent: centred ? 'center' : 'flex-start' }}>
        <span style={{ ...stamp, color: t.label }}>{label}</span>
        <span aria-hidden="true" style={{ height: 1, background: t.rule, flex: centred ? '0 0 64px' : 1 }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 'clamp(24px,4vw,56px)', flexWrap: 'wrap' }}>
        <h2 style={{ ...h2Style, color: t.title, maxWidth, letterSpacing: '-.015em', textAlign: centred ? 'center' : 'left', marginInline: centred ? 'auto' : undefined }}>
          {title}
        </h2>
        {aside && (
          <p style={{ fontFamily: fonts.sans, fontSize: fs.lg, lineHeight: 1.62, color: t.aside, maxWidth: 400, margin: 0 }}>{aside}</p>
        )}
      </div>
    </Reveal>
  );
}
