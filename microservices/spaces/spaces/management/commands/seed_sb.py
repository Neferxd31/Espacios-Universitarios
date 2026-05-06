from django.core.management.base import BaseCommand

from spaces.models import Area, Space


class Command(BaseCommand):
    help = 'Creates area SB and rooms SB101–SB104, SB2XX, SB3XX, SB4XX (16 spaces).'

    def handle(self, *args, **options):
        area, created = Area.objects.get_or_create(
            code='sb',
            defaults={
                'name': 'Building SB',
                'description': 'SB wing classrooms',
                'sort_order': 10,
            },
        )
        self.stdout.write(
            self.style.NOTICE(
                f"Area SB {'created' if created else 'already present'} (id={area.id})."
            )
        )

        floor_codes = [
            (1, ['101', '102', '103', '104']),
            (2, ['201', '202', '203', '204']),
            (3, ['301', '302', '303', '304']),
            (4, ['401', '402', '403', '404']),
        ]
        for floor, codes in floor_codes:
            for code in codes:
                space, screated = Space.objects.get_or_create(
                    area=area,
                    code=code,
                    defaults={
                        'name': f'SB{code}',
                        'floor': floor,
                        'capacity': 30,
                        'has_air_conditioning': True,
                        'has_computers': False,
                        'has_projector': True,
                        'has_internet': True,
                        'amenities': {},
                        'status': Space.Status.OPERATIONAL,
                    },
                )
                self.stdout.write(
                    f"  SB{code}: {'created' if screated else 'exists'} (id={space.id})"
                )

        self.stdout.write(self.style.SUCCESS('seed_sb finished.'))
