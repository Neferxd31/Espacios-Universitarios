"""
seed_demo — Hard reset + datos coherentes para demo.

Crea historial de notificaciones y recordatorios programados que
corresponden a las reservas creadas en reservations.

Uso: docker compose exec notifications python manage.py seed_demo
"""

from datetime import date, datetime, timedelta
from uuid import UUID

from django.core.management.base import BaseCommand
from django.db import connection
from django.utils import timezone

from notifications.models import NotificationHistory, ScheduledReminder


USERS = {
    'nefer': UUID('00000000-0000-0000-0000-000000000001'),
    'maria': UUID('00000000-0000-0000-0000-000000000003'),
    'juan':  UUID('00000000-0000-0000-0000-000000000004'),
    'ana':   UUID('00000000-0000-0000-0000-000000000005'),
}

USER_EMAILS = {
    'nefer': 'nefer.rojas@ufps.edu.co',
    'maria': 'maria.gomez@ufps.edu.co',
    'juan':  'juan.perez@ufps.edu.co',
    'ana':   'ana.lopez@ufps.edu.co',
}

RESERVATION_UUIDS = [UUID(f'30000000-0000-0000-0000-{i:012d}') for i in range(1, 12)]


class Command(BaseCommand):
    help = 'Hard reset + seed coherente para demo.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('▶ Borrando todos los datos de notifications-db...'))
        with connection.cursor() as cur:
            cur.execute(
                'TRUNCATE notification_history, scheduled_reminders '
                'RESTART IDENTITY CASCADE;'
            )

        now = timezone.now()
        today = date.today()

        # Cada reserva genera 1-2 notificaciones según su estado
        # (idx, user, type, status, when_offset_hours)
        notif_plan = [
            # R1: Nefer SB-101 aprobada (pasada)
            (1, 'nefer', 'reservation_created',  'sent', -7 * 24 - 2),
            (1, 'nefer', 'reservation_approved', 'sent', -7 * 24 - 1),
            (1, 'nefer', 'reservation_reminder', 'sent', -7 * 24 + 7),
            # R2: Nefer SB-201 cancelada
            (2, 'nefer', 'reservation_created',  'sent', -14 * 24 - 2),
            (2, 'nefer', 'reservation_cancelled','sent', -14 * 24),
            # R3: Ana rejected
            (3, 'ana',   'reservation_created',  'sent', -3 * 24 - 5),
            (3, 'ana',   'reservation_rejected', 'sent', -3 * 24 - 3),
            # R4: Maria aprobada (pasada)
            (4, 'maria', 'reservation_created',  'sent', -10 * 24 - 2),
            (4, 'maria', 'reservation_approved', 'sent', -10 * 24 - 1),
            # R5: Juan aprobada (pasada)
            (5, 'juan',  'reservation_created',  'sent', -2 * 24 - 3),
            (5, 'juan',  'reservation_approved', 'sent', -2 * 24 - 2),
            # R6: Nefer aprobada futura
            (6, 'nefer', 'reservation_created',  'sent', -2),
            (6, 'nefer', 'reservation_approved', 'sent', -1),
            # R7: Nefer auto-confirmada
            (7, 'nefer', 'reservation_created',  'sent', -1),
            # R8: Nefer pending
            (8, 'nefer', 'reservation_created',  'sent', 0),
            # R9: Maria aprobada futura
            (9, 'maria', 'reservation_created',  'sent', -1),
            (9, 'maria', 'reservation_approved', 'sent', 0),
            # R10: Juan pending
            (10,'juan',  'reservation_created',  'sent', 0),
            # R11: Ana pending
            (11,'ana',   'reservation_created',  'sent', 0),
            # Recuperaciones de contraseña
            (None,'nefer','password_reset','sent', -1),
        ]

        subject_by_type = {
            'reservation_created':   'Reserva creada — pendiente de aprobación',
            'reservation_approved':  'Reserva aprobada ✓',
            'reservation_rejected':  'Reserva rechazada',
            'reservation_cancelled': 'Reserva cancelada',
            'reservation_reminder':  'Recordatorio de reserva próxima',
            'password_reset':        'Recuperación de contraseña',
        }

        self.stdout.write('▶ Creando historial de notificaciones...')
        for r_idx, user_key, ntype, status, hours_off in notif_plan:
            NotificationHistory.objects.create(
                reservation_id=RESERVATION_UUIDS[r_idx - 1] if r_idx else None,
                user_id=USERS[user_key],
                user_email=USER_EMAILS[user_key],
                type=ntype,
                status=status,
                subject=subject_by_type.get(ntype, 'Notificación'),
                body=f'Notificación de tipo {ntype} para {USER_EMAILS[user_key]}',
                sent_at=now + timedelta(hours=hours_off),
            )
        self.stdout.write(f'  ✓ {len(notif_plan)} notificaciones creadas')

        # Recordatorios programados para las reservas APROBADAS FUTURAS
        self.stdout.write('▶ Creando recordatorios programados (HU-15)...')

        reminders_plan = [
            # (r_idx, user_key, space_label, date_off, start, end, status)
            (6, 'nefer', 'SB-301', 2, 10, 12, ScheduledReminder.Status.PENDING),
            (7, 'nefer', 'SB-401', 3, 14, 16, ScheduledReminder.Status.PENDING),
            (9, 'maria', 'LAB-101', 1, 8, 10, ScheduledReminder.Status.PENDING),
            (1, 'nefer', 'SB-101', -7, 8, 10, ScheduledReminder.Status.SENT),
        ]
        for r_idx, user_key, space_label, day_off, start, end, status in reminders_plan:
            res_date = today + timedelta(days=day_off)
            trigger = timezone.make_aware(
                datetime.combine(res_date, datetime.min.time())
            ).replace(hour=max(0, start - 1))
            ScheduledReminder.objects.create(
                reservation_id=RESERVATION_UUIDS[r_idx - 1],
                user_id=USERS[user_key],
                user_email=USER_EMAILS[user_key],
                space_label=space_label,
                reservation_date=res_date,
                start_hour=start,
                end_hour=end,
                trigger_time=trigger,
                status=status,
                sent_at=trigger if status == ScheduledReminder.Status.SENT else None,
            )
        self.stdout.write(f'  ✓ {len(reminders_plan)} recordatorios creados')

        self.stdout.write(self.style.SUCCESS('\n✓ notifications-db sembrada.'))
