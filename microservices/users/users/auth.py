"""
Helpers de autenticación: hashing de contraseñas y generación/validación de JWT.
"""

from __future__ import annotations

import datetime

import bcrypt
import jwt
from django.conf import settings
from rest_framework.response import Response


# ---------------------------------------------------------------------------
# Contraseñas
# ---------------------------------------------------------------------------

def hash_password(plain: str) -> str:
    """Devuelve el hash bcrypt de una contraseña en texto plano."""
    return bcrypt.hashpw(plain.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(plain: str, hashed: str) -> bool:
    """Compara una contraseña en texto plano contra su hash bcrypt."""
    return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))


# ---------------------------------------------------------------------------
# Tokens JWT
# ---------------------------------------------------------------------------

def generate_access_token(user_id: str, role_name: str = '') -> str:
    """Genera un access token JWT con expiración configurada en settings."""
    payload = {
        'user_id': user_id,
        'role': role_name,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(
            hours=settings.JWT_ACCESS_TOKEN_EXPIRE_HOURS
        ),
        'iat': datetime.datetime.utcnow(),
        'type': 'access',
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm='HS256')


def decode_access_token(token: str) -> dict:
    """
    Decodifica y valida un access token JWT.
    Lanza jwt.ExpiredSignatureError o jwt.InvalidTokenError en caso de error.
    """
    return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=['HS256'])


# ---------------------------------------------------------------------------
# Extracción del usuario autenticado desde el request
# ---------------------------------------------------------------------------

def get_authenticated_user(request):
    """
    Extrae y valida el Bearer token del encabezado Authorization.
    Retorna (user, None) si es válido, o (None, Response 401) si no.
    """
    from .models import User

    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None, Response(
            {'detail': 'Autenticación requerida. Incluye el header Authorization: Bearer <token>.'},
            status=401,
        )

    token = auth_header.split(' ', 1)[1].strip()

    try:
        payload = decode_access_token(token)
        if payload.get('type') != 'access':
            raise jwt.InvalidTokenError('Token type mismatch.')
        user = User.objects.select_related('role').get(pk=payload['user_id'], is_active=True)
        return user, None

    except jwt.ExpiredSignatureError:
        return None, Response({'detail': 'El token de acceso ha expirado.'}, status=401)

    except (jwt.InvalidTokenError, User.DoesNotExist):
        return None, Response({'detail': 'Token inválido o usuario no encontrado.'}, status=401)
