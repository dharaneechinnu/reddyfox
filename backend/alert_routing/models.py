from django.db import models


class LeadAlertRule(models.Model):
    """One row per `content.Lead.Kind` — the config rule deciding whether that kind of lead
    triggers a Telegram alert. A checklist, not a singleton: exactly one row per kind, always
    present (seeded by migration, self-healing on read — see alert_routing/services.py), never
    added to or deleted from the admin. Toggling a checkbox here takes effect on the very next
    lead submission, no deploy needed.

    Deliberately its own app: telegram_alerts owns *how* to send a Telegram message,
    content owns *what a lead is*, and this app owns only the one small decision of *whether* a
    given kind should reach Telegram at all — kept separate so it has zero knowledge of Telegram
    specifics and could gate a future channel (e.g. an `email_enabled` column) without either side
    needing to change.
    """

    # Mirrors content.models.Lead.Kind's string values exactly (kept as a plain CharField, not an
    # FK, since Lead.kind itself is a CharField choice, not a separate table row).
    kind = models.CharField(max_length=12, unique=True, help_text='Matches content.Lead.Kind — one row per lead type.')
    kind_label = models.CharField(max_length=40, help_text="Human-readable name shown in the admin, e.g. \"Enquiry\".")
    telegram_enabled = models.BooleanField(
        default=True,
        help_text='Tick to alert Telegram subscribers when this kind of lead arrives. Untick to '
                   'keep this kind out of Telegram entirely — the email alert and the admin '
                   'inbox are unaffected either way.',
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['kind_label']
        verbose_name = 'lead alert rule'
        verbose_name_plural = 'lead alert rules (Telegram checklist)'

    def __str__(self):
        return f'{self.kind_label}: Telegram {"on" if self.telegram_enabled else "off"}'
