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
  accentOnInk: v('accent-on-ink'),
  serviceIconBg: v('brand-tint'),
  // The three step tiles on the indigo panel, in order. One hue, lifted further
  // off the panel at each step, each carrying the brand ink mark — see theme.css.
  stepTints: [v('brand-step-1'), v('brand-step-2'), v('brand-step-3')],
  onOrangeText: v('brand-pale'),
  brandPale: v('brand-pale'),

  // --- ink / dark panels -------------------------------------------------
  navy: v('ink'),
  /** The dark FILL for cards, table headers and bands. Derived from the brand,
   *  never from the ink — see --fx-ink-surface in theme.css for why. */
  inkSurface: v('ink-surface'),
  navyDeep: v('ink-deep'),
  navyLight: v('ink-light'),
  navyMid: v('ink-mid'),
  ink: v('ink-light'),

  // --- text on light -----------------------------------------------------
  text: v('body-text'),
  textMuted: v('muted-text'),
  textFaint: v('text-faint'),
  textFainter: v('text-fainter'),

  // --- ON THE PAGE GROUND ------------------------------------------------
  // The ground is the cream, so these are the dark end of the palette. Named
  // for WHERE they sit, not what colour they are: a component saying "the
  // heading colour on the page" survives the ground changing colour, and a
  // component saying c.surface does not — which is exactly what had to be
  // unpicked by hand when the site went from indigo back to cream. Anything
  // drawn directly on a section background belongs here; only the header, the
  // footer and dark ink cards use the on-ink family above.
  pageHeading: v('page-heading'),
  pageText: v('page-text'),
  pageMuted: v('page-muted'),
  pageEyebrow: v('page-eyebrow'),
  pageLine: v('page-line'),

  // --- text on the dark ink panels ---------------------------------------
  navyMuted: v('on-ink-faint'),
  navyMuted2: v('on-ink-dim'),
  onNavyText: v('on-ink'),
  onNavyText2: v('on-ink-strong'),
  onNavyText3: v('on-ink-mid'),
  onNavyText4: v('on-ink-dim'),
  onNavyLink: v('on-ink-link'),

  // --- hairlines and fills on a dark ground -------------------------------
  // Four rungs, by weight. Anything drawn over indigo or over a photo picks one
  // of these rather than inventing another rgba(255,255,255,…).
  navyLine: v('on-ink-line'),
  navyLineFaint: v('on-ink-line-faint'),
  navyLineStrong: v('on-ink-line-strong'),
  onInkFill: v('on-ink-fill'),
  onInkFillStrong: v('on-ink-fill-strong'),

  // --- overlays laid over something to darken it -------------------------
  wash: v('wash'),
  photoWash: v('photo-wash'),
  photoVeil: v('photo-veil'),
  scrim: v('scrim'),
  gridOnInk: v('grid-on-ink'),
  gridOnLight: v('grid-on-light'),

  // --- surfaces ----------------------------------------------------------
  /** Pure white. White TEXT, white buttons, a white rule — not a card fill. */
  surface: v('surface'),
  /**
   * The light card fill: an off-white, warmed toward the cream. This is what a
   * card is made of; `surface` is what white text is made of. Keeping them
   * separate is what let the cards come off flat white without also bleaching
   * every label that happens to be drawn in the same token.
   */
  cardBg: v('card'),
  /** One step deeper — a strip or footer nested inside a card. */
  cardBg2: v('card-2'),
  /** The ground a full-width section sits on. Indigo — see theme.css. */
  page: v('page'),
  /** A panel raised off that ground: the hero's step cards, the callback form. */
  panel: v('panel'),
  /** The same panel, brighter — a hover/nested-strip state, not a resting fill. */
  panelHover: v('panel-hover'),
  /** The dark information card, lifted further and edged in gold. */
  panelRaised: v('panel-raised'),
  /** That card's gold hairline. */
  panelLine: v('panel-line'),
  /** A full-width closing band, lifted toward the brand rather than away. */
  band: v('band'),
  /** The cream. Card fills and the tints inside them only, never a section. */
  sand: v('surface-alt'),
  cream: v('surface-2'),
  sandCard: v('surface-3'),
  sandCard2: v('surface-4'),
  swatch: v('surface-4'),
  swatch2: v('line-strong'),
  disabledBg: v('surface-4'),
  mapBg: v('surface-4'),

  // --- borders -----------------------------------------------------------
  /**
   * A card's hairline. Points at --fx-card-line, which is brand-tinted like
   * the card fill itself — NOT at the admin's `line`, which is a warm beige
   * and read as a different palette wrapped around a cool card. Every card
   * border on the site comes through this one name, so the two stay in step.
   */
  sandLine: v('card-line'),
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
  chipSuccess: v('chip-success'),

  // --- status: down / danger ---------------------------------------------
  red: v('danger'),
  redLight: v('danger-light'),
  redText: v('danger-text'),
  redBorder: v('brand-border'),
  redBg2: v('brand-bg'),
  /** An error summary's own fill on a dark panel — see theme.css. */
  redBgInk: v('danger-bg-ink'),
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

