import { useEffect, useRef, useState } from 'react';

/**
 * Fades and lifts its children into place the first time they scroll into view.
 *
 * This is the site's one scroll animation. It reuses the hero's `.fx-rise`
 * keyframe rather than adding a second motion language, so a section arriving
 * on scroll moves exactly the way the hero moved on load — same distance, same
 * easing, same duration. `prefers-reduced-motion` already neutralises that
 * class in index.css, which is why there is no media query here.
 *
 * Deliberately one-way: once something has been seen it stays put. Replaying
 * on every pass turns a page into a slot machine, and re-animating content
 * someone has scrolled back to is actively annoying.
 *
 * One shared IntersectionObserver for every instance on the page, not one each.
 * A long page has dozens of these; dozens of observers each watching a single
 * element is the same work split into dozens of callbacks.
 *
 * Fails visible, never blank: with no IntersectionObserver — an old browser, a
 * crawler, a JS error before hydration — the content renders in its final
 * state immediately. An animation that fails should cost the animation, not
 * the page.
 *
 * The `fx-rise` class is dropped once the entrance animation finishes, not
 * left on permanently. `.fx-rise` uses `animation-fill-mode: both` so a
 * staggered element stays hidden through its delay and holds its landed
 * position afterwards — but "holds" is literal: a CSS animation's fill-mode
 * keeps controlling the properties it animates for as long as the animation
 * is still assigned, which blocks a `transition` on that same property from
 * ever running. Every card here also wants a hover lift on `transform` (see
 * .fx-hover-lift / .fx-hover-lift-panel in index.css), and with `fx-rise`
 * left in place that hover transition was silently dead — the animation was
 * still "holding" transform: none, forever, long after it had visibly
 * finished. Removing the class once `onAnimationEnd` fires hands transform
 * back to ordinary CSS so hover can move it.
 */

const REVEALED = new WeakMap();
let observer = null;

function watch(el, onReveal) {
  if (typeof IntersectionObserver === 'undefined') {
    onReveal();
    return () => {};
  }
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const cb = REVEALED.get(entry.target);
          if (cb) cb();
          REVEALED.delete(entry.target);
          observer.unobserve(entry.target);
        });
      },
      // A little way in, so something that has only just clipped the bottom of
      // the window is not already mid-animation when it appears.
      { rootMargin: '0px 0px -12% 0px', threshold: 0.05 },
    );
  }
  REVEALED.set(el, onReveal);
  observer.observe(el);
  return () => {
    REVEALED.delete(el);
    observer.unobserve(el);
  };
}

export default function Reveal({ children, delay = 0, style, className, ...rest }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  // Separate from `shown`: this is what actually drops the `fx-rise` class,
  // once the animation it drives has finished — see the note above.
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    // Already past it on load (a deep link, a restored scroll position): show
    // it rather than wait for a scroll that may never come.
    if (el.getBoundingClientRect().top < window.innerHeight) {
      setShown(true);
      return undefined;
    }
    return watch(el, () => setShown(true));
  }, []);

  return (
    <div
      ref={ref}
      className={[shown && !settled ? 'fx-rise' : '', className].filter(Boolean).join(' ') || undefined}
      style={{ '--fx-delay': `${delay}s`, opacity: shown ? undefined : 0, ...style }}
      // Reduced-motion users never fire this — index.css sets `animation: none`
      // on .fx-rise there, so there's nothing to end — but that's fine: with no
      // animation ever running, transform was never blocked for them either.
      onAnimationEnd={() => setSettled(true)}
      {...rest}
    >
      {children}
    </div>
  );
}
