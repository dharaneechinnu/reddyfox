import { useEffect } from 'react';
import useApi from '../hooks/useApi';
import { fetchTheme } from '../api';

// Module scope so useApi doesn't refetch on every render.
const loadTheme = () => fetchTheme();

const FONT_LINK_ID = 'fx-fonts';

/**
 * Applies the staff-editable theme (Django admin -> Theme) on top of the
 * defaults compiled into theme.css.
 *
 * Writes the core custom properties straight onto :root as inline styles, which
 * outrank the stylesheet's :root block. Everything derived from them — every
 * tint, border shade and on-dark text colour, all defined as color-mix() of
 * these in theme.css — recomputes on its own, so this never has to know the
 * full token list.
 *
 * Fails open, the same rule feature_flags and CompanyInfoContext already
 * follow: if the request fails or hasn't landed yet, nothing is written and the
 * site renders in its compiled-in default theme. A themes-API hiccup can leave
 * the site looking last-season, never unstyled.
 */
export function ThemeProvider({ children }) {
  const { data } = useApi(loadTheme, null);

  useEffect(() => {
    if (!data?.css_variables) return;
    const root = document.documentElement;
    const applied = Object.entries(data.css_variables);
    for (const [name, value] of applied) root.style.setProperty(name, value);

    // Undo on unmount so a hot reload (or a test rendering this twice) can't
    // leave a half-applied theme behind.
    return () => { for (const [name] of applied) root.style.removeProperty(name); };
  }, [data]);

  useEffect(() => {
    // The webfont stylesheet is a <link> in index.html rather than an @import in
    // our CSS precisely so it can be repointed here: changing the font family
    // without also loading the font would silently fall back to a system face.
    if (typeof data?.fonts_url !== 'string') return;
    const link = document.getElementById(FONT_LINK_ID);
    if (link && link.getAttribute('href') !== data.fonts_url) {
      link.setAttribute('href', data.fonts_url);
    }
  }, [data]);

  return children;
}
