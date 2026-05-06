import secrets
import uuid
from datetime import timedelta

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class Role(models.Model):
    """
    Roles del sistema: Estudiante, Docente, Administrativo, Admin.
    PK es INT auto-increment según el diagrama de BD.
    """

    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=64, unique=True)
    permissions = models.JSONField(
        default=dict,
        blank=True,
        help_text='Mapa de permisos del rol. Ej: {"can_reserve": true, "can_manage_spaces": false}',
    )

    class Meta:
        ordering = ['name']
        db_table = 'roles'

    def __str__(self) -> str:
        return self.name


class User(models.Model):
    """
    Usuario del sistema universitario.
    - email: identificador único para auth.
    - university_code: código institucional (requerido por HU y otros servicios).
    - password_hash: contraseña cifrada con bcrypt.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(max_length=254, unique=True)
    university_code = models.CharField(
        max_length=32,
        unique=True,
        help_text='Código institucional (ej: 1234567). Requerido para identificación interna.',
    )
    password_hash = models.CharField(max_length=255)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    role = models.ForeignKey(
        Role,
        on_delete=models.PROTECT,
        related_name='users',
        db_column='role_id',
    )
    is_active = models.BooleanField(
        default=True,
        help_text='Cuando es False la cuenta queda desactivada lógicamente.',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['university_code']
        db_table = 'users'
        indexes = [
            models.Index(fields=['role', 'is_active'], name='users_role_active_idx'),
            models.Index(fields=['email'], name='users_email_idx'),
        ]

    def __str__(self) -> str:
        return f'{self.university_code} — {self.first_name} {self.last_name}'

    def clean(self) -> None:
        super().clean()
        for field in ('university_code', 'first_name', 'last_name'):
            value = getattr(self, field, None)
            if value is not None and not str(value).strip():
                raise ValidationError({field: f'{field} no puede estar en blanco.'})


class UserSession(models.Model):
    """
    Sesión activa de un usuario — controla los refresh tokens JWT.
    Un usuario puede tener múltiples sesiones (distintos dispositivos).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sessions',
        db_column='user_id',
    )
    refresh_token = models.CharField(max_length=128, unique=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'user_sessions'
        indexes = [
            models.Index(fields=['refresh_token'], name='sessions_refresh_token_idx'),
            models.Index(fields=['user', 'expires_at'], name='sessions_user_expires_idx'),
        ]

    def __str__(self) -> str:
        return f'Session({self.user_id}) expires {self.expires_at}'

    @property
    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at

    @classmethod
    def create_for_user(cls, user: User, ip_address: str | None, expire_days: int) -> 'UserSession':
        return cls.objects.create(
            user=user,
            refresh_token=secrets.token_urlsafe(64),
            ip_address=ip_address,
            expires_at=timezone.now() + timedelta(days=expire_days),
        )
