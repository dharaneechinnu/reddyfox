from django.db import migrations

KEY = 'rate_lock_page'
NAME = 'Rate lock page'
DESCRIPTION = (
    'Controls the /lock-rate page, its "Lock a rate" homepage button, and the '
    '"Lock a rate" footer link. Off takes all three offline together — any link '
    'still pointing at /lock-rate lands on a "not available" message instead of '
    'a broken page. Defaults off: rate locking is a newer, higher-commitment '
    'flow than a quote or a callback, so it ships dark until the desk is ready '
    'to switch it on.'
)


def remove_flag(apps, schema_editor):
    FeatureFlag = apps.get_model('feature_flags', 'FeatureFlag')
    FeatureFlag.objects.filter(key=KEY).delete()


def restore_flag(apps, schema_editor):
    # Mirrors 0003_seed_rate_lock_page_flag's original value, in case this
    # migration is ever rolled back.
    FeatureFlag = apps.get_model('feature_flags', 'FeatureFlag')
    FeatureFlag.objects.get_or_create(key=KEY, defaults={
        'name': NAME,
        'description': DESCRIPTION,
        'is_enabled': False,
    })


class Migration(migrations.Migration):

    dependencies = [
        ('feature_flags', '0003_seed_rate_lock_page_flag'),
    ]

    operations = [
        migrations.RunPython(remove_flag, restore_flag),
    ]