/**
 * Every drop shadow on the site, by what it sits under. Same rule as colour: a
 * shadow is how high something reads, so two cards at the same elevation must
 * name the same shadow rather than each carry its own hand-tuned blur.
 */
export const shadowCard = v('shadow-card');
export const shadowFloat = v('shadow-float');
export const shadowChip = v('shadow-chip');
export const shadowDialog = v('shadow-dialog');
export const shadowFab = v('shadow-fab');

/**
 * How far a scroll target must sit below the top of the window to clear the
 * sticky header. Spread onto anything a link or a script scrolls to — without
 * it the header lands on top of whatever the visitor just asked for.
 */
export const headerOffset = v('header-h');
export const scrollBelowHeader = { scrollMarginTop: `calc(${v('header-h')} + 24px)` };

export const wrap = { maxWidth: 1280, margin: '0 auto', padding: '0 clamp(16px,4.5vw,32px)' };

export const h2Style = {
  fontFamily: fonts.serif,
  fontWeight: 400,
  fontSize: fs.h2,
  lineHeight: 1.08,
  color: c.pageHeading,
  margin: 0,
};

/**
 * The card shape used across the site: off-white, hairline-bordered, no drop
 * shadow at rest. The fill is what does the work — it is lighter than the
 * indigo page ground, so a card reads as raised without a shadow saying so
 * (see theme.css). It is `c.cardBg` rather than pure white deliberately: on a
 * deep indigo field, flat white is the harshest pairing available and a grid of
 * them glares. Warming it keeps the separation and loses the glare.
 *
 * A translucent, backdrop-blurred version of this was tried and taken back
 * out: without a textured backdrop behind it (only the homepage hero's dotted
 * map has one), the blur has nothing to reveal and the fill just reads as a
 * flatter, washed-out version of this same colour — worse, not better.
 *
 * `lightCard` is the same shape for anything that needs the card ON a light
 * surface — nested inside another card, where the off-white would disappear.
 */
export const card = {
  background: c.cardBg,
  border: `1px solid ${c.sandLine}`,
  borderRadius: 10,
  overflow: 'hidden',
};

/**
 * The dark information card: "what happens next" on /quote, the shop-info block
 * on /contact. Lifted off the indigo ground and edged in gold — see
 * --fx-panel-raised in theme.css for why it is no longer filled with the ink.
 */
export const inkCard = {
  background: c.panelRaised,
  border: `1px solid ${c.panelLine}`,
  borderRadius: 16,
  padding: 32,
  color: c.surface,
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

const btnBase = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 9,
  padding: '15px 26px',
  borderRadius: 8,
  fontSize: fs.md,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background .18s ease',
  whiteSpace: 'nowrap',
};

/**
 * The primary action: white fill, indigo label.
 *
 * Every ground on this site is the indigo — the page, the header, the footer,
 * the dark cards — so "the primary button" and "the button on the dark panel"
 * are one thing, and `btnOnBrand` is kept as an alias rather than a second
 * definition that could drift from it. They only need to come apart if the
 * page ground ever stops being dark; if that happens, split them here rather
 * than overriding the fill at call sites.
 *
 */
export const btnPrimary = {
  ...btnBase,
  background: c.surface,
  color: c.orange,
};

export const btnPrimaryHover = c.brandPale;

export const btnOnBrand = btnPrimary;

/**
 * The quiet second action.
 *
 * `onInk` says which ground it is drawn on, and defaults to true because the
 * page ground is dark. The light variant is still correct inside a card.
 */
export const btnGhost = (onInk = true) => ({
  ...btnBase,
  border: `1px solid ${onInk ? c.navyLine : c.softLine}`,
  color: onInk ? c.surface : c.navy,
  background: 'transparent',
  transition: 'border-color .18s ease, background .18s ease',
});
