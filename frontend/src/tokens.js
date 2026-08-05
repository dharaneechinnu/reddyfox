/**
 * The names components use for colours, type sizes and shared style objects.
 *
 * Every value here points at a CSS custom property defined in theme.css — which
 * is where the actual colours and sizes live, and the only file to edit to
 * change how the site looks. Staff can override the core ones from the Django
 * admin at runtime (see context/ThemeContext.jsx); because these are `var()`
 * references rather than literals, that works without a rebuild and without
 * this file knowing anything about it.
 *
 * No fallbacks in the var() calls on purpose: theme.css is bundled into the
 * same stylesheet as everything else, so it cannot fail to load independently
 * of the code reading it, and a second copy of every hex here would be one more
 * thing to keep in step.
 *
 * Adding a colour: add the token to theme.css (derived from a core value if it
 * is a tint or shade of one), then name it here. Never put a hex in a component.
 */

const v = (name) => `var(--fx-${name})`;

export const c = {
  // --- brand -------------------------------------------------------------
  orange: v('brand'),
  orangeDark: v('brand-dark'),
  orangeDarker: v('brand-darker'),
  accent: v('accent'),
  serviceIconBg: v('brand-tint'),
  onOrangeText: v('brand-pale'),
  brandPale: v('brand-pale'),

  // --- ink / dark panels -------------------------------------------------
  navy: v('ink'),
  navyDeep: v('ink-deep'),
  navyLight: v('ink-light'),
  navyMid: v('ink-mid'),
  ink: v('ink-light'),

  // --- text on light -----------------------------------------------------
  text: v('body-text'),
  textMuted: v('muted-text'),
  textFaint: v('text-faint'),
  textFainter: v('text-fainter'),

  // --- text on the dark ink panels ---------------------------------------
  navyMuted: v('on-ink-faint'),
  navyMuted2: v('on-ink-dim'),
  onNavyText: v('on-ink'),
  onNavyText2: v('on-ink-strong'),
  onNavyText3: v('on-ink-mid'),
  onNavyText4: v('on-ink-dim'),
  onNavyLink: v('on-ink-link'),
  navyLine: v('on-ink-line'),

  // --- surfaces ----------------------------------------------------------
  surface: v('surface'),
  sand: v('surface-alt'),
  cream: v('surface-2'),
  sandCard: v('surface-3'),
  sandCard2: v('surface-4'),
  swatch: v('surface-4'),
  swatch2: v('line-strong'),
  disabledBg: v('surface-4'),
  mapBg: v('surface-4'),

  // --- borders -----------------------------------------------------------
  sandLine: v('line'),
  sandLine2: v('line-softer'),
  sandLine3: v('line-soft'),
  sandBorder: v('line-strong'),
  sandBorder3: v('line-strong'),
  sandBorder4: v('line-strong'),
  mapBorder: v('line-strong'),
  softLine: v('line-strongest'),

  // --- decorative / disabled ---------------------------------------------
  swatchText: v('swatch-text'),
  disabledText: v('disabled-text'),
  mapDot: v('swatch-text'),

  // --- status: up / success ----------------------------------------------
  green: v('success'),
  greenLight: v('success-light'),
  greenText: v('success-text'),
  greenText2: v('success-text-2'),
  greenBorder: v('success-border'),
  greenBg: v('success-bg'),
  greenBg2: v('success-bg-2'),

  // --- status: down / danger ---------------------------------------------
  red: v('danger'),
  redLight: v('danger-light'),
  redText: v('danger-text'),
  redBorder: v('brand-border'),
  redBg2: v('brand-bg'),
  errorField: v('danger-field'),

  // --- favourites --------------------------------------------------------
  gold: v('favourite'),
  goldOff: v('favourite-off'),

  // --- third-party brand colours (fixed, never themed) --------------------
  whatsapp: v('whatsapp'),
};

/**
 * The type scale — `fs` for font size, alongside `c` for colour.
 *
 * These are the only text sizes on the site. A size that is not on this list
 * does not belong in a component: before this existed there were 27 distinct
 * hardcoded values, including 14.5, 14.6 and 14.8 all doing the same job, and
 * ten near-identical clamp() expressions for four actual heading tiers.
 *
 * Every size is a fixed proportion of one base size set in the admin, so
 * changing that scales the whole site together and keeps it in proportion. The
 * heading tiers take a second multiplier of their own.
 */
