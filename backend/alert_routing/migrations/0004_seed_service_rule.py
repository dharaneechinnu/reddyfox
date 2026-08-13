from django.db import migrations

# The six service pop-ups all arrive as content.Lead.Kind.SERVICE. Defaults ON:
# this is the queue the desk exists to answer — someone has asked for a named
# service and left a number, which is exactly the lead worth paging a phone for.
# (Contrast 'enquiry', seeded OFF in 0002 because a general question is not.)
RULE = {'kind': 'service', 'kind_label': 'Service request', 'telegram_enabled': True}


def seed_rule(apps, schema_editor):
    LeadAlertRule = apps.get_model('alert_routing', 'LeadAlertRule')
    LeadAlertRule.objects.get_or_create(kind=RULE['kind'], defaults={
        'kind_label': RULE['kind_label'],
        'telegram_enabled': RULE['telegram_enabled'],
    })


def remove_rule(apps, schema_editor):
    LeadAlertRule = apps.get_model('alert_routing', 'LeadAlertRule')
    LeadAlertRule.objects.filter(kind=RULE['kind']).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('alert_routing', '0003_remove_rate_lock_rule'),
    ]

    operations = [
        migrations.RunPython(seed_rule, remove_rule),
    ]
