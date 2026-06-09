"""
Envía recordatorios programados cuya trigger_time ya pasó (HU-15).

Diseñado para correrse en cron cada N minutos:
  python manage.py send_due_reminders
"""

from django.core.management.base import BaseCommand
from django.utils import timezone

from notifications.mailer import render_reminder_email, send_notification
from notifications.models import NotificationHistory, ScheduledReminder


class Command(BaseCommand):
  help = 'Envía los recordatorios cuya trigger_time ya pasó.'

  def handle(self, *args, **options):
    now = timezone.now()
    due = ScheduledReminder.objects.filter(
      status=ScheduledReminder.Status.PENDING,
      trigger_time__lte=now,
    )
    count = 0
    for reminder in due:
      payload = {
        'reservation_id': str(reminder.reservation_id),
        'reservation_date': reminder.reservation_date.isoformat(),
        'start_hour': reminder.start_hour,
        'end_hour': reminder.end_hour,
        'space_label': reminder.space_label,
      }
      subject, body = render_reminder_email(payload)
      send_notification(
        to_email=reminder.user_email,
        notif_type=NotificationHistory.NotificationType.RESERVATION_REMINDER,
        subject=subject,
        body=body,
        user_id=str(reminder.user_id),
        reservation_id=str(reminder.reservation_id),
      )
      reminder.status = ScheduledReminder.Status.SENT
      reminder.sent_at = now
      reminder.save(update_fields=['status', 'sent_at'])
      count += 1

    self.stdout.write(self.style.SUCCESS(f'Recordatorios enviados: {count}'))
