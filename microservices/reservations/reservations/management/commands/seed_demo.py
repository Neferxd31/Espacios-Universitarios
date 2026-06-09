"""
seed_demo — Hard reset + datos coherentes para demo.

Crea:
- Reglas globales (HU-26)
- 8 reservas con mix de estados (pending, confirmed, approved, rejected, cancelled)
  · pasadas (para historial)
  · futuras (para activas)
  · diferentes usuarios y espacios

Uso: docker compose exec reservations python manage.py seed_demo
"""

from datetime import date, timedelta
from uuid import UUID

from django.core.management.base import BaseCommand
from django.db import connection
from django.utils import timezone

from reservations.models import OutboxEvent, Reservation, ReservationRules


USERS = {
    'nefer': UUID('00000000-0000-0000-0000-000000000001'),
    'admin': UUID('00000000-0000-0000-0000-000000000002'),
    'maria': UUID('00000000-0000-0000-0000-000000000003'),
    'juan':  UUID('00000000-0000-0000-0000-000000000004'),
    'ana':   UUID('00000000-0000-0000-0000-000000000005'),
}

SPACES = {
    'sb-101':  UUID('20000000-0000-0000-0000-000000000001'),
    'sb-201':  UUID('20000000-0000-0000-0000-000000000002'),
    'sb-301':  UUID('20000000-0000-0000-0000-000000000003'),
    'sb-401':  UUID('20000000-0000-0000-0000-000000000004'),
    'lab-101': UUID('20000000-0000-0000-0000-000000000005'),
    'lab-201': UUID('20000000-0000-0000-0000-000000000006'),
}

# UUIDs fijos para las reservas (notifications los referencia)
RESERVATION_UUIDS = [f'30000000-0000-0000-0000-{i:012d}' for i in range(1, 12)]


class Command(BaseCommand):
    help = 'Hard reset + seed coherente para demo.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('▶ Borrando todos los datos de reservations-db...'))
        with connection.cursor() as cur:
            cur.execute(
                'TRUNCATE reservations_reservation, '
                'reservations_outboxevent, reservation_rules '
                'RESTART IDENTITY CASCADE;'
            )

        self.stdout.write('▶ Creando reglas globales (HU-26)...')
        rules = ReservationRules.objects.create(
            max_hours_per_day=4,
            min_anticipation_hours=1,
            max_anticipation_days=30,
            cancel_anticipation_hours=2,
            max_simultaneous_per_user=5,
        )
        self.stdout.write(f'  ✓ Rules creadas (max_hours={rules.max_hours_per_day})')

        today = date.today()
        admin_id = USERS['admin']
        now = timezone.now()

        # (uuid_idx, user, space, day_offset, start, end, status, notes, reviewed_by)
        reservations_plan = [
            # PASADAS — para historial
            (1, 'nefer', 'sb-101',  -7,  8, 10, Reservation.Status.APPROVED,
             'Aprobada — clase de cálculo', admin_id),
            (2, 'nefer', 'sb-201',  -14, 14, 16, Reservation.Status.CANCELLED,
             'Cancelada por el estudiante', None),
            (3, 'ana',   'sb-301',  -3,  10, 12, Reservation.Status.REJECTED,
             'Espacio en mantenimiento ese día', admin_id),
            (4, 'maria', 'lab-101', -10, 8,  11, Reservation.Status.APPROVED,
             'Aprobada — práctica de programación', admin_id),
            (5, 'juan',  'sb-201',  -2,  16, 18, Reservation.Status.APPROVED,
             'Estudio grupal aprobado', admin_id),

            # FUTURAS ACTIVAS
            (6, 'nefer', 'sb-301',  2,   10, 12, Reservation.Status.APPROVED,
             'Estudio aprobado', admin_id),
            (7, 'nefer', 'sb-401',  3,   14, 16, Reservation.Status.CONFIRMED,
             'Auto-confirmada (espacio sin aprobación)', None),
            (8, 'nefer', 'sb-201',  5,   16, 18, Reservation.Status.PENDING,
             '', None),
            (9, 'maria', 'lab-101', 1,   8,  10, Reservation.Status.APPROVED,
             'Práctica matutina', admin_id),
            (10, 'juan', 'sb-101',  2,   14, 16, Reservation.Status.PENDING,
             '', None),
            (11, 'ana',  'lab-201', 4,   10, 12, Reservation.Status.PENDING,
             '', None),
        ]

        self.stdout.write('▶ Creando reservas...')
        for idx, user_key, space_key, day_off, start, end, status, notes, reviewer in reservations_plan:
            r = Reservation(
                id=RESERVATION_UUIDS[idx - 1],
                requester_user_id=USERS[user_key],
                space_id=SPACES[space_key],
                reservation_date=today + timedelta(days=day_off),
                start_hour=start,
                end_hour=end,
                status=status,
                review_notes=notes,
                reviewed_at=now if reviewer else None,
                reviewed_by_user_id=reviewer,
                cancelled_at=now if status == Reservation.Status.CANCELLED else None,
                cancelled_by_user_id=USERS[user_key] if status == Reservation.Status.CANCELLED else None,
            )
            # Bypass full_clean para no chocar con la regla de solapamiento durante seed
            super(Reservation, r).save()
            self.stdout.write(
                f'  ✓ R{idx:<2} {user_key:<6} @ {space_key:<7} '
                f'{r.reservation_date} {start:>2}-{end:<2} → {status}'
            )

        self.stdout.write(self.style.SUCCESS('\n✓ reservations-db sembrada.'))
