from django.contrib import admin

from .models import Faq, FaqCategory, Testimonial


@admin.register(Testimonial)
class TestimonialAdmin(admin.ModelAdmin):
    list_display = ('name', 'role', 'short_quote', 'is_visible', 'display_order', 'updated_at')
    list_editable = ('is_visible', 'display_order')
    list_filter = ('is_visible',)
    search_fields = ('name', 'quote', 'role')
    ordering = ('display_order', 'pk')
    fieldsets = (
        (None, {'fields': ('quote',)}),
        ('Attribution', {'fields': ('name', 'role', 'initials')}),
        ('Visibility', {'fields': ('is_visible', 'display_order')}),
    )

    @admin.display(description='Quote')
    def short_quote(self, obj):
        return obj.quote[:60] + ('…' if len(obj.quote) > 60 else '')


@admin.register(FaqCategory)
class FaqCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'display_order', 'faq_count')
    list_editable = ('display_order',)
    search_fields = ('name',)
    ordering = ('display_order', 'name')

    @admin.display(description='Questions')
    def faq_count(self, obj):
        return obj.faqs.count()


@admin.register(Faq)
class FaqAdmin(admin.ModelAdmin):
    list_display = ('question', 'category', 'is_visible', 'show_on_homepage', 'display_order', 'updated_at')
    list_editable = ('is_visible', 'show_on_homepage', 'display_order')
    list_filter = ('is_visible', 'show_on_homepage', 'category')
    search_fields = ('question', 'answer')
    ordering = ('display_order', 'pk')
    fieldsets = (
        (None, {'fields': ('question', 'answer')}),
        ('Placement & visibility', {
            'fields': ('category', 'is_visible', 'show_on_homepage', 'display_order'),
        }),
    )
