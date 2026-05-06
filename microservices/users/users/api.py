"""
API del microservicio Users.

Endpoints implementados:
  HU-01  POST   /api/v1/auth/register           — Registro de nuevos usuarios
  HU-02  POST   /api/v1/auth/login              — Inicio de sesión (JWT)
  HU-03  POST   /api/v1/auth/logout             — Cierre de sesión (invalida refresh token)
  HU-04  POST   /api/v1/auth/password-recovery  — Solicitud de recuperación de contraseña
  HU-05  PATCH  /api/v1/users/me/               — Edición de perfil propio

  Internos (consumidos por otros microservicios):
         GET    /api/v1/users/<uuid>/            — Detalle de usuario por ID
         GET    /api/v1/users/resolve/           — Resolución por university_code o email
"""

from __future__ import annotations

import logging

from django.db import transaction
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView

from .auth import (
    decode_access_token,
    generate_access_token,
    get_authenticated_user,
    hash_password,
    verify_password,
)
from .models import Role, User, UserSession
from .serializers import (
    AdminCreateUserSerializer,
    AdminUpdateUserSerializer,
    LoginSerializer,
    RegisterSerializer,
    UpdateProfileSerializer,
    UserPublicSerializer,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_client_ip(request) -> str | None:
    """Extrae la IP real del cliente, considerando proxies."""
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def _require_admin(request):
    """Verifica que el usuario autenticado sea admin o administrativo."""
    user, error = get_authenticated_user(request)
    if error:
        return None, error
    role_name = (user.role.name if user.role else '').lower()
    if role_name not in ('admin', 'administrativo'):
        return None, Response({'detail': 'Se requieren privilegios de administrador.'}, status=403)
    return user, None


def _build_auth_response(user: User, ip: str | None) -> dict:
    """Crea access + refresh token y registra la sesión."""
    role_name = user.role.name if user.role else ''
    access_token = generate_access_token(str(user.id), role_name=role_name)
    session = UserSession.create_for_user(
        user=user,
        ip_address=ip,
        expire_days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS,
    )
    return {
        'access_token': access_token,
        'refresh_token': session.refresh_token,
        'token_type': 'Bearer',
        'expires_in': settings.JWT_ACCESS_TOKEN_EXPIRE_HOURS * 3600,
        'user': UserPublicSerializer(user).data,
    }


# ---------------------------------------------------------------------------
# HU-01 — Registro
# ---------------------------------------------------------------------------

class RegisterAPIView(APIView):
    """POST /api/v1/auth/register"""

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'errors': serializer.errors}, status=400)

        data = serializer.validated_data

        # Determinar rol: role_name > role_id > 'Estudiante' por defecto
        role_name = data.get('role_name')
        role_id = data.get('role_id')

        # Admin no puede asignarse desde el registro público
        FORBIDDEN_ROLES = {'admin'}

        if role_name:
            if role_name.lower() in FORBIDDEN_ROLES:
                role_name = 'Estudiante'
            role = Role.objects.filter(name__iexact=role_name).first()
            if not role:
                return Response({'detail': f'El rol "{role_name}" no existe.'}, status=400)
        elif role_id:
            role = Role.objects.filter(pk=role_id).first()
            if not role:
                return Response({'detail': f'El rol con id={role_id} no existe.'}, status=400)
        else:
            role = Role.objects.filter(name='Estudiante').first()
            if not role:
                return Response(
                    {'detail': 'No existe el rol "Estudiante". Ejecuta el seed de roles primero.'},
                    status=500,
                )

        with transaction.atomic():
            user = User.objects.create(
                email=data['email'],
                university_code=data['university_code'],
                password_hash=hash_password(data['password']),
                first_name=data['first_name'],
                last_name=data['last_name'],
                role=role,
            )

        logger.info('Usuario registrado: %s (%s)', user.university_code, user.email)

        ip = _get_client_ip(request)
        auth_data = _build_auth_response(user, ip)

        return Response(auth_data, status=201)


# ---------------------------------------------------------------------------
# HU-02 — Login
# ---------------------------------------------------------------------------