export const fs = {
  // Body and UI — fixed sizes.
  '2xs': v('text-2xs'),  /* 10   — micro labels: PVT LTD, bottom-nav captions */
  xs: v('text-xs'),      /* 11.5 — eyebrows, mono labels, badges */
  sm: v('text-sm'),      /* 12.5 — captions, top bar, footnotes */
  base: v('text-base'),  /* 14.5 — UI text, card body, form labels */
  md: v('text-md'),      /* 15.5 — body copy, buttons, nav */
  lg: v('text-lg'),      /* 16.5 — lead paragraphs */
  xl: v('text-xl'),      /* 18   — card headings */
  '2xl': v('text-2xl'),  /* 20   — section subheadings */
  '3xl': v('text-3xl'),  /* 26   — large fixed headings */

  // Headings — fluid, and scaled by the admin's heading multiplier.
  h3: v('text-h3'),      /* sub-section heading */
  h2: v('text-h2'),      /* section heading */
  h1: v('text-h1'),      /* page heading */
  hero: v('text-hero'),  /* homepage hero only */
};

export const fonts = {
  serif: v('font-serif'),
  mono: v('font-mono'),
  sans: v('font-sans'),
};

export const radius = v('radius');
export const shadowCard = v('shadow-card');

export const wrap = { maxWidth: 1280, margin: '0 auto', padding: '0 clamp(16px,4.5vw,32px)' };
export const wrapNarrow = { maxWidth: 1000, margin: '0 auto', padding: '0 clamp(16px,4.5vw,32px)' };

export const eyebrow = {
  fontFamily: fonts.mono,
  fontWeight: 500,
  fontSize: fs.xs,
  lineHeight: 1.4,
  letterSpacing: '.18em',
  textTransform: 'uppercase',
  color: c.orange,
  margin: '0 0 14px',
};

export const h2Style = {
  fontFamily: fonts.serif,
  fontWeight: 400,
  fontSize: fs.h2,
  lineHeight: 1.08,
  color: c.navy,
  margin: 0,
};

/**
 * The card shape used across the site: white, hairline-bordered, no drop shadow.
 * The white is what does the work — it is lighter than the cream page ground, so
 * a card reads as raised without a shadow saying so (see theme.css). Cards do
 * not respond to hover; that was tried and taken back out.
 */
export const card = {
  background: c.surface,
  border: `1px solid ${c.sandLine}`,
  borderRadius: 10,
  overflow: 'hidden',
};

/** Vertical rhythm for a full-width section. One value, so sections can't drift. */
export const sectionY = { padding: 'clamp(58px,7vw,96px) 0' };

/**
 * The mono label that heads a section, sized and spaced like the print on a
 * currency band. Used with a rule beside it in the section headers.
 */
export const stamp = {
  fontFamily: fonts.mono,
  fontWeight: 500,
  fontSize: fs.xs,
  lineHeight: 1.4,
  letterSpacing: '.2em',
  textTransform: 'uppercase',
};

/**
 * The primary action: indigo, with white text.
 *
 * Indigo is the site's action colour — if it is indigo it does something — and
 * it carries white text at 11.7:1, so unlike the palettes this replaced the
 * accent and the button fill can be the same value. `btnPrimaryHover` is the
 * matching hover fill; use it rather than reaching for a shade of your own, so
 * every primary button on the site behaves identically.
 */
export const btnPrimary = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 9,
  background: c.orange,
  color: c.surface,
  padding: '15px 26px',
  borderRadius: 8,
  fontSize: fs.md,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background .18s ease',
  whiteSpace: 'nowrap',
};

export const btnPrimaryHover = c.orangeDark;

/**
 * The primary action when it sits ON the indigo panel — white fill, indigo
 * label. An indigo button on an indigo panel is not a button.
 */
export const btnOnBrand = {
  ...btnPrimary,
  background: c.surface,
  color: c.orange,
};

/** The quiet second action. On dark panels pass `onInk` for the right border. */
export const btnGhost = (onInk = false) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 9,
  border: `1px solid ${onInk ? c.navyLine : c.softLine}`,
  color: onInk ? c.surface : c.navy,
  background: 'transparent',
  padding: '15px 26px',
  borderRadius: 8,
  fontSize: fs.md,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'border-color .18s ease, background .18s ease',
  whiteSpace: 'nowrap',
});
