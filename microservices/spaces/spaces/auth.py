"""
Helpers de autenticación para el microservicio Spaces.
Valida JWT generados por el microservicio Users (misma clave secreta).
"""

from __future__ import annotations

import jwt
from django.conf import settings
from rest_framework.response import Response


def decode_token(token: str) -> dict | None:
    """Decodifica y valida un JWT. Retorna el payload o None si es inválido."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=['HS256'])
        if payload.get('type') != 'access':
            return None
        return payload
    except jwt.PyJWTError:
        return None


def get_token_payload(request) -> tuple[dict | None, Response | None]:
    """
    Extrae el JWT del header Authorization: Bearer <token>.
    Retorna (payload, None) si es válido, o (None, Response 401) si no.
    """
    auth = request.headers.get('Authorization', '')
    if not auth.startswith('Bearer '):
        return None, Response({'detail': 'Autenticación requerida.'}, status=401)
    token = auth.split(' ', 1)[1].strip()
    payload = decode_token(token)
    if not payload:
        return None, Response({'detail': 'Token inválido o expirado.'}, status=401)
    return payload, None


def require_admin(request) -> tuple[dict | None, Response | None]:
    """
    Verifica que el token sea válido y que el rol sea Admin o Administrativo.
    Retorna (payload, None) si ok, o (None, Response error) si no.
    """
    payload, error = get_token_payload(request)
    if error:
        return None, error
    role = (payload.get('role') or '').lower()
    if role not in ('admin', 'administrativo'):
        return None, Response(
            {'detail': 'Se requieren privilegios de administrador.'},
            status=403,
        )
    return payload, None
