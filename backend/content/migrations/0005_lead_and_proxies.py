"""
Turn Enquiry into Lead, which now backs three request types (enquiry, quote,
rate lock) via proxy models.

Hand-written on purpose. `makemigrations` wanted to CreateModel(Lead) +
DeleteModel(Enquiry), which would drop the table and lose every existing lead.
RenameModel preserves the rows and the foreign keys.
"""
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
        ('content', '0004_sitesetting'),
    ]

    operations = [
        # 1. Drop the old composite index — its name is tied to the old table.
        migrations.RemoveIndex(
            model_name='enquiry',
            name='content_enq_status_a9ef2f_idx',
        ),

        # 2. Rename the table, keeping all 8 existing rows and the FK to auth.User.
        migrations.RenameModel(old_name='Enquiry', new_name='Lead'),

        migrations.AlterModelOptions(
            name='lead',
            options={
                'ordering': ['-created_at'],
                'verbose_name': 'lead',
                'verbose_name_plural': 'all leads',
            },
        ),
        migrations.AlterField(
            model_name='lead',
            name='assigned_to',
            field=models.ForeignKey(
                blank=True, help_text='Who is handling this.', null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='leads', to='auth.user',
            ),
        ),

        # 3. The discriminator. Existing rows all came from the contact form,
        #    so the 'enquiry' default classifies them correctly.
        migrations.AddField(
            model_name='lead',
            name='kind',
            field=models.CharField(
                choices=[('enquiry', 'Enquiry'), ('quote', 'Quote request'), ('rate_lock', 'Rate lock')],
                db_index=True, default='enquiry',
                help_text='Which website form this came from.', max_length=12,
            ),
        ),

        # 4. Fields the new request types need.
        migrations.AddField(
            model_name='lead',
            name='from_currency',
            field=models.CharField(blank=True, max_length=3),
        ),
        migrations.AddField(
            model_name='lead',
            name='to_currency',
            field=models.CharField(blank=True, max_length=3),
        ),
        migrations.AddField(
            model_name='lead',
            name='amount',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=14, null=True),
        ),
        migrations.AddField(
            model_name='lead',
            name='needed_by',
            field=models.DateField(blank=True, help_text='When the customer needs the currency.', null=True),
        ),
        migrations.AddField(
            model_name='lead',
            name='quoted_rate',
            field=models.DecimalField(
                blank=True, decimal_places=4,
                help_text='The rate the customer saw when they locked it.',
                max_digits=12, null=True,
            ),
        ),
        migrations.AddField(
            model_name='lead',
            name='converted_amount',
            field=models.DecimalField(
                blank=True, decimal_places=2,
                help_text='What the converter showed they would receive.',
                max_digits=16, null=True,
            ),
        ),
        migrations.AddField(
            model_name='lead',
            name='lock_expires_at',
            field=models.DateTimeField(
                blank=True,
                help_text='Set automatically from the lock window in Site settings.',
                null=True,
            ),
        ),
        # message is optional now: a rate lock does not need one.
        migrations.AlterField(
            model_name='lead',
            name='message',
            field=models.TextField(blank=True),
        ),

        # 5. Indexes on the renamed table.
        migrations.AddIndex(
            model_name='lead',
            index=models.Index(
                fields=['kind', 'status', '-created_at'],
                name='content_lea_kind_49acd3_idx',
            ),
        ),
        migrations.AddIndex(
            model_name='lead',
            index=models.Index(
                fields=['status', '-created_at'],
                name='content_lea_status_656dc1_idx',
            ),
        ),

        # 6. Site settings: rate-lock window + per-type alert recipients.
        migrations.AddField(
            model_name='sitesetting',
            name='rate_lock_hours',
            field=models.PositiveSmallIntegerField(
                default=4,
                help_text='How long a locked rate stays valid. The customer is told the exact expiry time.',
                verbose_name='Rate lock validity (hours)',
            ),
        ),
        migrations.AddField(
            model_name='sitesetting',
            name='notify_enquiries',
            field=models.CharField(
                blank=True, max_length=255,
                help_text='Comma-separated emails for contact-form enquiries. Blank = use the default from settings.',
            ),
        ),
        migrations.AddField(
            model_name='sitesetting',
            name='notify_quotes',
            field=models.CharField(
                blank=True, max_length=255,
                help_text='Comma-separated emails for quote requests. Blank = use the default.',
            ),
        ),
        migrations.AddField(
            model_name='sitesetting',
            name='notify_rate_locks',
            field=models.CharField(
                blank=True, max_length=255,
                help_text='Comma-separated emails for rate locks. Blank = use the default.',
            ),
        ),

        # 7. Proxies — no schema change, but each gets its own permissions,
        #    which is what makes per-team admin access possible.
        migrations.CreateModel(
            name='Enquiry',
            fields=[],
            options={'proxy': True, 'verbose_name': 'enquiry', 'verbose_name_plural': 'enquiries',
                     'indexes': [], 'constraints': []},
            bases=('content.lead',),
        ),
        migrations.CreateModel(
            name='QuoteRequest',
            fields=[],
            options={'proxy': True, 'verbose_name': 'quote request', 'verbose_name_plural': 'quote requests',
                     'indexes': [], 'constraints': []},
            bases=('content.lead',),
        ),
        migrations.CreateModel(
            name='RateLock',
            fields=[],
            options={'proxy': True, 'verbose_name': 'rate lock', 'verbose_name_plural': 'rate locks',
                     'indexes': [], 'constraints': []},
            bases=('content.lead',),
        ),
    ]
