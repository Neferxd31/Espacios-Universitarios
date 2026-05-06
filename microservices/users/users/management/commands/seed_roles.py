"""
Management command: seed_roles

Crea los roles iniciales del sistema si no existen.
Uso: python manage.py seed_roles
"""

from django.core.management.base import BaseCommand

from users.models import Role

ROLES = [
    {
        'name': 'Estudiante',
        'permissions': {
            'can_view_spaces': True,
            'can_reserve': True,
            'can_cancel_own': True,
            'can_manage_users': False,
            'can_manage_spaces': False,
            'can_view_reports': False,
        },
    },
    {
        'name': 'Docente',
        'permissions': {
            'can_view_spaces': True,
            'can_reserve': True,
            'can_cancel_own': True,
            'can_manage_users': False,
            'can_manage_spaces': False,
            'can_view_reports': True,
            'priority_reservation': True,
        },
    },
    {
        'name': 'Administrativo',
        'permissions': {
            'can_view_spaces': True,
            'can_reserve': True,
            'can_cancel_own': True,
            'can_cancel_any': True,
            'can_manage_users': True,
            'can_manage_spaces': True,
            'can_view_reports': True,
        },
    },
    {
        'name': 'Admin',
        'permissions': {
            'can_view_spaces': True,
            'can_reserve': True,
            'can_cancel_own': True,
            'can_cancel_any': True,
            'can_manage_users': True,
            'can_manage_spaces': True,
            'can_view_reports': True,
            'can_manage_config': True,
            'is_superadmin': True,
        },
    },
]


class Command(BaseCommand):
    help = 'Crea los roles iniciales del sistema (Estudiante, Docente, Administrativo, Admin).'

    def handle(self, *args, **options):
        created_count = 0
        for role_data in ROLES:
            role, created = Role.objects.get_or_create(
                name=role_data['name'],
                defaults={'permissions': role_data['permissions']},
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'  ✓ Rol creado: {role.name} (id={role.id})'))
                created_count += 1
            else:
                self.stdout.write(f'  – Rol ya existe: {role.name} (id={role.id})')

        if created_count:
            self.stdout.write(self.style.SUCCESS(f'\n{created_count} rol(es) creado(s) exitosamente.'))
        else:
            self.stdout.write('\nTodos los roles ya existían.')
