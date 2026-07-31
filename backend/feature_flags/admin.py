from django.contrib import admin
from .models import FeatureFlag


@admin.register(FeatureFlag)
class FeatureFlagAdmin(admin.ModelAdmin):
    list_display = ('key', 'name', 'is_enabled', 'updated_at')
    list_editable = ('is_enabled',)
    search_fields = ('key', 'name', 'description')
    ordering = ('key',)
    fields = ('key', 'name', 'description', 'is_enabled', 'updated_at')
    readonly_fields = ('updated_at',)