class LoginAPIView(APIView):
    """POST /api/v1/auth/login"""

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'errors': serializer.errors}, status=400)

        login_value = serializer.validated_data['login'].strip()
        password = serializer.validated_data['password']

        # Buscar por email o código universitario
        user = (
            User.objects.select_related('role')
            .filter(email__iexact=login_value)
            .first()
            or User.objects.select_related('role')
            .filter(university_code__iexact=login_value)
            .first()
        )

        if not user:
            return Response(
                {'detail': 'Credenciales inválidas.'},
                status=401,
            )

        if not user.is_active:
            return Response(
                {'detail': 'Tu cuenta está desactivada. Contacta al administrador.'},
                status=403,
            )

        if not verify_password(password, user.password_hash):
            return Response(
                {'detail': 'Credenciales inválidas.'},
                status=401,
            )

        # Limpiar sesiones expiradas del usuario antes de crear una nueva
        UserSession.objects.filter(user=user, expires_at__lt=timezone.now()).delete()

        ip = _get_client_ip(request)
        auth_data = _build_auth_response(user, ip)

        logger.info('Login exitoso: %s desde %s', user.university_code, ip)

        return Response(auth_data, status=200)


# ---------------------------------------------------------------------------
# HU-03 — Logout
# ---------------------------------------------------------------------------

class LogoutAPIView(APIView):
    """POST /api/v1/auth/logout"""

    def post(self, request):
        user, error = get_authenticated_user(request)
        if error:
            return error

        refresh_token = request.data.get('refresh_token')
        if not refresh_token:
            return Response(
                {'detail': 'Se requiere el refresh_token en el cuerpo de la petición.'},
                status=400,
            )

        deleted, _ = UserSession.objects.filter(
            user=user,
            refresh_token=refresh_token,
        ).delete()

        if deleted == 0:
            return Response(
                {'detail': 'Sesión no encontrada o ya cerrada.'},
                status=404,
            )

        logger.info('Logout: usuario %s cerró sesión.', user.university_code)

        return Response({'detail': 'Sesión cerrada exitosamente.'}, status=200)


# ---------------------------------------------------------------------------
# HU-04 — Recuperación de contraseña
# ---------------------------------------------------------------------------

class PasswordRecoveryAPIView(APIView):
    """
    POST /api/v1/auth/password-recovery

    En producción, este endpoint publicaría un evento a RabbitMQ para que
    el microservicio de Notificaciones envíe el correo de recuperación.
    Por ahora retorna un token de recuperación directamente (solo en DEBUG).
    """

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({'detail': 'Se requiere el campo email.'}, status=400)

        user = User.objects.filter(email__iexact=email, is_active=True).first()

        # Siempre responder con 200 para no revelar si el email existe (seguridad)
        base_response = {
            'detail': (
                'Si el correo está registrado, recibirás un enlace de recuperación. '
                'Revisa tu bandeja de entrada.'
            )
        }

        if not user:
            return Response(base_response, status=200)

        # Generar token de recuperación temporal (válido 1 hora)
        recovery_token = generate_access_token(str(user.id))

        # TODO: publicar evento ResetPasswordRequested → Notifications MS (RabbitMQ)
        # Por ahora, en modo DEBUG se retorna el token para pruebas
        if settings.DEBUG:
            base_response['debug_reset_token'] = recovery_token
            base_response['debug_note'] = (
                'Este campo solo aparece en modo DEBUG. '
                'En producción se enviaría por email.'
            )

        logger.info('Recuperación de contraseña solicitada para: %s', email)

        return Response(base_response, status=200)


# ---------------------------------------------------------------------------
# HU-05 — Edición de perfil
# ---------------------------------------------------------------------------

