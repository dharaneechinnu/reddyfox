"""
Seed testimonials and FAQs with the REAL content from reddyforex.com
(scraped July 2026 from index.html and faq.html).

Run with --replace to wipe existing rows first (use this to clear placeholder
content); without it, rows are matched on name/question and updated in place.
"""
from django.core.management.base import BaseCommand

from content.models import Faq, FaqCategory, Testimonial

# Verbatim from the testimonials carousel on reddyforex.com.
# NOTE: the live site shows "Harry Williams" twice with different quotes, and
# gives no role/location for any reviewer — reproduced faithfully here.
TESTIMONIALS = [
    (
        'Excellent and prompt service. Reasonable rates. I can whole heartedly recommend for your forex needs.',
        'Deborah Beck', '',
    ),
    (
        "Very good place to exchange foreign currency and good price also, all staff's are very friendly to us.",
        'Harry Williams', '',
    ),
    (
        'Very professional and customer experience focused agency. Got the best rate in the city and the MD himself took care of the customer experience.',
        'Harry Williams', '',
    ),
]

FAQ_CATEGORIES = ['Forex basics', 'Limits & rules', 'Payments', 'Travel cards']

# (question, answer, category) — verbatim from reddyforex.com/faq.html
FAQS = [
    (
        'What is Forex?',
        'Foreign exchange, or forex, is the conversion of home currency into foreign currency. '
        'It also means changing of one currency to another currency. Since we are in India, INR '
        'is the home currency and any other country currency is foreign currency.',
        'Forex basics',
    ),
    (
        'What is the legal limit of currency one person can carry from India?',
        'The legal limit to carry cash currency from India is 2,50,000 USD or its equivalent in '
        'one calendar year.\n\n'
        'The legal limit to carry cash currency from India is USD 3000 or its equivalent of any '
        'country currency per person per trip.',
        'Limits & rules',
    ),
    (
        'What is a Multicurrency Travel card / Forex card?',
        'A Multi-currency Travel Card / Forex card is a prepaid card in which you can load '
        'multiple currencies in one single card. The validity period of the card is 3 years '
        '(subject to the card that has been issued). The card is not valid in India, Nepal & Bhutan.',
        'Travel cards',
    ),
    (
        'How much foreign currency can be bought using cash payment?',
        'One can buy forex up to 49,999 INR through cash payment. Amounts higher than Rs 50,000 '
        'will have to be paid by crossed cheque, bank transfer (RTGS/NEFT) or demand draft.',
        'Payments',
    ),
    (
        'What are the modes of payment?',
        'As per RBI rules, cash transactions are limited up to INR 49,999. Amounts higher than '
        '50,000 need to be paid by cheque, demand draft (DD) or bank transfer (RTGS/NEFT).',
        'Payments',
    ),
    (
        'Can we en-cash the excess currency on the Multi Currency Travel card (MCTC)?',
        'Yes, you can en-cash the currency purchased through us. The rates are subject to the '
        'market rate on that particular day of exchange.',
        'Travel cards',
    ),
    (
        'Can I load multiple currencies in a Travel Card?',
        'Yes, you can load 15 currencies in your Multi Currency Travel card.',
        'Travel cards',
    ),
]


class Command(BaseCommand):
    help = 'Seed testimonials and FAQs with the real content from reddyforex.com'

    def add_arguments(self, parser):
        parser.add_argument(
            '--replace',
            action='store_true',
            help='Delete all existing testimonials, FAQs and FAQ categories first.',
        )

    def handle(self, *args, **options):
        if options['replace']:
            t, f, c = (
                Testimonial.objects.count(),
                Faq.objects.count(),
                FaqCategory.objects.count(),
            )
            Faq.objects.all().delete()
            FaqCategory.objects.all().delete()
            Testimonial.objects.all().delete()
            self.stdout.write(self.style.WARNING(
                f'Deleted {t} testimonials, {f} FAQs, {c} categories.'
            ))

        for order, (quote, name, role) in enumerate(TESTIMONIALS):
            _, created = Testimonial.objects.update_or_create(
                quote=quote,
                defaults={
                    'name': name,
                    'role': role,
                    'display_order': order,
                    'is_visible': True,
                },
            )
            self.stdout.write(f'{"Created" if created else "Updated"} testimonial: {name}')

        categories = {}
        for order, name in enumerate(FAQ_CATEGORIES):
            cat, _ = FaqCategory.objects.update_or_create(
                name=name, defaults={'display_order': order}
            )
            categories[name] = cat

        for order, (question, answer, cat_name) in enumerate(FAQS):
            _, created = Faq.objects.update_or_create(
                question=question,
                defaults={
                    'answer': answer,
                    'category': categories.get(cat_name),
                    'display_order': order,
                    'is_visible': True,
                    'show_on_homepage': True,
                },
            )
            self.stdout.write(f'{"Created" if created else "Updated"} FAQ: {question[:55]}')

        self.stdout.write(self.style.SUCCESS(
            f'Seeded {len(TESTIMONIALS)} testimonials, '
            f'{len(FAQ_CATEGORIES)} categories, {len(FAQS)} FAQs.'
        ))
