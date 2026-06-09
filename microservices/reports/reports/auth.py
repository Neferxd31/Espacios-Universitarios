"""Helpers de auth JWT — el SECRET es compartido entre microservicios."""

import jwt
from django.conf import settings
from rest_framework.response import Response


def get_token_payload(request):
  auth = request.headers.get('Authorization', '')
  if not auth.startswith('Bearer '):
    return None, Response({'detail': 'Token requerido.'}, status=401)
  token = auth[7:]
  try:
    payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=['HS256'])
    return payload, None
  except jwt.InvalidTokenError:
    return None, Response({'detail': 'Token inválido.'}, status=401)


def require_admin(request):
  payload, error = get_token_payload(request)
  if error:
    return None, error
  role = (payload.get('role') or '').lower()
  if role not in ('admin', 'administrativo'):
    return None, Response({'detail': 'Solo administradores.'}, status=403)
  return payload, None
