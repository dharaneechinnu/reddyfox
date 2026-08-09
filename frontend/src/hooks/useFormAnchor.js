import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Puts the visitor in front of the form when the form is what they clicked for.
 *
 * "Get a rate" in the header, "Request a quote" on a service page and every
 * "Contact us" button on the site exist to do exactly one thing: get a phone
 * number in front of a dealer (see docs/team-notifications.md). Each of them
 * used to land at the TOP of /quote or /contact — a breadcrumb, a heading and
 * a paragraph — with the form itself below the fold. So the visible result of
 * clicking "Get a rate" was the navbar, and the visitor had to work out for
 * themselves that they were meant to scroll.
 *
 * Two things had to be true to fix that, and this hook does both:
 *
 *  1. SCROLL PAST THE HEADER. The header is `position: sticky; top: 0`, so
 *     anything scrolled flush to the top of the window ends up underneath it.
 *     The offset comes from --fx-header-h (theme.css), the same value the
 *     service page's sticky sub-nav uses, so the two cannot drift apart. Read
 *     off the live computed style rather than hardcoded here, because the type
 *     scale — and therefore the header's height — is editable in the admin.
 *
 *  2. SAY THAT SOMETHING HAPPENED. A page that silently jumps reads as a bug.
 *     The form card gets `.fx-form-target` on arrival, which swells a gold ring
 *     around it and fades out (index.css), and the first field takes focus so
 *     the visitor can simply start typing.
 *
 * INTENT, NOT EVERY VISIT. This only fires when the URL says the visitor asked
 * for the form — a `#form` hash, or the `?service=` a service page attaches
 * when it sends someone over to enquire about that service. Someone who taps
 * "Contact" in the nav wants the address and the opening hours as much as the
 * form, and yanking them past both would be its own bug. The CTAs carry the
 * hash; the nav link deliberately does not.
 *
 * Returns props to spread onto the form's wrapper, plus `focusFirstField` for
 * anything that wants to trigger the same arrival by hand.
 */

export const FORM_ANCHOR = 'form';

const FALLBACK_HEADER_H = 86;
// Clear of the header, plus enough that the form's own heading is not jammed
// against it. Matches the `scrollBelowHeader` token in tokens.js.
const BREATHING_ROOM = 24;

/**
 * How far down the window a scroll target has to land to clear the header.
 *
 * Measured off the live header first, and only then falls back to the
 * --fx-header-h token. The header's height follows the type scale, which staff
 * can change from the admin (theming.ThemeSetting.base_font_size), so any fixed
 * number is right for exactly one setting — the token's own default was 73px
 * against a real header of 85.6px, which is precisely how the form ended up
 * tucked under the bar it was supposed to clear. The token stays as the
 * fallback and as the value CSS `scroll-margin-top` uses, where no measurement
 * is possible.
 */
function headerOffset() {
  if (typeof window === 'undefined') return FALLBACK_HEADER_H + BREATHING_ROOM;
  const header = document.querySelector('[data-fx-header]');
  if (header) return header.getBoundingClientRect().height + BREATHING_ROOM;
  const px = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fx-header-h'));
  return (Number.isFinite(px) ? px : FALLBACK_HEADER_H) + BREATHING_ROOM;
}

// Focusing an input on a phone throws the on-screen keyboard up over the page,
// which hides the very form we just scrolled to. Pointer devices get the focus;
// touch devices get the scroll and the ring and are left to tap for themselves.
function hasPointer() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function useFormAnchor({ anchor = FORM_ANCHOR } = {}) {
  const ref = useRef(null);
  const { hash, search } = useLocation();
  // Whether THIS arrival was one the visitor asked for. Read once per
  // navigation, below, and cleared as soon as the ring has finished.
  const [arriving, setArriving] = useState(false);

  const wanted = hash === `#${anchor}` || new URLSearchParams(search).has('service');

  useEffect(() => {
    const el = ref.current;
    if (!el || !wanted) return undefined;

    setArriving(true);

    // One frame's grace. ScrollToTop resets the window to the top on a route
    // change, and it is a sibling *above* the page in the tree, so its effect
    // has already run by the time this one does — but the layout it scrolled
    // may not have settled, and measuring a card mid-reflow gives the wrong
    // offset. rAF is also what lets the entrance animation start from a
    // sensible position rather than from wherever the previous page ended.
    const frame = requestAnimationFrame(() => {
      const top = el.getBoundingClientRect().top + window.scrollY - headerOffset();
      window.scrollTo({
        top: Math.max(top, 0),
        behavior: prefersReducedMotion() ? 'instant' : 'smooth',
      });

      if (!hasPointer()) return;
      // `preventScroll` matters: focusing an element scrolls it into view by
      // default, which would fight the smooth scroll above and land the field
      // hard against the header — undoing the offset this hook exists for.
      const first = el.querySelector('input:not([type="hidden"]):not([tabindex="-1"]), select, textarea');
      first?.focus({ preventScroll: true });
    });

    return () => cancelAnimationFrame(frame);
    // Re-runs when the visitor clicks a second CTA into the same page: the hash
    // is identical, so React Router gives a new location object with the same
    // values and the ring plays again, which is the right answer — the click
    // needs an acknowledgement whether or not the page had to move.
  }, [wanted, hash, search]);

  return {
    id: anchor,
    ref,
    // fx-form-panel is the entrance every visit gets; fx-form-target is the
    // gold ring, only on an arrival the visitor asked for. Both are dropped
    // once they finish — a CSS animation with fill-mode keeps holding the
    // properties it animated, which would leave the card's transform and
    // box-shadow permanently locked against anything else that wants them
    // (the same trap Reveal.jsx documents for .fx-rise).
    className: ['fx-form-panel', arriving ? 'fx-form-target' : ''].filter(Boolean).join(' '),
    onAnimationEnd: (e) => {
      if (e.animationName === 'fx-form-ring') setArriving(false);
    },
    style: { scrollMarginTop: `calc(var(--fx-header-h) + ${BREATHING_ROOM}px)` },
  };
}
