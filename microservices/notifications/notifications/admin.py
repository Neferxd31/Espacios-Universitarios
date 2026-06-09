from django.contrib import admin

from .models import NotificationHistory, ScheduledReminder


@admin.register(NotificationHistory)
class NotificationHistoryAdmin(admin.ModelAdmin):
  list_display = ('type', 'user_email', 'status', 'created_at', 'sent_at')
  list_filter = ('type', 'status')
  search_fields = ('user_email', 'subject')
  readonly_fields = ('id', 'created_at')


@admin.register(ScheduledReminder)
class ScheduledReminderAdmin(admin.ModelAdmin):
  list_display = ('reservation_id', 'user_email', 'trigger_time', 'status')
  list_filter = ('status',)
  search_fields = ('user_email',)
  readonly_fields = ('id', 'created_at', 'sent_at')
