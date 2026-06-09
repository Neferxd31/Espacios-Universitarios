"""
seed_demo — Hard reset + datos coherentes para demo.

Crea:
- 4 roles (Estudiante, Docente, Administrativo, Admin)
- 6 usuarios con UUIDs fijos (referenciados desde otros MS)
  · 1152307 / 12345678A  → Nefer Sneyder Rojas (Estudiante)
  · admin001 / admin1234 → Carlos Admin (Admin)
  · más 4 usuarios extra para variedad

Uso: docker compose exec users python manage.py seed_demo
"""

from django.core.management.base import BaseCommand
from django.db import connection

from users.auth import hash_password
from users.models import Role, User, UserSession


# UUIDs fijos compartidos entre microservicios
USER_UUIDS = {
    'nefer':   '00000000-0000-0000-0000-000000000001',
    'admin':   '00000000-0000-0000-0000-000000000002',
    'maria':   '00000000-0000-0000-0000-000000000003',
    'juan':    '00000000-0000-0000-0000-000000000004',
    'ana':     '00000000-0000-0000-0000-000000000005',
    'pedro':   '00000000-0000-0000-0000-000000000006',
}

ROLES = [
    ('Estudiante', {
        'can_view_spaces': True, 'can_reserve': True, 'can_cancel_own': True,
    }),
    ('Docente', {
        'can_view_spaces': True, 'can_reserve': True, 'can_cancel_own': True,
        'priority_reservation': True, 'can_view_reports': True,
    }),
    ('Administrativo', {
        'can_view_spaces': True, 'can_reserve': True, 'can_cancel_any': True,
        'can_manage_users': True, 'can_manage_spaces': True, 'can_view_reports': True,
    }),
    ('Admin', {
        'can_view_spaces': True, 'can_reserve': True, 'can_cancel_any': True,
        'can_manage_users': True, 'can_manage_spaces': True, 'can_view_reports': True,
        'can_manage_config': True, 'is_superadmin': True,
    }),
]


class Command(BaseCommand):
    help = 'Hard reset + seed coherente para demo.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('▶ Borrando todos los datos de users-db...'))
        with connection.cursor() as cur:
            cur.execute('TRUNCATE user_sessions, users, roles RESTART IDENTITY CASCADE;')

        self.stdout.write('▶ Creando roles...')
        role_map = {}
        for name, perms in ROLES:
            role = Role.objects.create(name=name, permissions=perms)
            role_map[name] = role
            self.stdout.write(f'  ✓ Rol {name} (id={role.id})')

        self.stdout.write('▶ Creando usuarios...')

        users_data = [
            # (uuid_key, university_code, email, first_name, last_name, role, password)
            ('nefer',   '1152307',   'nefer.rojas@ufps.edu.co',   'Nefer Sneyder', 'Rojas Contreras', 'Estudiante',     '12345678A'),
            ('admin',   'admin001',  'admin@ufps.edu.co',          'Carlos',         'Administrador',   'Admin',          'admin1234'),
            ('maria',   '1152888',   'maria.gomez@ufps.edu.co',    'María Camila',   'Gómez Peña',     'Docente',        'Docente123'),
            ('juan',    '1152444',   'juan.perez@ufps.edu.co',     'Juan David',     'Pérez Suárez',   'Estudiante',     'Estudiante1'),
            ('ana',     '1152555',   'ana.lopez@ufps.edu.co',      'Ana María',      'López Vargas',   'Estudiante',     'Estudiante1'),
            ('pedro',   '1152666',   'pedro.morales@ufps.edu.co',  'Pedro José',     'Morales Díaz',   'Administrativo', 'Personal123'),
        ]

        for key, code, email, first, last, role_name, password in users_data:
            u = User.objects.create(
                id=USER_UUIDS[key],
                university_code=code,
                email=email,
                password_hash=hash_password(password),
                first_name=first,
                last_name=last,
                role=role_map[role_name],
                is_active=True,
            )
            self.stdout.write(
                f'  ✓ {u.university_code:<10} {u.first_name} {u.last_name} ({role_name})'
            )

        self.stdout.write(self.style.SUCCESS('\n✓ users-db sembrada.'))
        self.stdout.write('\nCredenciales:')
        self.stdout.write('  • 1152307  / 12345678A   (Nefer — Estudiante)')
        self.stdout.write('  • admin001 / admin1234   (Admin)')
        self.stdout.write('  • 1152888  / Docente123  (María — Docente)')
        self.stdout.write('  • 1152444  / Estudiante1 (Juan — Estudiante)')
        self.stdout.write('  • 1152555  / Estudiante1 (Ana — Estudiante)')
        self.stdout.write('  • 1152666  / Personal123 (Pedro — Administrativo)')
