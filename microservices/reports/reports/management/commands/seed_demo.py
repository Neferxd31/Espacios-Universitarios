"""
seed_demo — Hard reset + datos coherentes para demo.

Crea:
- AuditLog: acciones admin de los últimos 30 días (HU-27)
- DailyUsageStats: estadísticas agregadas por espacio para últimos 30 días
  (alimentan dashboard HU-23, reportes HU-22, top-spaces HU-24, heatmap HU-25)

Uso: docker compose exec reports python manage.py seed_demo
"""

import random
from datetime import date, timedelta
from uuid import UUID

from django.core.management.base import BaseCommand
from django.db import connection
from django.utils import timezone

from reports.models import AuditLog, DailyUsageStats


ADMIN_ID = UUID('00000000-0000-0000-0000-000000000002')
NEFER_ID = UUID('00000000-0000-0000-0000-000000000001')
PEDRO_ID = UUID('00000000-0000-0000-0000-000000000006')

SPACES = [
    UUID('20000000-0000-0000-0000-000000000001'),  # SB-101
    UUID('20000000-0000-0000-0000-000000000002'),  # SB-201
    UUID('20000000-0000-0000-0000-000000000003'),  # SB-301
    UUID('20000000-0000-0000-0000-000000000004'),  # SB-401
    UUID('20000000-0000-0000-0000-000000000005'),  # LAB-101
    UUID('20000000-0000-0000-0000-000000000006'),  # LAB-201
]

RESERVATION_UUIDS = [UUID(f'30000000-0000-0000-0000-{i:012d}') for i in range(1, 12)]


class Command(BaseCommand):
    help = 'Hard reset + seed coherente para demo.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('▶ Borrando todos los datos de reports-db...'))
        with connection.cursor() as cur:
            cur.execute('TRUNCATE audit_logs, daily_usage_stats RESTART IDENTITY CASCADE;')

        random.seed(1152307)
        now = timezone.now()
        today = date.today()

        # AuditLog: acciones representativas de los últimos 30 días
        self.stdout.write('▶ Creando audit logs (HU-27)...')

        audit_events = [
            # Recientes (visibles primero)
            ('ReservationApproved', 'reservation', str(RESERVATION_UUIDS[5]), ADMIN_ID, 'Carlos Administrador', -1),
            ('ReservationApproved', 'reservation', str(RESERVATION_UUIDS[8]), ADMIN_ID, 'Carlos Administrador', 0),
            ('ReservationRejected', 'reservation', str(RESERVATION_UUIDS[2]), ADMIN_ID, 'Carlos Administrador', -3),
            ('user_created',        'user',         'admin001', ADMIN_ID, 'Carlos Administrador', -25),
            ('space_created',       'space',         str(SPACES[0]),  ADMIN_ID, 'Carlos Administrador', -28),
            ('space_updated',       'space',         str(SPACES[1]),  ADMIN_ID, 'Carlos Administrador', -10),
            ('space_deactivated',   'space',         str(SPACES[2]),  ADMIN_ID, 'Carlos Administrador', -5),
            ('rules_updated',       'rules',         '1',             ADMIN_ID, 'Carlos Administrador', -7),
            ('holiday_created',     'holiday',       '',              ADMIN_ID, 'Carlos Administrador', -2),
            ('user_role_changed',   'user',          str(NEFER_ID),   ADMIN_ID, 'Carlos Administrador', -15),
            ('ReservationApproved', 'reservation',   str(RESERVATION_UUIDS[3]), PEDRO_ID, 'Pedro Morales', -10),
            ('ReservationApproved', 'reservation',   str(RESERVATION_UUIDS[4]), PEDRO_ID, 'Pedro Morales', -2),
            ('ReservationApproved', 'reservation',   str(RESERVATION_UUIDS[0]), PEDRO_ID, 'Pedro Morales', -7),
            ('login',               'auth',          'admin001',      ADMIN_ID, 'Carlos Administrador', 0),
            ('login',               'auth',          '1152307',       NEFER_ID, 'Nefer Sneyder Rojas', 0),
        ]

        for action, resource, res_id, user_id, label, day_off in audit_events:
            log = AuditLog.objects.create(
                user_id=user_id,
                user_label=label,
                action=action,
                resource=resource,
                resource_id=res_id,
                ip_address=f'192.168.1.{random.randint(10, 200)}',
                metadata={'source': 'seed_demo'},
            )
            # Override timestamp para distribuir en el tiempo
            target_ts = now + timedelta(days=day_off, hours=random.randint(-12, 12))
            AuditLog.objects.filter(pk=log.pk).update(timestamp=target_ts)
        self.stdout.write(f'  ✓ {len(audit_events)} audit logs')

        # DailyUsageStats: 30 días x 6 espacios con números variables
        self.stdout.write('▶ Creando DailyUsageStats últimos 30 días...')
        count = 0
        for day_off in range(30, 0, -1):
            d = today - timedelta(days=day_off)
            for space_id in SPACES:
                # No todos los espacios se reservan todos los días
                if random.random() < 0.3:
                    continue
                total = random.randint(1, 6)
                approved = max(1, int(total * 0.75))
                cancelled = random.randint(0, max(1, total - approved))
                rejected = max(0, total - approved - cancelled)

                # Distribución por hora (picos a media mañana y media tarde)
                hour_dist = {}
                total_hours = 0
                for _ in range(approved):
                    h = random.choices(
                        list(range(7, 21)),
                        weights=[2, 3, 5, 5, 4, 3, 2, 3, 5, 5, 4, 3, 2, 1],
                    )[0]
                    duration = random.choice([1, 2])
                    for hh in range(h, min(h + duration, 21)):
                        hour_dist[str(hh)] = hour_dist.get(str(hh), 0) + 1
                        total_hours += 1

                peak_hour = int(max(hour_dist, key=lambda k: hour_dist[k])) if hour_dist else None

                DailyUsageStats.objects.create(
                    date=d,
                    space_id=space_id,
                    total_reservations=total,
                    approved_reservations=approved,
                    cancelled_reservations=cancelled,
                    rejected_reservations=rejected,
                    total_hours=total_hours,
                    peak_hour=peak_hour,
                    hour_distribution=hour_dist,
                )
                count += 1

        self.stdout.write(f'  ✓ {count} stats diarias creadas')

        self.stdout.write(self.style.SUCCESS('\n✓ reports-db sembrada.'))
