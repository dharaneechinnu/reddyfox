from django.test import TestCase

from .models import LeadAlertRule
from .services import is_telegram_enabled_for


class LeadAlertRuleSeedTests(TestCase):
    """The data migration (0002_seed_rules) should have already run for every test — this just
    confirms the checklist starts in the state the feature was built for."""

    def test_enquiry_defaults_off(self):
        self.assertFalse(LeadAlertRule.objects.get(kind='enquiry').telegram_enabled)

    def test_every_other_kind_defaults_on(self):
        for kind in ('quote', 'rate_lock', 'callback'):
            self.assertTrue(LeadAlertRule.objects.get(kind=kind).telegram_enabled, kind)

    def test_all_four_lead_kinds_are_seeded(self):
        seeded = set(LeadAlertRule.objects.values_list('kind', flat=True))
        self.assertEqual(seeded, {'enquiry', 'quote', 'rate_lock', 'callback'})


class IsTelegramEnabledForTests(TestCase):
    def test_reads_the_seeded_value(self):
        self.assertFalse(is_telegram_enabled_for('enquiry'))
        self.assertTrue(is_telegram_enabled_for('quote'))

    def test_toggling_the_row_changes_the_result(self):
        rule = LeadAlertRule.objects.get(kind='quote')
        rule.telegram_enabled = False
        rule.save()
        self.assertFalse(is_telegram_enabled_for('quote'))

    def test_unknown_kind_self_heals_to_a_new_row_defaulting_enabled(self):
        # A kind added to content.Lead.Kind in the future, before anyone thinks to seed a rule
        # for it, must not silently go dark — better to alert by default than miss a lead type.
        self.assertFalse(LeadAlertRule.objects.filter(kind='future_kind').exists())
        result = is_telegram_enabled_for('future_kind')
        self.assertTrue(result)
        self.assertTrue(LeadAlertRule.objects.get(kind='future_kind').telegram_enabled)

    def test_a_database_error_fails_open(self):
        from unittest.mock import patch
        with patch('alert_routing.services.LeadAlertRule.objects.get_or_create', side_effect=RuntimeError('db down')):
            self.assertTrue(is_telegram_enabled_for('enquiry'))


class AdminPermissionTests(TestCase):
    """The checklist is toggle-only — no adding or deleting rows, since the four rows represent
    the fixed set of lead kinds, not arbitrary records."""

    def test_add_and_delete_are_disabled(self):
        from django.contrib.admin.sites import AdminSite

        from .admin import LeadAlertRuleAdmin

        admin_instance = LeadAlertRuleAdmin(LeadAlertRule, AdminSite())
        self.assertFalse(admin_instance.has_add_permission(request=None))
        self.assertFalse(admin_instance.has_delete_permission(request=None))
