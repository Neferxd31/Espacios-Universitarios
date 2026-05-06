"""
JWT auth helpers for the Reservations microservice.
Validates tokens issued by the Users MS (shared secret).
"""

from __future__ import annotations

import jwt
from django.conf import settings
from rest_framework.response import Response


def decode_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=['HS256'])
        if payload.get('type') != 'access':
            return None
        return payload
    except jwt.PyJWTError:
        return None


def get_token_payload(request) -> tuple[dict | None, Response | None]:
    auth = request.headers.get('Authorization', '')
    if not auth.startswith('Bearer '):
        return None, Response({'detail': 'Autenticación requerida.'}, status=401)
    token = auth.split(' ', 1)[1].strip()
    payload = decode_token(token)
    if not payload:
        return None, Response({'detail': 'Token inválido o expirado.'}, status=401)
    return payload, None
