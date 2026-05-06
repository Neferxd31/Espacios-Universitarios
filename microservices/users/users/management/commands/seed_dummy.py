from django.core.management.base import BaseCommand

from users.models import Role, User


class Command(BaseCommand):
    help = 'Creates the admin role and a demo user (university_code=dummy) if missing.'

    def handle(self, *args, **options):
        role, _ = Role.objects.get_or_create(
            name='admin',
            defaults={'description': 'System administrator'},
        )
        user, created = User.objects.update_or_create(
            university_code='dummy',
            defaults={
                'first_name': 'Dummy',
                'last_name': 'User',
                'email': 'dummy@university.example.edu',
                'role': role,
                'is_active': True,
            },
        )
        action = 'Created' if created else 'Updated'
        self.stdout.write(
            self.style.SUCCESS(f'{action} user {user.university_code} (id={user.id}) with role {role.name}.')
        )