class UpdateProfileAPIView(APIView):
    """PATCH /api/v1/users/me/"""

    def patch(self, request):
        user, error = get_authenticated_user(request)
        if error:
            return error

        serializer = UpdateProfileSerializer(
            data=request.data,
            context={'user': user},
        )
        if not serializer.is_valid():
            return Response({'errors': serializer.errors}, status=400)

        data = serializer.validated_data
        updated_fields = []

        if 'first_name' in data:
            user.first_name = data['first_name']
            updated_fields.append('first_name')
        if 'last_name' in data:
            user.last_name = data['last_name']
            updated_fields.append('last_name')
        if 'email' in data:
            user.email = data['email']
            updated_fields.append('email')

        if not updated_fields:
            return Response(
                {'detail': 'No se enviaron campos para actualizar.'},
                status=400,
            )

        user.save(update_fields=updated_fields + ['updated_at'])

        logger.info(
            'Perfil actualizado para %s: %s',
            user.university_code,
            ', '.join(updated_fields),
        )

        return Response(UserPublicSerializer(user).data, status=200)

    def get(self, request):
        """GET /api/v1/users/me/ — devuelve el perfil del usuario autenticado."""
        user, error = get_authenticated_user(request)
        if error:
            return error
        return Response(UserPublicSerializer(user).data, status=200)


# ---------------------------------------------------------------------------
# Endpoints internos (consumidos por otros microservicios)
# ---------------------------------------------------------------------------

class UserDetailAPIView(APIView):
    """GET /api/v1/users/<uuid>/"""

    def get(self, request, pk):
        user = get_object_or_404(User.objects.select_related('role'), pk=pk)
        return Response(UserPublicSerializer(user).data)


class UserResolveAPIView(APIView):
    """
    GET /api/v1/users/resolve/?university_code=<code>
    GET /api/v1/users/resolve/?email=<email>

    Usado por otros microservicios (ej: Reservations) para validar
    la identidad de un usuario y obtener su UUID.
    """

    def get(self, request):
        code = request.query_params.get('university_code', '').strip()
        email = request.query_params.get('email', '').strip()

        if not code and not email:
            return Response(
                {'detail': 'Se requiere university_code o email como parámetro de consulta.'},
                status=400,
            )

        qs = User.objects.select_related('role')

        if code:
            user = qs.filter(university_code__iexact=code).first()
        else:
            user = qs.filter(email__iexact=email).first()

        if not user:
            return Response({'detail': 'Usuario no encontrado.'}, status=404)

        return Response(UserPublicSerializer(user).data)


# ---------------------------------------------------------------------------
# HU-04 — Restablecer contraseña con token temporal
# ---------------------------------------------------------------------------

class ResetPasswordAPIView(APIView):
    """POST /api/v1/auth/reset-password"""

    def post(self, request):
        token = request.data.get('token', '').strip()
        new_password = request.data.get('new_password', '')

        if not token or not new_password:
            return Response(
                {'detail': 'Se requieren los campos token y new_password.'},
                status=400,
            )
        if len(new_password) < 8:
            return Response(
                {'detail': 'La contraseña debe tener al menos 8 caracteres.'},
                status=400,
            )

        try:
            payload = decode_access_token(token)
            if payload.get('type') != 'access':
                return Response({'detail': 'Token inválido.'}, status=400)
            user_id = payload.get('user_id')
            user = User.objects.filter(pk=user_id, is_active=True).first()
            if not user:
                return Response({'detail': 'Token inválido o usuario no encontrado.'}, status=400)
        except Exception:
            return Response({'detail': 'Token inválido o expirado.'}, status=400)

        user.password_hash = hash_password(new_password)
        user.save(update_fields=['password_hash', 'updated_at'])
        UserSession.objects.filter(user=user).delete()

        logger.info('Contraseña restablecida para: %s', user.email)
        return Response({'detail': 'Contraseña actualizada exitosamente.'})


# ---------------------------------------------------------------------------
# HU-16, 17, 18, 19 — Gestión de usuarios (Admin)
# ---------------------------------------------------------------------------

