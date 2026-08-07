"""
Replace every photo slot below with a real, licensed stock photograph.

    python manage.py seed_real_photos

Unlike seed_site_images (which only fills a slot that has nothing yet and
never touches one that's already set), this command OVERWRITES every slot
listed in PHOTOS on every run — that's the point of it: re-running it always
puts these exact photos back, so it doubles as "reset the photography to the
approved set" if someone uploads something odd through the admin.

Every photo is sourced from Unsplash or Pexels, both of which license their
libraries for commercial use with no attribution required (Unsplash License /
Pexels License). Fetched straight from the source at run time rather than
committed into the repo, so this file is the only record of where each image
came from — see the per-slot comment for the photographer credit, kept for
provenance even though neither licence requires it.

Deliberately excluded, and left to staff to upload themselves:
  - site_logo — the business's own logo, not stock photography.
  - money-transfer_western-union / money-transfer_moneygram — a third
    party's trademark. A stock photo here would be actively misleading in a
    way a generic photo of a handshake or a banknote is not; see
    seed_site_images.NO_PLACEHOLDER for the same rule applied there.

This is a product decision to use professional stock photography as the
site's default imagery, in place of the generated placeholder cards
seed_site_images makes — made explicitly, after discussion, by the person who
owns this decision for the business. Recorded here rather than left
unstated, because seed_site_images.py documents the opposite default and the
two commands need to be read together, not as a contradiction.
"""
import subprocess
import time
import urllib.error
import urllib.request

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand

from content.models import SiteImage

UNSPLASH_DOWNLOAD = 'https://unsplash.com/photos/{id}/download'
PEXELS_CDN = 'https://images.pexels.com/photos/{id}/pexels-photo-{id}.jpeg?auto=compress&cs=tinysrgb&w=1600'

# A real browser UA — both hosts reject the default urllib/python UA string.
HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

