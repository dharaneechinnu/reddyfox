"""The site's visual design tokens — colours, typefaces, type scale — in one editable row.

Deliberately a small, curated set of *semantic* knobs (brand, ink, surface, line…) rather than
one field per shade the design uses. The frontend derives its incidental shades — the pale
orange behind a service icon, the tint behind a success message, the muted text on a navy
panel — from these few in CSS via color-mix(), so changing `brand` here re-tints everything
that should follow it instead of leaving a dozen stale oranges behind. See
frontend/src/theme.css for those derivations and frontend/src/tokens.js for the names code
actually uses.

Same singleton pattern as content.SiteSetting and reference_rates.ReferenceRateSettings:
one row, pk pinned to 1, auto-created, never deleted.
"""
from django.core.validators import MaxValueValidator, MinValueValidator, RegexValidator
from django.db import models

# #RGB or #RRGGBB. Kept strict — these values are interpolated straight into a stylesheet, so
# "whatever the browser tolerates" is not the bar; a typo here should fail in the admin form,
# not silently produce an unstyled page.
HEX_COLOR = RegexValidator(
    r'^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$',
    'Enter a hex colour like #E2571F (or the 3-digit form, #E51).',
)

# A CSS font-family stack. Not a single name: the fallbacks matter, because a webfont that
# fails to load should land on something sane rather than Times New Roman.
FONT_STACK_HELP = (
    'A CSS font-family stack, most-preferred first, e.g. '
    "\"'Instrument Sans', system-ui, sans-serif\". Quote any family whose name has a space. "
    'If you name a Google font here, add it to the fonts URL below or the browser cannot load it.'
)

# The base size the type scale's reference pixel sizes were authored against. Not a setting:
# it's the denominator that makes `base_font_size` a scaling factor rather than an offset, so
# changing it would silently resize the whole site.
REFERENCE_BASE = 14.5


