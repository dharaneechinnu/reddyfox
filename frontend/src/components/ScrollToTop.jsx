import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Start every new page at the top.
 *
 * A browser does this for a normal page load, but a client-side route change
 * does not — the document never changes, so the scroll position simply stays
 * where it was. Following a link from low down a long page (the "Start with
 * step one" button on the homepage, or any service card) therefore landed the
 * visitor part-way down the next page, usually looking at the footer.
 *
 * Going back or forward is left alone: the browser has a remembered position
 * for those, and returning someone to the top of a page they are navigating
 * back to would lose their place.
 *
 * `behavior: 'instant'` on purpose. index.css sets `scroll-behavior: smooth`
 * for in-page anchors, which would otherwise animate a full-page scroll during
 * the route change and show the old page sliding past.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (navigationType === 'POP') return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, navigationType]);

  return null;
}
