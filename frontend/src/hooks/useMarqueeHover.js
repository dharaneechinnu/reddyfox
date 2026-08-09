import { useCallback, useEffect, useRef } from 'react';

/**
 * Eases a running marquee down to a crawl under the pointer, and back up when
 * it leaves — without the jump that doing this in CSS causes.
 *
 * WHY THIS IS NOT A CSS RULE. It used to be:
 *
 *   .fx-ticker-track          { animation: fx-ticker 38s linear infinite; }
 *   .fx-ticker-wrap:hover ... { animation-duration: 110s; }
 *
 * and it visibly glitched. A CSS animation's position is derived from elapsed
 * time divided by duration, so changing the duration on a running animation
 * re-derives the position rather than continuing from it. Three seconds into a
 * 38s loop the track is 7.9% along; the instant the duration becomes 110s that
 * same three seconds means 2.7% along, and the whole strip snaps backwards.
 * Then it snaps forwards again on mouse-out. The comment in index.css claimed
 * this "rescales its current position rather than jumping" — rescaling the
 * position IS the jump, and it gets worse the longer the page has been open,
 * because the discrepancy grows with elapsed time.
 *
 * The Web Animations API has no such problem: `playbackRate` changes how fast
 * `currentTime` advances from here on and leaves `currentTime` itself alone, so
 * the track carries on from exactly where it is and simply moves slower.
 *
 * On top of that the rate is *eased* over a fifth of a second rather than
 * switched. Snapping from full speed to a third of it in one frame has no
 * position jump but still reads as a jolt, because the velocity changes
 * instantly. Ramping it is the difference between the marquee noticing the
 * pointer and the marquee being yanked.
 *
 * Fails quiet: if getAnimations() isn't available, or reduced motion means
 * there is no animation running at all, every call here is a no-op and the
 * marquee behaves however CSS left it.
 */

const RAMP_MS = 200;
// Fast enough that a rate is still readable while it moves, slow enough that
// stopping to read one feels invited. Matches the old 38s -> ~110s intent.
const SLOW_RATE = 0.35;

// easeOutQuad — most of the change happens early, so the speed responds to the
// pointer immediately and then settles, rather than lagging behind it.
const ease = (t) => t * (2 - t);

export default function useMarqueeHover({ selector, slowRate = SLOW_RATE } = {}) {
  const ref = useRef(null);
  const frame = useRef(0);
  // The rate we are currently showing, tracked here rather than read back off
  // the animation: a ramp interrupted half way (pointer leaves before it has
  // finished slowing) has to start from where it actually got to, or the two
  // ramps fight and produce the jolt this exists to remove.
  const rate = useRef(1);

  const animations = useCallback(() => {
    const host = ref.current;
    if (!host) return [];
    const el = selector ? host.querySelector(selector) : host;
    if (!el || typeof el.getAnimations !== 'function') return [];
    return el.getAnimations();
  }, [selector]);

  const rampTo = useCallback((target) => {
    const running = animations();
    if (!running.length) return;

    cancelAnimationFrame(frame.current);
    const from = rate.current;
    if (from === target) return;
    const start = performance.now();

    const step = (now) => {
      const t = Math.min((now - start) / RAMP_MS, 1);
      const next = from + (target - from) * ease(t);
      rate.current = next;
      running.forEach((a) => {
        // updatePlaybackRate is the seamless form — it applies the new rate
        // without a discontinuity for an animation still settling. Older
        // engines only have the plain property, which is fine here: it also
        // preserves currentTime, which is the part that matters.
        if (typeof a.updatePlaybackRate === 'function') a.updatePlaybackRate(next);
        else a.playbackRate = next;
      });
      if (t < 1) frame.current = requestAnimationFrame(step);
    };

    frame.current = requestAnimationFrame(step);
  }, [animations]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return {
    ref,
    onMouseEnter: () => rampTo(slowRate),
    onMouseLeave: () => rampTo(1),
    // A pointer can leave the window without ever firing mouseleave on the
    // element (dragged out, tab switched), which would strand the marquee at a
    // crawl for the rest of the session.
    onPointerLeave: () => rampTo(1),
  };
}
