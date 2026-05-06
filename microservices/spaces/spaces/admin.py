from django.contrib import admin

from .models import Area, Space, SpaceOperatingHours


class SpaceOperatingHoursInline(admin.TabularInline):
    model = SpaceOperatingHours
    extra = 0


@admin.register(Area)
class AreaAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'sort_order', 'updated_at')
    search_fields = ('code', 'name')
    ordering = ('sort_order', 'code')


@admin.register(Space)
class SpaceAdmin(admin.ModelAdmin):
    list_display = (
        'code',
        'name',
        'area',
        'floor',
        'capacity',
        'status',
        'updated_at',
    )
    list_filter = ('area', 'status')
    search_fields = ('code', 'name')
    inlines = [SpaceOperatingHoursInline]


@admin.register(SpaceOperatingHours)
class SpaceOperatingHoursAdmin(admin.ModelAdmin):
    list_display = ('space', 'day_of_week', 'opens_at', 'closes_at')
    list_filter = ('day_of_week',)
