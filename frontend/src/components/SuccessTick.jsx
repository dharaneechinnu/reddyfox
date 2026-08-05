import { c } from '../tokens';

/**
 * The tick that plays when a lead has been saved.
 *
 * Drawn rather than dropped in: the ring sweeps round, then the check writes
 * itself, then a single ring expands outward and fades. That sequence is the
 * one place motion is spent on these forms, and it is doing a job — the
 * submission is the moment the customer stops being sure anything happened,
 * and a mark being made in front of them reads as "recorded" in a way a static
 * icon does not.
 *
 * Pure SVG stroke animation, no dependency and no raster asset, so it inherits
 * the themed success colour and stays sharp at any size. The whole sequence is
 * disabled under prefers-reduced-motion (see index.css) — the tick is then
 * simply there, fully drawn, which is the state that carries the meaning.
 */
export default function SuccessTick({ size = 78 }) {
  return (
    <span
      className="fx-tick"
      aria-hidden="true"
      style={{ position: 'relative', width: size, height: size, display: 'inline-flex', flex: 'none' }}
    >
      {/* The ring that expands past the badge and fades — one pulse, not a loop. */}
      <span
        className="fx-tick-ripple"
        style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `2px solid ${c.orange}` }}
      />
      <svg viewBox="0 0 52 52" width={size} height={size} style={{ position: 'relative', display: 'block' }}>
        {/* Indigo disc, white ring and mark. Green would be the obvious choice
            for "done", but this is the largest single piece of colour anywhere on
            the site and the palette has three — the drawing motion is what says
            "recorded" here, not the hue. */}
        <circle cx="26" cy="26" r="24" fill={c.orange} />
        <circle
          className="fx-tick-ring"
          cx="26" cy="26" r="24"
          fill="none" stroke={c.surface} strokeWidth="2"
          /* Starts at 12 o'clock so the sweep reads as a stroke of a pen, not a spinner. */
          transform="rotate(-90 26 26)"
        />
        <path
          className="fx-tick-check"
          d="M15 27.5 L22.5 35 L37.5 19"
          fill="none" stroke={c.surface} strokeWidth="3.4"
          strokeLinecap="round" strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