class ThemeSetting(models.Model):
    """Singleton — one row, auto-created, never deleted."""

    # --- core palette ----------------------------------------------------
    brand = models.CharField(
        max_length=7, default='#E2571F', validators=[HEX_COLOR],
        help_text='Primary accent: buttons, links, eyebrow labels, active underlines.',
    )
    brand_dark = models.CharField(
        max_length=7, default='#C4460F', validators=[HEX_COLOR],
        help_text='Hover/pressed state for anything using the brand colour. Should be a shade darker than it.',
    )
    accent = models.CharField(
        max_length=7, default='#F0A07A', validators=[HEX_COLOR],
        help_text='Lighter brand tone, used for eyebrow text on dark navy panels where the brand colour is too dim.',
    )
    ink = models.CharField(
        max_length=7, default='#0B1B33', validators=[HEX_COLOR],
        help_text='Headings, and the background of the dark page-hero sections.',
    )
    ink_deep = models.CharField(
        max_length=7, default='#08152A', validators=[HEX_COLOR],
        help_text='The footer background — a touch darker than the heading colour.',
    )
    surface = models.CharField(
        max_length=7, default='#FFFFFF', validators=[HEX_COLOR],
        help_text='Page background and card background.',
    )
    surface_alt = models.CharField(
        max_length=7, default='#F8F7F5', validators=[HEX_COLOR],
        help_text='The warm off-white used for alternating page sections and form fields.',
    )
    line = models.CharField(
        max_length=7, default='#E7E4DF', validators=[HEX_COLOR],
        help_text='Default border/divider colour on light backgrounds.',
    )
    body_text = models.CharField(
        max_length=7, default='#435066', validators=[HEX_COLOR],
        help_text='Paragraph text.',
    )
    muted_text = models.CharField(
        max_length=7, default='#6B7688', validators=[HEX_COLOR],
        help_text='Secondary text: captions, help text, card descriptions.',
    )
    success = models.CharField(
        max_length=7, default='#2FA36B', validators=[HEX_COLOR],
        help_text='Rate moved up, form submitted, WhatsApp panel.',
    )
    danger = models.CharField(
        max_length=7, default='#C0492C', validators=[HEX_COLOR],
        help_text='Rate moved down, validation errors.',
    )

    # --- typography ------------------------------------------------------
    font_sans = models.CharField(
        max_length=200, default="'Instrument Sans', system-ui, sans-serif", help_text=FONT_STACK_HELP,
        verbose_name='Body font stack',
    )
    font_serif = models.CharField(
        max_length=200, default="'Instrument Serif', serif", help_text=FONT_STACK_HELP,
        verbose_name='Heading font stack',
    )
    font_mono = models.CharField(
        max_length=200, default="'IBM Plex Mono', monospace", help_text=FONT_STACK_HELP,
        verbose_name='Mono font stack',
    )
    fonts_url = models.URLField(
        max_length=500, blank=True,
        default='https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700'
                '&family=Instrument+Serif:ital@0;1&family=IBM+Plex+Mono:wght@400;500&display=swap',
        verbose_name='Webfont stylesheet URL',
        help_text='Loaded before the page renders. Pick fonts at fonts.google.com, copy the URL out of its '
                  '"@import"/"link" snippet, and make sure every family named above appears in it. '
                  'Leave blank to use only fonts already installed on the visitor\'s device.',
    )

    # --- type scale ------------------------------------------------------
    # Two knobs, not ten independently-editable sizes: a scale whose steps are set by hand
    # drifts (this site had 27 distinct hardcoded sizes before this app, including 14.5, 14.6
    # and 14.8 all doing the same job).
    base_font_size = models.DecimalField(
        max_digits=4, decimal_places=1, default=14.5,
        validators=[MinValueValidator(10), MaxValueValidator(24)],
        help_text='Pixel size of standard UI text, and the anchor for every other size on the site — '
                  'raising it scales all text up proportionally. Between 10 and 24.',
    )
    heading_scale = models.DecimalField(
        max_digits=4, decimal_places=2, default=1.00,
        validators=[MinValueValidator(0.6), MaxValueValidator(2.0)],
        help_text='Extra multiplier applied to large headings only, on top of the base size. 1.0 keeps them in '
                  'their current proportion to body text; above 1.0 gives bigger, more magazine-like headings '
                  'without touching paragraphs or UI text; below 1.0 tones them down.',
    )

    # --- shape -----------------------------------------------------------
    radius = models.PositiveSmallIntegerField(
        default=14, validators=[MaxValueValidator(40)],
        help_text='Corner rounding on cards and panels, in pixels. 0 for square corners.',
    )

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'theme'
        verbose_name_plural = 'theme'

    def __str__(self):
        return 'Site theme'

    def save(self, *args, **kwargs):
        self.pk = 1  # enforce singleton
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        pass  # the single row is never deleted

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    # --- what the frontend actually consumes -----------------------------
    @property
    def css_variables(self):
        """The theme as a flat {css-custom-property: value} map.

        Only the tokens an admin can actually change. Everything derivable from them (tints,
        shades, on-dark text colours) is computed in the browser from these — see
        frontend/src/theme.css — so there is exactly one definition of "10% brand on white"
        and no colour-maths library is needed on this side.
        """
        # Every size is a fixed proportion of the base, expressed as the pixel size it had when
        # the scale was introduced. At the default base of 14.5 the factor is exactly 1 and the
        # scale reproduces the site's original sizes to the pixel; changing the base rescales
        # the whole set together.
        factor = float(self.base_font_size) / REFERENCE_BASE
        heading_factor = factor * float(self.heading_scale)

        def px(reference, scale=None):
            """Round to a half pixel — finer than that is invisible and just reproduces the
            14.6-vs-14.8 noise this scale exists to remove."""
            return f'{round(reference * (factor if scale is None else scale) * 2) / 2:g}px'

        return {
            '--fx-brand': self.brand,
            '--fx-brand-dark': self.brand_dark,
            '--fx-accent': self.accent,
            '--fx-ink': self.ink,
            '--fx-ink-deep': self.ink_deep,
            '--fx-surface': self.surface,
            '--fx-surface-alt': self.surface_alt,
            '--fx-line': self.line,
            '--fx-body-text': self.body_text,
            '--fx-muted-text': self.muted_text,
            '--fx-success': self.success,
            '--fx-danger': self.danger,

            '--fx-font-sans': self.font_sans,
            '--fx-font-serif': self.font_serif,
            '--fx-font-mono': self.font_mono,

            # Body and UI sizes.
            '--fx-text-2xs': px(10),
            '--fx-text-xs': px(11.5),
            '--fx-text-sm': px(12.5),
            '--fx-text-base': px(14.5),
            '--fx-text-md': px(15.5),
            '--fx-text-lg': px(16.5),
            '--fx-text-xl': px(18),
            '--fx-text-2xl': px(20),

            # Headings. These take the heading scale on top of the base, and stay fluid: the
            # clamp() bounds scale with the settings while the vw term keeps them responsive.
            '--fx-text-3xl': px(26, heading_factor),
            '--fx-text-h3': f'clamp({px(28, heading_factor)}, 3vw, {px(42, heading_factor)})',
            '--fx-text-h2': f'clamp({px(32, heading_factor)}, 3.4vw, {px(48, heading_factor)})',
            '--fx-text-h1': f'clamp({px(34, heading_factor)}, 4vw, {px(56, heading_factor)})',
            '--fx-text-hero': f'clamp({px(42, heading_factor)}, 4.6vw, {px(68, heading_factor)})',

            '--fx-radius': f'{self.radius}px',
        }
