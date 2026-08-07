"""
Create a branded placeholder photo for every SiteImage slot that doesn't have
one yet, so a fresh install (or this repo's demo/staging environment) never
shows an empty page while waiting for staff to upload real photos.

These are deliberately NOT real photography — generated cards in the site's
own colours with the wordmark and a caption, so nobody mistakes one for an
actual photo of the shop or its staff (see the "never invent a fact" rule in
CLAUDE.md — the same discipline applies to imagery, not just copy). Once
staff upload a real photo for a slot through the admin, this command leaves
that slot alone; it never overwrites an existing row.

    python manage.py seed_site_images
"""
import io

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from PIL import Image, ImageDraw, ImageFont

from content.models import SiteImage
from theming.models import ThemeSetting

WIDTH, HEIGHT = 1600, 1000
STRIPE = 70

LOGO_SIZE = 512

# Short on-image captions — get_slot_display() is a good admin dropdown label
# ("Service page — Foreign Exchange") but too long/verbose to print on the
# card itself.
SHORT_CAPTION = {
    SiteImage.Slot.HOME_WHY_US: 'Why choose us',
    SiteImage.Slot.HOME_HERO_PHONE: 'On your phone',
    SiteImage.Slot.ABOUT_COUNTER: 'Our counter',
    SiteImage.Slot.ABOUT_TEAM: 'Our team',
}


def _short_caption(slot, label):
    if slot in SHORT_CAPTION:
        return SHORT_CAPTION[slot]
    return label.split('—')[-1].strip()  # 'Service page — Foreign Exchange' -> 'Foreign Exchange'


def _centered_text(draw, text, center_x, top_y, font, fill):
    left, top, right, bottom = draw.textbbox((0, 0), text, font=font)
    draw.text((center_x - (right - left) / 2, top_y), text, font=font, fill=fill)
    return bottom - top


def _generate_placeholder(caption, palette):
    navy, orange, sand, sand_line, muted = palette
    img = Image.new('RGB', (WIDTH, HEIGHT), sand)
    draw = ImageDraw.Draw(img)

    # Same diagonal-stripe motif as the CSS placeholder it replaces, so a
    # freshly-seeded site still looks like this design system, not a stock
    # photo library.
    for x in range(-HEIGHT, WIDTH + HEIGHT, STRIPE * 2):
        draw.polygon(
            [(x, 0), (x + STRIPE, 0), (x + STRIPE - HEIGHT, HEIGHT), (x - HEIGHT, HEIGHT)],
            fill=sand_line,
        )

    # The wordmark's diamond mark.
    cx, cy, r = WIDTH // 2, HEIGHT // 2 - 40, 44
    draw.polygon([(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)], fill=orange)

    eyebrow_font = ImageFont.load_default(size=26)
    caption_font = ImageFont.load_default(size=38)
    y = cy + r + 44
    y += _centered_text(draw, 'REDDY FOREX', cx, y, eyebrow_font, navy) + 18
    _centered_text(draw, caption.upper(), cx, y, caption_font, muted)

    return img


def _generate_logo(palette):
    """A square wordmark, transparent background, for the site_logo slot.

    Unlike the wide photo cards below, this is meant to sit directly in the
    header next to the nav — so it's square, transparent (no SAND fill), and
    small enough to still read at header height.
    """
    navy, orange, _sand, _sand_line, muted = palette
    img = Image.new('RGBA', (LOGO_SIZE, LOGO_SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    cx, cy, r = LOGO_SIZE // 2, LOGO_SIZE // 2 - 40, 70
    draw.polygon([(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)], fill=orange)

    wordmark_font = ImageFont.load_default(size=44)
    sub_font = ImageFont.load_default(size=20)
    y = cy + r + 30
    y += _centered_text(draw, 'REDDY FOREX', cx, y, wordmark_font, navy) + 10
    _centered_text(draw, 'PRIVATE LIMITED', cx, y, sub_font, muted)

    return img


# Slots for a third party's own trademarked logo (Western Union, MoneyGram) —
# unlike every other slot, a generated "REDDY FOREX" branded placeholder here
# would be actively misleading, not just a stand-in. Left unseeded; staff
# upload the official brand asset when they have one, and SitePhoto's plain
# swatch placeholder covers the gap until then.
NO_PLACEHOLDER = {
    SiteImage.Slot.MONEY_TRANSFER_WESTERN_UNION,
    SiteImage.Slot.MONEY_TRANSFER_MONEYGRAM,
}


class Command(BaseCommand):
    help = "Seed a branded placeholder photo for every SiteImage slot that doesn't have one yet."

    def handle(self, *args, **options):
        # The site's own colours, so a seeded placeholder always matches the current theme
        # rather than the palette that happened to be in fashion when this command was written.
        theme = ThemeSetting.load()
        palette = (theme.ink, theme.brand, theme.surface_alt, theme.line, theme.muted_text)

        created = 0
        for slot, label in SiteImage.Slot.choices:
            if slot in NO_PLACEHOLDER:
                self.stdout.write(f'Skipped {slot} — third-party logo, no placeholder generated.')
                continue
            if SiteImage.objects.filter(slot=slot).exists():
                self.stdout.write(f'Skipped {slot} — already has an image.')
                continue

            buf = io.BytesIO()
            if slot == SiteImage.Slot.SITE_LOGO:
                _generate_logo(palette).save(buf, format='PNG')
                filename = f'{slot}.png'
            else:
                _generate_placeholder(_short_caption(slot, label), palette).save(buf, format='JPEG', quality=88)
                filename = f'{slot}.jpg'
            SiteImage.objects.create(slot=slot, image=ContentFile(buf.getvalue(), name=filename))
            created += 1
            self.stdout.write(self.style.SUCCESS(f'Created placeholder for {slot}.'))

        self.stdout.write(self.style.SUCCESS(f'Done — {created} placeholder(s) created.'))
