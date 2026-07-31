from django.db import migrations

FLAGS = [
    {
        'key': 'exchange_rates_page',
        'name': 'Exchange rates page',
        'description': (
            'Controls the /rates page, its main-nav link ("Exchange rates"), '
            'and the header "Today\'s rates" button. Off takes all three offline '
            'together — any link still pointing at /rates lands on a "not '
            'available" message instead of a broken page.'
        ),
    },
    {
        'key': 'live_board',
        'name': "Today's counter rates (homepage)",
        'description': (
            'Controls the "Today\'s counter rates" live board section on the '
            'homepage only. Independent of exchange_rates_page — the /rates '
            'page can stay up even if this is off, and vice versa.'
        ),
    },
]


def seed_flags(apps, schema_editor):
    FeatureFlag = apps.get_model('feature_flags', 'FeatureFlag')
    for flag in FLAGS:
        FeatureFlag.objects.get_or_create(key=flag['key'], defaults={
            'name': flag['name'],
            'description': flag['description'],
            'is_enabled': True,
        })


def remove_flags(apps, schema_editor):
    FeatureFlag = apps.get_model('feature_flags', 'FeatureFlag')
    FeatureFlag.objects.filter(key__in=[f['key'] for f in FLAGS]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('feature_flags', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_flags, remove_flags),
    ]
