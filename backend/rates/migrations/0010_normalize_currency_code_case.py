from django.db import migrations


def _normalize_case(apps, schema_editor):
    """Uppercase any currency code that isn't already — a lowercase code (e.g. a staff typo
    like 'usd' instead of 'USD') silently fails every uppercase-normalized lookup
    (validate_currency_code, the API's code= retrieve) even though the row exists and is
    visible. See Currency.save(), which now prevents new rows from doing this.

    Where both cases exist for the same (code, rate_type) — a real duplicate — keep whichever
    row is visible (or, if both/neither are, whichever has a non-zero sell_rate) and drop the
    other, rather than raising a unique_together conflict on the rename.
    """
    Currency = apps.get_model('rates', 'Currency')

    for row in list(Currency.objects.all()):
        upper = row.code.upper()
        if upper == row.code:
            continue

        conflict = Currency.objects.filter(code=upper, rate_type=row.rate_type).exclude(pk=row.pk).first()
        if conflict is None:
            Currency.objects.filter(pk=row.pk).update(code=upper)
            continue

        keep, drop = conflict, row
        if row.is_visible and not conflict.is_visible:
            keep, drop = row, conflict
        drop.delete()
        Currency.objects.filter(pk=keep.pk).update(code=upper)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('rates', '0009_seed_specific_currencies'),
    ]

    operations = [
        migrations.RunPython(_normalize_case, noop_reverse),
    ]
