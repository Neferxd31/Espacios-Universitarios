import jwt
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView

from .mailer import render_password_reset_email, send_notification
from .models import NotificationHistory
from .serializers import NotificationHistorySerializer


@api_view(['GET'])
def health_check(request):
  return Response({'status': 'ok', 'service': 'notifications'})


def _get_token_payload(request):
  """Decodifica el JWT del header. Retorna (payload, None) o (None, Response error)."""
  auth = request.headers.get('Authorization', '')
  if not auth.startswith('Bearer '):
    return None, Response({'detail': 'Token requerido.'}, status=401)
  token = auth[7:]
  try:
    payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=['HS256'])
    return payload, None
  except jwt.InvalidTokenError:
    return None, Response({'detail': 'Token inválido.'}, status=401)


class NotificationListAPIView(APIView):
  """
  GET /api/v1/notifications/
    Lista las notificaciones del usuario autenticado.
    Soporta ?type=, ?status=.
  """

  def get(self, request):
    payload, error = _get_token_payload(request)
    if error:
      return error

    user_id = payload.get('user_id')
    qs = NotificationHistory.objects.filter(user_id=user_id).order_by('-created_at')

    type_filter = request.query_params.get('type', '').strip()
    if type_filter:
      qs = qs.filter(type=type_filter)

    status_filter = request.query_params.get('status', '').strip()
    if status_filter:
      qs = qs.filter(status=status_filter)

    qs = qs[:100]  # tope simple, paginar luego
    return Response(NotificationHistorySerializer(qs, many=True).data)


class PasswordResetEmailAPIView(APIView):
  """
  POST /api/v1/notifications/password-reset/
  Llamado por el MS users (sync) o por el frontend. Envía el correo.

  Body: { "user_email": "...", "reset_link": "...", "code": "...", "user_id": "..." }
  """

  def post(self, request):
    data = request.data or {}
    email = data.get('user_email')
    if not email:
      return Response({'detail': 'user_email es requerido.'}, status=400)

    reset_link = data.get('reset_link') or (
      f"{settings.FRONTEND_URL}/reset-password?token={data.get('token', '')}"
    )
    subject, body = render_password_reset_email(reset_link, data.get('code'))
    record = send_notification(
      to_email=email,
      notif_type=NotificationHistory.NotificationType.PASSWORD_RESET,
      subject=subject,
      body=body,
      user_id=data.get('user_id'),
    )
    return Response(NotificationHistorySerializer(record).data, status=201)
