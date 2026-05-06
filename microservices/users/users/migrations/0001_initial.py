import django.db.models.deletion
import django.utils.timezone
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        # ------------------------------------------------------------------ #
        # Roles                                                               #
        # ------------------------------------------------------------------ #
        migrations.CreateModel(
            name='Role',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=64, unique=True)),
                ('permissions', models.JSONField(
                    blank=True,
                    default=dict,
                    help_text='Mapa de permisos del rol.',
                )),
            ],
            options={
                'ordering': ['name'],
                'db_table': 'roles',
            },
        ),
        # ------------------------------------------------------------------ #
        # Users                                                               #
        # ------------------------------------------------------------------ #
        migrations.CreateModel(
            name='User',
            fields=[
                ('id', models.UUIDField(
                    default=uuid.uuid4, editable=False, primary_key=True, serialize=False,
                )),
                ('email', models.EmailField(max_length=254, unique=True)),
                ('university_code', models.CharField(max_length=32, unique=True)),
                ('password_hash', models.CharField(max_length=255)),
                ('first_name', models.CharField(max_length=150)),
                ('last_name', models.CharField(max_length=150)),
                ('role', models.ForeignKey(
                    db_column='role_id',
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='users',
                    to='users.role',
                )),
                ('is_active', models.BooleanField(
                    default=True,
                    help_text='Cuando es False la cuenta queda desactivada lógicamente.',
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['university_code'],
                'db_table': 'users',
            },
        ),
        migrations.AddIndex(
            model_name='user',
            index=models.Index(fields=['role', 'is_active'], name='users_role_active_idx'),
        ),
        migrations.AddIndex(
            model_name='user',
            index=models.Index(fields=['email'], name='users_email_idx'),
        ),
        # ------------------------------------------------------------------ #
        # UserSessions                                                        #
        # ------------------------------------------------------------------ #
        migrations.CreateModel(
            name='UserSession',
            fields=[
                ('id', models.UUIDField(
                    default=uuid.uuid4, editable=False, primary_key=True, serialize=False,
                )),
                ('user', models.ForeignKey(
                    db_column='user_id',
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='sessions',
                    to='users.user',
                )),
                ('refresh_token', models.CharField(max_length=128, unique=True)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('expires_at', models.DateTimeField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'db_table': 'user_sessions',
            },
        ),
        migrations.AddIndex(
            model_name='usersession',
            index=models.Index(fields=['refresh_token'], name='sessions_refresh_token_idx'),
        ),
        migrations.AddIndex(
            model_name='usersession',
            index=models.Index(fields=['user', 'expires_at'], name='sessions_user_expires_idx'),
        ),
    ]
