from django.db import migrations

KIND = 'rate_lock'
KIND_LABEL = 'Rate lock'


def remove_rule(apps, schema_editor):
    LeadAlertRule = apps.get_model('alert_routing', 'LeadAlertRule')
    LeadAlertRule.objects.filter(kind=KIND).delete()


def restore_rule(apps, schema_editor):
    # Mirrors 0002_seed_rules' original value for this kind, in case this
    # migration is ever rolled back.
    LeadAlertRule = apps.get_model('alert_routing', 'LeadAlertRule')
    LeadAlertRule.objects.get_or_create(kind=KIND, defaults={
        'kind_label': KIND_LABEL,
        'telegram_enabled': True,
    })


class Migration(migrations.Migration):

    dependencies = [
        ('alert_routing', '0002_seed_rules'),
    ]

    operations = [
        migrations.RunPython(remove_rule, restore_rule),
    ]
