from rest_framework import serializers

from .models import Role, User, UserSession


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ('id', 'name', 'permissions')
        read_only_fields = fields


class UserPublicSerializer(serializers.ModelSerializer):
    """Serializer de lectura — nunca expone password_hash."""

    role = RoleSerializer(read_only=True)

    class Meta:
        model = User
        fields = (
            'id',
            'email',
            'university_code',
            'first_name',
            'last_name',
            'role',
            'is_active',
            'created_at',
            'updated_at',
        )
        read_only_fields = fields


# Alias para compatibilidad con el microservicio de reservations
UserSerializer = UserPublicSerializer


class RegisterSerializer(serializers.Serializer):
    """HU-01 — Registro de nuevos usuarios."""

    email = serializers.EmailField()
    university_code = serializers.CharField(max_length=32)
    password = serializers.CharField(min_length=8, write_only=True)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    role_id = serializers.IntegerField(required=False, default=None)
    role_name = serializers.CharField(max_length=64, required=False, default=None)

    def validate_email(self, value: str) -> str:
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Ya existe un usuario con este correo electrónico.')
        return value

    def validate_university_code(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError('El código universitario no puede estar en blanco.')
        if User.objects.filter(university_code__iexact=value).exists():
            raise serializers.ValidationError('Ya existe un usuario con este código universitario.')
        return value

    def validate_first_name(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError('El nombre no puede estar en blanco.')
        return value

    def validate_last_name(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError('El apellido no puede estar en blanco.')
        return value


class LoginSerializer(serializers.Serializer):
    """HU-02 — Inicio de sesión (por email o código universitario)."""

    login = serializers.CharField(
        help_text='Email institucional o código universitario.'
    )
    password = serializers.CharField(write_only=True)


class UpdateProfileSerializer(serializers.Serializer):
    """HU-05 — Edición de perfil."""

    first_name = serializers.CharField(max_length=150, required=False)
    last_name = serializers.CharField(max_length=150, required=False)
    email = serializers.EmailField(required=False)

    def validate_first_name(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError('El nombre no puede estar en blanco.')
        return value

    def validate_last_name(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError('El apellido no puede estar en blanco.')
        return value

    def validate_email(self, value: str) -> str:
        value = value.strip().lower()
        user = self.context.get('user')
        qs = User.objects.filter(email__iexact=value)
        if user:
            qs = qs.exclude(pk=user.pk)
        if qs.exists():
            raise serializers.ValidationError('Este correo ya está en uso.')
        return value


class UserSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSession
        fields = ('id', 'ip_address', 'expires_at', 'created_at')
        read_only_fields = fields


# ---------------------------------------------------------------------------
# Admin serializers (HU-16, 17, 18, 19)
# ---------------------------------------------------------------------------

class AdminCreateUserSerializer(serializers.Serializer):
    """Admin — crear usuario con cualquier rol (HU-16)."""
    email = serializers.EmailField()
    university_code = serializers.CharField(max_length=32)
    password = serializers.CharField(min_length=8, write_only=True)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    role_name = serializers.CharField(max_length=64, default='Estudiante')
    is_active = serializers.BooleanField(default=True)

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Ya existe un usuario con este correo electrónico.')
        return value

    def validate_university_code(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('El código no puede estar en blanco.')
        if User.objects.filter(university_code__iexact=value).exists():
            raise serializers.ValidationError('Ya existe un usuario con este código universitario.')
        return value


class AdminUpdateUserSerializer(serializers.Serializer):
    """Admin — editar datos o rol de un usuario (HU-18)."""
    first_name = serializers.CharField(max_length=150, required=False)
    last_name = serializers.CharField(max_length=150, required=False)
    email = serializers.EmailField(required=False)
    role_name = serializers.CharField(max_length=64, required=False)
    is_active = serializers.BooleanField(required=False)

    def validate_email(self, value):
        value = value.strip().lower()
        user = self.context.get('user')
        qs = User.objects.filter(email__iexact=value)
        if user:
            qs = qs.exclude(pk=user.pk)
        if qs.exists():
            raise serializers.ValidationError('Este correo ya está en uso.')
        return value

    def validate_first_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('El nombre no puede estar en blanco.')
        return value

    def validate_last_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('El apellido no puede estar en blanco.')
        return value
