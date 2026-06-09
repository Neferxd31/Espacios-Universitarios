"""
Envío de correos — wrapper alrededor de django.core.mail.

Por defecto usa el console backend (loguea en stdout). Cuando se configuren las
variables SMTP (EMAIL_HOST, EMAIL_HOST_USER, EMAIL_HOST_PASSWORD), basta con
poner EMAIL_BACKEND='django.core.mail.backends.smtp.EmailBackend' en el .env.

Toda llamada deja registro en NotificationHistory para auditoría.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from .models import NotificationHistory

logger = logging.getLogger(__name__)


def send_notification(
  *,
  to_email: str,
  notif_type: str,
  subject: str,
  body: str,
  user_id: Optional[str] = None,
  reservation_id: Optional[str] = None,
) -> NotificationHistory:
  """
  Envía un correo y registra el resultado en NotificationHistory.
  Nunca lanza excepción al llamador — si SMTP falla, queda como 'failed'.
  """
  record = NotificationHistory.objects.create(
    reservation_id=reservation_id,
    user_id=user_id,
    user_email=to_email,
    type=notif_type,
    subject=subject,
    body=body,
    status=NotificationHistory.Status.PENDING,
  )

  try:
    send_mail(
      subject=subject,
      message=body,
      from_email=settings.DEFAULT_FROM_EMAIL,
      recipient_list=[to_email],
      fail_silently=False,
    )
    record.status = NotificationHistory.Status.SENT
    record.sent_at = timezone.now()
    record.save(update_fields=['status', 'sent_at'])
    logger.info('Correo %s enviado a %s', notif_type, to_email)
  except Exception as exc:
    record.status = NotificationHistory.Status.FAILED
    record.error_message = str(exc)[:1000]
    record.save(update_fields=['status', 'error_message'])
    logger.error('Fallo envío correo %s a %s: %s', notif_type, to_email, exc)

  return record


# ---------------------------------------------------------------------------
# Plantillas — texto plano por simplicidad. Pueden migrarse a templates HTML
# más adelante sin tocar el resto del flujo.
# ---------------------------------------------------------------------------

def render_reservation_email(event_type: str, payload: dict) -> tuple[str, str]:
  """Devuelve (subject, body) para un evento de reservas."""
  date = payload.get('reservation_date', '')
  start = payload.get('start_hour', '')
  end = payload.get('end_hour', '')
  space = payload.get('space_label') or payload.get('space_id', '')
  notes = payload.get('notes', '') or ''
  base = f'Espacio: {space}\nFecha: {date}\nHorario: {start}:00 a {end}:00\n'

  mapping = {
    'ReservationCreated': (
      'Reserva creada — pendiente de aprobación',
      f'Tu solicitud de reserva fue registrada y está pendiente de aprobación.\n\n{base}',
    ),
    'ReservationApproved': (
      'Reserva aprobada ✓',
      f'¡Tu reserva fue aprobada!\n\n{base}' + (f'\nObservaciones: {notes}' if notes else ''),
    ),
    'ReservationRejected': (
      'Reserva rechazada',
      f'Lamentablemente tu reserva no fue aprobada.\n\n{base}' + (f'\nMotivo: {notes}' if notes else ''),
    ),
    'ReservationCancelled': (
      'Reserva cancelada',
      f'Tu reserva fue cancelada.\n\n{base}',
    ),
  }
  return mapping.get(event_type, (f'Notificación: {event_type}', base))


def render_password_reset_email(reset_link: str, code: str | None = None) -> tuple[str, str]:
  subject = 'Recuperación de contraseña — Espacios UFPS'
  body = (
    'Recibimos una solicitud para restablecer tu contraseña.\n\n'
    f'Abre el siguiente enlace para continuar:\n{reset_link}\n'
  )
  if code:
    body += f'\nO usa el código temporal: {code}\n'
  body += '\nSi tú no solicitaste este cambio, ignora este mensaje.'
  return subject, body


def render_reminder_email(payload: dict) -> tuple[str, str]:
  date = payload.get('reservation_date', '')
  start = payload.get('start_hour', '')
  end = payload.get('end_hour', '')
  space = payload.get('space_label') or payload.get('space_id', '')
  subject = 'Recordatorio de reserva próxima'
  body = (
    f'Te recordamos tu reserva próxima:\n\n'
    f'Espacio: {space}\nFecha: {date}\nHorario: {start}:00 a {end}:00\n'
  )
  return subject, body


def event_to_notification_type(event_type: str) -> str:
  mapping = {
    'ReservationCreated': NotificationHistory.NotificationType.RESERVATION_CREATED,
    'ReservationApproved': NotificationHistory.NotificationType.RESERVATION_APPROVED,
    'ReservationRejected': NotificationHistory.NotificationType.RESERVATION_REJECTED,
    'ReservationCancelled': NotificationHistory.NotificationType.RESERVATION_CANCELLED,
  }
  return mapping.get(event_type, event_type)
