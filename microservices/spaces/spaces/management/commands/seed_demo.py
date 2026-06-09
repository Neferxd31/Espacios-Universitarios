"""
seed_demo — Hard reset + datos coherentes para demo.

Crea:
- 2 áreas (Edificio SB, Laboratorios)
- 6 espacios con fotos (Unsplash), horarios y restricciones
- 2 días bloqueados (festivo global + mantenimiento un día)

Uso: docker compose exec spaces python manage.py seed_demo
"""

from datetime import date, timedelta, time

from django.core.management.base import BaseCommand
from django.db import connection

from spaces.models import Area, Space, SpaceHoliday, SpaceOperatingHours


AREA_UUIDS = {
    'sb':  '10000000-0000-0000-0000-000000000001',
    'lab': '10000000-0000-0000-0000-000000000002',
}

SPACE_UUIDS = {
    'sb-101':  '20000000-0000-0000-0000-000000000001',
    'sb-201':  '20000000-0000-0000-0000-000000000002',
    'sb-301':  '20000000-0000-0000-0000-000000000003',
    'sb-401':  '20000000-0000-0000-0000-000000000004',
    'lab-101': '20000000-0000-0000-0000-000000000005',
    'lab-201': '20000000-0000-0000-0000-000000000006',
}


class Command(BaseCommand):
    help = 'Hard reset + seed coherente para demo.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('▶ Borrando todos los datos de spaces-db...'))
        with connection.cursor() as cur:
            cur.execute(
                'TRUNCATE space_holidays, '
                'spaces_spaceoperatinghours, spaces_space, spaces_area '
                'RESTART IDENTITY CASCADE;'
            )

        self.stdout.write('▶ Creando áreas...')
        sb = Area.objects.create(
            id=AREA_UUIDS['sb'],
            code='sb',
            name='Edificio SB',
            description='Edificio principal de aulas — 4 pisos',
            area_type=Area.AreaType.DEPARTAMENTO,
            sort_order=10,
        )
        lab = Area.objects.create(
            id=AREA_UUIDS['lab'],
            code='lab',
            name='Laboratorios de Ingeniería',
            description='Laboratorios especializados con equipamiento',
            area_type=Area.AreaType.UNIDAD,
            sort_order=20,
        )
        self.stdout.write(f'  ✓ Edificio SB, Laboratorios')

        self.stdout.write('▶ Creando espacios...')

        spaces_data = [
            # (key, area, code, name, floor, capacity, type, requires_approval, allowed_roles, image_url)
            ('sb-101', sb, '101', 'Aula SB-101', 1, 30, 'Aula', True,  [],
             'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800'),
            ('sb-201', sb, '201', 'Aula SB-201', 2, 40, 'Aula', True,  [],
             'https://images.unsplash.com/photo-1568792923760-d70635a89fdc?w=800'),
            ('sb-301', sb, '301', 'Aula Magna SB-301', 3, 80, 'Auditorio', True, [],
             'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800'),
            ('sb-401', sb, '401', 'Sala de estudio SB-401', 4, 20, 'Sala', False, [],
             'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800'),
            ('lab-101', lab, '101', 'Laboratorio de Cómputo', 1, 25, 'Laboratorio', True,
             ['Docente', 'Administrativo', 'Admin'],
             'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800'),
            ('lab-201', lab, '201', 'Laboratorio de Redes', 2, 20, 'Laboratorio', True, [],
             'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800'),
        ]

        for key, area, code, name, floor, cap, stype, approval, roles, img in spaces_data:
            sp = Space.objects.create(
                id=SPACE_UUIDS[key],
                area=area,
                code=code,
                name=name,
                description=f'{name} — capacidad para {cap} personas',
                floor=floor,
                capacity=cap,
                space_type=stype,
                has_air_conditioning=True,
                has_computers=(stype == 'Laboratorio'),
                has_projector=True,
                has_internet=True,
                amenities={'pizarra': True, 'sillas_ergonomicas': stype == 'Sala'},
                allowed_roles=roles,
                requires_approval=approval,
                image_url=img,
                status=Space.Status.OPERATIONAL,
                is_active=True,
            )
            self.stdout.write(
                f'  ✓ {area.code.upper()}-{code:<4} {name} '
                f'(cap={cap}, approval={approval}, roles={roles or "todos"})'
            )

        self.stdout.write('▶ Creando horarios de operación...')
        for sp_id in SPACE_UUIDS.values():
            sp = Space.objects.get(id=sp_id)
            # Lunes a viernes 7:00 - 21:00
            for day in range(5):
                SpaceOperatingHours.objects.create(
                    space=sp,
                    day_of_week=day,
                    opens_at=time(7, 0),
                    closes_at=time(21, 0),
                )
            # Sábado 8:00 - 14:00
            SpaceOperatingHours.objects.create(
                space=sp,
                day_of_week=5,
                opens_at=time(8, 0),
                closes_at=time(14, 0),
            )
        self.stdout.write('  ✓ Horarios lunes-sábado configurados')

        self.stdout.write('▶ Creando días bloqueados (HU-19)...')
        SpaceHoliday.objects.create(
            space=None,
            date=date.today() + timedelta(days=7),
            label='Festivo nacional — todos los espacios cerrados',
        )
        SpaceHoliday.objects.create(
            space=Space.objects.get(id=SPACE_UUIDS['sb-101']),
            date=date.today() + timedelta(days=14),
            label='Mantenimiento programado SB-101',
        )
        self.stdout.write('  ✓ 1 festivo global + 1 mantenimiento de SB-101')

        self.stdout.write(self.style.SUCCESS('\n✓ spaces-db sembrada.'))
