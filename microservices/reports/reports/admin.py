from django.contrib import admin

from .models import AuditLog, DailyUsageStats


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
  list_display = ('timestamp', 'user_label', 'action', 'resource', 'resource_id', 'ip_address')
  list_filter = ('action', 'resource')
  search_fields = ('user_label', 'resource_id')
  readonly_fields = ('id', 'timestamp')


@admin.register(DailyUsageStats)
class DailyUsageStatsAdmin(admin.ModelAdmin):
  list_display = ('date', 'space_id', 'total_reservations', 'approved_reservations', 'cancelled_reservations', 'peak_hour')
  list_filter = ('date',)
  search_fields = ('space_id',)
  readonly_fields = ('id', 'updated_at')
