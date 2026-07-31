from django.db import migrations

# Matches content.models.Lead.Kind exactly. Enquiry defaults OFF per an explicit decision: the
# general contact form generates too much Telegram noise relative to how actionable it is
# compared to a quote or a callback request. Every other kind defaults ON, unchanged from
# telegram_alerts' original all-kinds-alert behaviour.
RULES = [
    {'kind': 'enquiry', 'kind_label': 'Enquiry', 'telegram_enabled': False},
    {'kind': 'quote', 'kind_label': 'Quote request', 'telegram_enabled': True},
    {'kind': 'rate_lock', 'kind_label': 'Rate lock', 'telegram_enabled': True},
    {'kind': 'callback', 'kind_label': 'Callback request', 'telegram_enabled': True},
]


def seed_rules(apps, schema_editor):
    LeadAlertRule = apps.get_model('alert_routing', 'LeadAlertRule')
    for rule in RULES:
        LeadAlertRule.objects.get_or_create(kind=rule['kind'], defaults={
            'kind_label': rule['kind_label'],
            'telegram_enabled': rule['telegram_enabled'],
        })


def remove_rules(apps, schema_editor):
    LeadAlertRule = apps.get_model('alert_routing', 'LeadAlertRule')
    LeadAlertRule.objects.filter(kind__in=[r['kind'] for r in RULES]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('alert_routing', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_rules, remove_rules),
    ]