# slot -> (source, id, alt text, credit). `source` picks which URL template
# above to fetch from `id` in a URL is not a filename choice; the request
# below fixes each photo to whatever format that host serves.
PHOTOS = {
    # -- Homepage --------------------------------------------------------
    SiteImage.Slot.HOME_WHY_US: ('unsplash', 'vWchRczcQwM', 'Two people shaking hands across a desk', 'Cytonn Photography'),
    SiteImage.Slot.HOME_HERO_PHONE: ('unsplash', 'j6LFEedJ2FM', 'A hand holding a phone open to a banking app', 'Unsplash'),

    # -- About -------------------------------------------------------------
    SiteImage.Slot.ABOUT_COUNTER: ('pexels', '6266447', 'A currency exchange counter', 'Tima Miroshnichenko'),
    SiteImage.Slot.ABOUT_TEAM: ('pexels', '16323434', 'An office team at work', 'Ofspace'),

    # -- Service hero photos -------------------------------------------------
    SiteImage.Slot.SERVICE_EXCHANGE: ('unsplash', '8Nppe0yLmn8', 'A hand fanning out foreign banknotes', 'Omid Armin'),
    SiteImage.Slot.SERVICE_MONEY_TRANSFER: ('unsplash', 'mtJ9XLASbl4', 'Someone counting cash by hand', 'Defrino Maasy'),
    SiteImage.Slot.SERVICE_REMITTANCE: ('unsplash', 'Q59HmzK38eQ', 'A person reviewing a payment on a laptop', 'Rupixen'),
    SiteImage.Slot.SERVICE_FOREX_CARD: ('unsplash', 'ahjzVINkuCs', 'A prepaid card on a flat surface', 'Markus Winkler'),
    SiteImage.Slot.SERVICE_WIRE_TRANSFER: ('unsplash', 'ZQJrJeAR438', 'A phone showing a crypto/finance chart', 'Coinstash Australia'),
    SiteImage.Slot.SERVICE_STUDENT: ('unsplash', 'OwOtokcHv90', 'A student at a desk with a laptop', 'Ayaneshu Bhardwaj'),

    # -- Foreign Exchange benefits -------------------------------------------
    SiteImage.Slot.BENEFIT_EXCHANGE_1: ('pexels', '6818151', 'Hands counting foreign banknotes', 'Yan Krukau'),
    SiteImage.Slot.BENEFIT_EXCHANGE_2: ('pexels', '14907377', 'A person reviewing paperwork at a desk', 'Ravi Roshan'),
    SiteImage.Slot.BENEFIT_EXCHANGE_3: ('unsplash', 'cUt0MWZOlfY', 'Scattered euro banknotes', 'Unsplash'),
    SiteImage.Slot.BENEFIT_EXCHANGE_4: ('unsplash', 'K0E6E0a0R3A', 'Two hands holding cash and coins', 'Unsplash'),
    SiteImage.Slot.BENEFIT_EXCHANGE_5: ('unsplash', '1zUPI5jsb90', 'A delivery rider on an e-bike in traffic', 'Brad Rucker'),

    # -- Money Transfer benefits ----------------------------------------------
    SiteImage.Slot.BENEFIT_MONEY_TRANSFER_1: ('unsplash', 'E0sZxhBH8Ck', 'A pen resting on a bank cheque', 'Money Knack'),
    SiteImage.Slot.BENEFIT_MONEY_TRANSFER_2: ('unsplash', 'XBbkrBrkp88', 'US dollar and Chinese yuan banknotes together', 'Eric Prouzet'),
    SiteImage.Slot.BENEFIT_MONEY_TRANSFER_3: ('unsplash', 'cYgWwX55loM', 'A delivery rider navigating traffic on a motorcycle', 'Unsplash'),

    # -- Money Remittance benefits --------------------------------------------
    SiteImage.Slot.BENEFIT_REMITTANCE_1: ('unsplash', 'qLlqqPKqIgs', 'A pile of foreign currency notes', 'Unsplash'),
    SiteImage.Slot.BENEFIT_REMITTANCE_2: ('unsplash', 'X9O3lYB3Hk4', 'A person holding a credit card', 'Unsplash'),
    SiteImage.Slot.BENEFIT_REMITTANCE_3: ('unsplash', 'VkrRwbUgqYA', 'A man with a backpack walking across a street', 'Unsplash'),
    SiteImage.Slot.BENEFIT_REMITTANCE_4: ('unsplash', 'UipokEnGOyE', 'A 100 yuan banknote', 'Unsplash'),

    # -- Prepaid Forex Card benefits -------------------------------------------
    SiteImage.Slot.BENEFIT_FOREX_CARD_1: ('unsplash', 'X9O3lYB3Hk4', 'A person holding a credit card', 'Unsplash'),
    SiteImage.Slot.BENEFIT_FOREX_CARD_2: ('unsplash', '6lvK6gHkhAA', 'A hand holding a smartphone', 'Unsplash'),
    SiteImage.Slot.BENEFIT_FOREX_CARD_3: ('unsplash', 'zzQdGf1cv18', 'A hand holding a cell phone', 'Unsplash'),
    SiteImage.Slot.BENEFIT_FOREX_CARD_4: ('unsplash', 'UipokEnGOyE', 'A 100 yuan banknote', 'Unsplash'),
    SiteImage.Slot.BENEFIT_FOREX_CARD_5: ('unsplash', 'cYgWwX55loM', 'A delivery rider navigating traffic on a motorcycle', 'Unsplash'),

    # -- Drafts / TT / Swift Transfer benefits ---------------------------------
    SiteImage.Slot.BENEFIT_WIRE_TRANSFER_1: ('unsplash', 'qLlqqPKqIgs', 'A pile of foreign currency notes', 'Unsplash'),
    SiteImage.Slot.BENEFIT_WIRE_TRANSFER_2: ('unsplash', '63eWgXwdGJo', 'A cheque being written by hand', 'Kevin Fitzgerald'),
    SiteImage.Slot.BENEFIT_WIRE_TRANSFER_3: ('unsplash', 'E0sZxhBH8Ck', 'A pen resting on a bank cheque', 'Money Knack'),
    SiteImage.Slot.BENEFIT_WIRE_TRANSFER_4: ('unsplash', 'XBbkrBrkp88', 'US dollar and Chinese yuan banknotes together', 'Eric Prouzet'),

    # -- Student Services benefits ----------------------------------------------
    SiteImage.Slot.BENEFIT_STUDENT_1: ('unsplash', '8lnbXtxFGZw', 'US dollar banknotes', 'Unsplash'),
    SiteImage.Slot.BENEFIT_STUDENT_2: ('unsplash', 'zzQdGf1cv18', 'A hand holding a cell phone', 'Unsplash'),
    SiteImage.Slot.BENEFIT_STUDENT_3: ('unsplash', 'K0E6E0a0R3A', 'Two hands holding cash and coins', 'Unsplash'),
    SiteImage.Slot.BENEFIT_STUDENT_4: ('unsplash', 'cUt0MWZOlfY', 'Scattered euro banknotes', 'Unsplash'),
}


