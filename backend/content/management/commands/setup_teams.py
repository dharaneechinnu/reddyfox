"""
Create the staff groups that control who sees which list in /admin/.

Django's admin already hides any model a user has no permission for, so group
membership alone produces a different admin per role — no custom dashboard code.

Run after migrate:  python manage.py setup_teams

Then, per staff member in /admin/ -> Users:
  1. tick "Staff status"  (required to log in to the admin at all)
  2. add them to ONE group
  3. leave "Superuser status" off for everyone except the owner

Re-running is safe: it syncs permissions to match this file, so if you add a
model later just run it again.
"""
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from django.core.management.base import BaseCommand

from content.models import CallbackRequest, Enquiry, Faq, FaqCategory, QuoteRequest, RateLock, SiteSetting, Testimonial
from rates.models import Currency

# What each group may do. 'view'/'change' only — leads are created by the
# website and deleting a customer record should be a deliberate superuser act.
WORK_ON_LEADS = ('view', 'change')
MANAGE = ('view', 'add', 'change', 'delete')

TEAMS = {
    'Rates desk': {
        'description': 'Sees only Rate locks.',
        'models': {
            RateLock: WORK_ON_LEADS,
        },
    },
    'Quotes desk': {
        'description': 'Sees only Quote requests.',
        'models': {
            QuoteRequest: WORK_ON_LEADS,
        },
    },
    'Front office': {
        'description': 'Sees Enquiries and quick Callback requests.',
        'models': {
            Enquiry: WORK_ON_LEADS,
            CallbackRequest: WORK_ON_LEADS,
        },
    },
    'Manager': {
        'description': 'Sees all four lead lists plus rates and site content.',
        'models': {
            RateLock: WORK_ON_LEADS,
            QuoteRequest: WORK_ON_LEADS,
            Enquiry: WORK_ON_LEADS,
            CallbackRequest: WORK_ON_LEADS,
            Currency: MANAGE,
            Testimonial: MANAGE,
            Faq: MANAGE,
            FaqCategory: MANAGE,
            SiteSetting: ('view', 'change'),
        },
    },
}


class Command(BaseCommand):
    help = 'Create/sync the staff groups that control per-team access to the admin'

    def handle(self, *args, **options):
        for group_name, spec in TEAMS.items():
            group, created = Group.objects.get_or_create(name=group_name)

            perms = []
            missing = []
            for model, actions in spec['models'].items():
                ct = ContentType.objects.get_for_model(model, for_concrete_model=False)
                for action in actions:
                    codename = f'{action}_{model._meta.model_name}'
                    try:
                        perms.append(Permission.objects.get(content_type=ct, codename=codename))
                    except Permission.DoesNotExist:
                        missing.append(codename)

            # set() so re-running removes anything no longer granted here
            group.permissions.set(perms)

            verb = 'Created' if created else 'Updated'
            self.stdout.write(f'{verb} group "{group_name}" — {len(perms)} permission(s). {spec["description"]}')
            for codename in missing:
                self.stdout.write(self.style.WARNING(f'   ! permission not found: {codename}'))

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'{len(TEAMS)} groups ready.'))
        self.stdout.write(
            'Next: in /admin/ -> Users, tick "Staff status" for each person and put them in one group. '
            'Keep "Superuser status" off — a superuser bypasses all of this and sees everything.'
        )
