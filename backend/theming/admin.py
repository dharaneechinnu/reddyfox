from django import forms
from django.contrib import admin
from django.utils.html import format_html, format_html_join

from .models import ThemeSetting

# Fields that hold a hex colour and should therefore get a colour picker rather than a text box.
COLOR_FIELDS = (
    'brand', 'brand_dark', 'accent', 'ink', 'ink_deep',
    'surface', 'surface_alt', 'line', 'body_text', 'muted_text', 'success', 'danger',
)


class ColorInput(forms.TextInput):
    """A native colour picker sitting next to the plain text value.

    The picker alone would not be enough: there is no way to type or paste an exact hex into
    it, and a brand colour normally arrives *as* a hex from a brand guide rather than as
    something you eyeball out of a gradient. So the text box remains the real form field —
    the swatch is a convenience that writes into it, and either one updates the other.
    """

    def render(self, name, value, attrs=None, renderer=None):
        text_input = super().render(name, value, attrs, renderer)
        field_id = (attrs or {}).get('id', f'id_{name}')
        return format_html(
            '<span style="display:inline-flex;gap:8px;align-items:center">'
            '<input type="color" value="{}" aria-label="Colour picker for {}" '
            'style="width:44px;height:30px;padding:0;border:1px solid #ccc;border-radius:4px;cursor:pointer" '
            'oninput="var t=document.getElementById(\'{}\');t.value=this.value.toUpperCase();">'
            '{}</span>',
            value or '#000000', name, field_id, text_input,
        )


class ThemeSettingForm(forms.ModelForm):
    class Meta:
        model = ThemeSetting
        fields = '__all__'
        widgets = {
            field: ColorInput(attrs={'style': 'width:9em;font-family:monospace;text-transform:uppercase'})
            for field in COLOR_FIELDS
        }


@admin.register(ThemeSetting)
class ThemeSettingAdmin(admin.ModelAdmin):
    """Singleton — one row, auto-created, never deleted."""

    form = ThemeSettingForm
    readonly_fields = ('updated_at', 'palette_preview', 'type_scale_preview')
    fieldsets = (
        ('Colours', {
            'fields': (
                'palette_preview',
                'brand', 'brand_dark', 'accent',
                'ink', 'ink_deep',
                'surface', 'surface_alt', 'line',
                'body_text', 'muted_text',
                'success', 'danger',
            ),
            'description': 'The whole site is built from these. Shades the design needs but that are not listed '
                           'here — the pale orange behind a service icon, the tint behind a success message — are '
                           'mixed from them automatically, so changing one colour here carries through everywhere '
                           'it should. Check contrast after a change: text has to stay readable on its background.',
        }),
        ('Typefaces', {
            'fields': ('font_sans', 'font_serif', 'font_mono', 'fonts_url'),
            'description': 'Changing a font family without adding it to the webfont URL will silently fall back to '
                           'a system font — set both together.',
        }),
        ('Text size', {
            'fields': ('type_scale_preview', 'base_font_size', 'heading_scale'),
            'description': 'Every text size on the site is a fixed proportion of the base size, so these two '
                           'numbers move all of them together and keep the design in proportion.',
        }),
        ('Shape', {'fields': ('radius',)}),
        (None, {'fields': ('updated_at',)}),
    )

    def has_add_permission(self, request):
        return not ThemeSetting.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False

    def changelist_view(self, request, extra_context=None):
        # There is only ever one row: make sure it exists so the list is never empty, and staff
        # land straight on the edit form.
        ThemeSetting.load()
        return super().changelist_view(request, extra_context)

    @admin.display(description='Current palette')
    def palette_preview(self, obj):
        """Swatches of the saved values, so staff can sanity-check a change without leaving the
        admin. Shows what is *saved*, not what is currently typed into the form."""
        if not obj.pk:
            return 'Save once to see the palette here.'
        swatches = [
            ('brand', obj.brand), ('hover', obj.brand_dark), ('accent', obj.accent),
            ('ink', obj.ink), ('footer', obj.ink_deep), ('page', obj.surface),
            ('sections', obj.surface_alt), ('borders', obj.line),
            ('body', obj.body_text), ('muted', obj.muted_text),
            ('success', obj.success), ('danger', obj.danger),
        ]
        return format_html(
            '<div style="display:flex;flex-wrap:wrap;gap:10px">{}</div>',
            format_html_join(
                '',
                '<div style="text-align:center;font-size:11px;line-height:1.5">'
                '<div style="width:64px;height:44px;border-radius:6px;border:1px solid #ccc;background:{}"></div>'
                '{}<br><span style="font-family:monospace;color:#666">{}</span></div>',
                ((value, label, value) for label, value in swatches),
            ),
        )

    @admin.display(description='Resulting sizes')
    def type_scale_preview(self, obj):
        """The computed scale, each row rendered at its own size — the only way to judge
        whether a base-size or heading-scale change actually reads well."""
        if not obj.pk:
            return 'Save once to see the scale here.'
        variables = obj.css_variables
        rows = [
            ('Homepage hero', '--fx-text-hero'), ('Page heading', '--fx-text-h1'),
            ('Section heading', '--fx-text-h2'), ('Sub-section', '--fx-text-h3'),
            ('Large heading', '--fx-text-3xl'), ('Subheading', '--fx-text-2xl'),
            ('Card heading', '--fx-text-xl'), ('Lead paragraph', '--fx-text-lg'),
            ('Body', '--fx-text-md'), ('UI text', '--fx-text-base'),
            ('Caption', '--fx-text-sm'), ('Eyebrow', '--fx-text-xs'),
            ('Micro label', '--fx-text-2xs'),
        ]
        return format_html(
            '<div style="max-width:640px">{}</div>',
            format_html_join(
                '',
                '<div style="display:flex;align-items:baseline;gap:12px;padding:3px 0;border-bottom:1px solid #eee">'
                '<span style="flex:none;width:118px;font-size:11px;color:#666">{}</span>'
                '<span style="font-size:{};line-height:1.2">Reddy Forex</span>'
                '<span style="margin-left:auto;font-family:monospace;font-size:11px;color:#999">{}</span></div>',
                ((label, variables[key], variables[key]) for label, key in rows),
            ),
        )