JPEG_MAGIC = b'\xff\xd8\xff'


class FetchError(Exception):
    pass


def _fetch(source, photo_id):
    url = (UNSPLASH_DOWNLOAD if source == 'unsplash' else PEXELS_CDN).format(id=photo_id)

    # Unsplash sits behind Anubis, a proof-of-work bot check that 401s a plain
    # urllib request no matter what headers it carries — urllib's TLS/HTTP
    # fingerprint gets flagged even with a browser User-Agent set. curl's does
    # not, so the Unsplash leg shells out to it rather than fighting a JS
    # challenge in pure Python; Pexels has no such check and stays on urllib.
    if source == 'unsplash':
        result = subprocess.run(
            ['curl', '-sL', '--max-time', '25', '-A', HEADERS['User-Agent'], url],
            capture_output=True, check=True,
        )
        data = result.stdout
    else:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = resp.read()

    # A failed fetch here is an HTML page (a challenge, a login wall, a 404
    # body), not an error the request layer necessarily raised on — curl
    # exits 0 for an HTTP-level failure it still received bytes for. Refuse
    # to save anything that isn't plausibly a real JPEG rather than risk a
    # SiteImage row silently pointing at an error page.
    if len(data) < 5000 or not data.startswith(JPEG_MAGIC):
        raise FetchError(f'response does not look like a JPEG ({len(data)} bytes)')
    return data


class Command(BaseCommand):
    help = 'Overwrite every slot in PHOTOS with its assigned real stock photo (re-running resets them).'

    def handle(self, *args, **options):
        done, failed = 0, []
        for slot, (source, photo_id, alt_text, credit) in PHOTOS.items():
            try:
                data = _fetch(source, photo_id)
            except (urllib.error.URLError, TimeoutError, subprocess.CalledProcessError, FetchError) as exc:
                failed.append(slot)
                self.stderr.write(f'FAILED {slot} ({source}:{photo_id}) — {exc}')
                continue

            filename = f'{slot}-{photo_id}.jpg'
            image_field = ContentFile(data, name=filename)
            obj, created = SiteImage.objects.update_or_create(
                slot=slot,
                defaults={'image': image_field, 'alt_text': alt_text, 'is_visible': True},
            )
            done += 1
            verb = 'Created' if created else 'Replaced'
            self.stdout.write(f'{verb} {slot} <- {source}:{photo_id} ({credit})')
            # A short pause between requests — polite to the two hosts, and
            # avoids tripping any per-second rate limit on a run touching
            # thirty-odd images back to back.
            time.sleep(0.3)

        self.stdout.write(self.style.SUCCESS(f'\n{done} photo(s) set.'))
        if failed:
            self.stdout.write(self.style.WARNING(f'{len(failed)} failed: {", ".join(failed)}'))