class AdminUserListCreateAPIView(APIView):
    """
    GET  /api/v1/admin/users/ — Listar todos los usuarios (HU-17)
    POST /api/v1/admin/users/ — Crear usuario (HU-16)
    """

    def get(self, request):
        admin_user, error = _require_admin(request)
        if error:
            return error

        qs = User.objects.select_related('role').order_by('-created_at')

        search = request.query_params.get('search', '').strip()
        role_name = request.query_params.get('role', '').strip()
        is_active_param = request.query_params.get('is_active', '').strip()

        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search) |
                Q(university_code__icontains=search)
            )
        if role_name:
            qs = qs.filter(role__name__iexact=role_name)
        if is_active_param in ('true', 'false'):
            qs = qs.filter(is_active=(is_active_param == 'true'))

        return Response({
            'count': qs.count(),
            'results': UserPublicSerializer(qs, many=True).data,
        })

    def post(self, request):
        admin_user, error = _require_admin(request)
        if error:
            return error

        serializer = AdminCreateUserSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'errors': serializer.errors}, status=400)

        data = serializer.validated_data
        role_name = data.get('role_name', 'Estudiante')
        role = Role.objects.filter(name__iexact=role_name).first()
        if not role:
            return Response({'detail': f'El rol "{role_name}" no existe.'}, status=400)

        with transaction.atomic():
            user = User.objects.create(
                email=data['email'],
                university_code=data['university_code'],
                password_hash=hash_password(data['password']),
                first_name=data['first_name'],
                last_name=data['last_name'],
                role=role,
                is_active=data.get('is_active', True),
            )

        logger.info('Admin %s creó usuario: %s', admin_user.university_code, user.university_code)
        return Response(UserPublicSerializer(user).data, status=201)


class AdminUserDetailAPIView(APIView):
    """
    GET    /api/v1/admin/users/<uuid>/ — Detalle (HU-17)
    PATCH  /api/v1/admin/users/<uuid>/ — Editar (HU-18)
    DELETE /api/v1/admin/users/<uuid>/ — Desactivar (HU-19)
    """

    def get(self, request, pk):
        admin_user, error = _require_admin(request)
        if error:
            return error
        user = get_object_or_404(User.objects.select_related('role'), pk=pk)
        return Response(UserPublicSerializer(user).data)

    def patch(self, request, pk):
        admin_user, error = _require_admin(request)
        if error:
            return error
        user = get_object_or_404(User.objects.select_related('role'), pk=pk)

        serializer = AdminUpdateUserSerializer(data=request.data, context={'user': user})
        if not serializer.is_valid():
            return Response({'errors': serializer.errors}, status=400)

        data = serializer.validated_data
        updated = []

        if 'first_name' in data:
            user.first_name = data['first_name']
            updated.append('first_name')
        if 'last_name' in data:
            user.last_name = data['last_name']
            updated.append('last_name')
        if 'email' in data:
            user.email = data['email']
            updated.append('email')
        if 'is_active' in data:
            user.is_active = data['is_active']
            updated.append('is_active')
        if 'role_name' in data:
            role = Role.objects.filter(name__iexact=data['role_name']).first()
            if not role:
                return Response({'detail': f'El rol "{data["role_name"]}" no existe.'}, status=400)
            user.role = role
            updated.append('role')

        if not updated:
            return Response({'detail': 'No se enviaron campos para actualizar.'}, status=400)

        plain_fields = [f for f in updated if f != 'role'] + ['updated_at']
        if 'role' in updated:
            plain_fields.append('role')
        user.save(update_fields=plain_fields)
        user.refresh_from_db()

        logger.info('Admin %s editó usuario: %s', admin_user.university_code, user.university_code)
        return Response(UserPublicSerializer(user).data)

    def delete(self, request, pk):
        admin_user, error = _require_admin(request)
        if error:
            return error
        user = get_object_or_404(User, pk=pk)

        if str(user.pk) == str(admin_user.pk):
            return Response({'detail': 'No puedes desactivar tu propia cuenta.'}, status=400)

        user.is_active = False
        user.save(update_fields=['is_active', 'updated_at'])
        UserSession.objects.filter(user=user).delete()

        logger.info('Admin %s desactivó usuario: %s', admin_user.university_code, user.university_code)
        return Response({'detail': 'Usuario desactivado exitosamente.'})


# ---------------------------------------------------------------------------
# Endpoint de salud
# ---------------------------------------------------------------------------

@api_view(['GET'])
def health_check(request):
    return Response({'status': 'ok', 'service': 'users'})
