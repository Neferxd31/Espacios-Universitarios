"""
Consumer RabbitMQ — escucha eventos publicados por reservations
y dispara correos al usuario solicitante.

Eventos consumidos del exchange 'reservations' (topic, durable):
  - ReservationCreated
  - ReservationApproved   → además programa el recordatorio (HU-15)
  - ReservationRejected
  - ReservationCancelled  → además cancela recordatorios pendientes

Y del exchange 'users':
  - PasswordResetRequested

Diseñado para correrse vía `python manage.py consume_events`.
"""

from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timedelta

from django.conf import settings
from django.utils import timezone

from .mailer import (
  event_to_notification_type,
  render_password_reset_email,
  render_reservation_email,
  send_notification,
)
from .models import NotificationHistory, ScheduledReminder

logger = logging.getLogger(__name__)

# Bajar verbosidad de pika — solo errores reales en logs
logging.getLogger('pika').setLevel(logging.WARNING)

RESERVATIONS_EXCHANGE = 'reservations'
USERS_EXCHANGE = 'users'

RESERVATIONS_QUEUE = 'notifications.reservations'
USERS_QUEUE = 'notifications.users'


def _resolve_recipient_email(payload: dict) -> str | None:
  """
  El payload puede traer 'user_email' directamente. Si no, retorna None y
  se omite el envío (en el futuro: llamar a users MS para resolver el email).
  """
  email = payload.get('user_email')
  if email:
    return email
  # Si llega un payload sin email (publisher antiguo o evento manual), se
  # omite el envío. Podría resolverse vía users MS, pero hoy todos los
  # publishers en este repo incluyen user_email.
  logger.warning('Payload sin user_email — se omite envío: %s', payload)
  return None


def _handle_reservation_event(event_type: str, payload: dict) -> None:
  reservation_id = payload.get('reservation_id')
  user_id = payload.get('requester_user_id') or payload.get('user_id')
  email = _resolve_recipient_email(payload)
  if not email:
    return

  subject, body = render_reservation_email(event_type, payload)
  send_notification(
    to_email=email,
    notif_type=event_to_notification_type(event_type),
    subject=subject,
    body=body,
    user_id=user_id,
    reservation_id=reservation_id,
  )

  # HU-15: al aprobarse, programar recordatorio
  if event_type == 'ReservationApproved':
    _schedule_reminder(payload)

  # Al cancelarse/rechazarse, cancelar recordatorios pendientes
  if event_type in ('ReservationCancelled', 'ReservationRejected') and reservation_id:
    ScheduledReminder.objects.filter(
      reservation_id=reservation_id,
      status=ScheduledReminder.Status.PENDING,
    ).update(status=ScheduledReminder.Status.CANCELLED)


def _schedule_reminder(payload: dict) -> None:
  try:
    reservation_id = payload['reservation_id']
    user_id = payload.get('requester_user_id') or payload.get('user_id')
    email = payload.get('user_email')
    date_str = payload['reservation_date']
    start_hour = int(payload['start_hour'])
    end_hour = int(payload.get('end_hour', start_hour + 1))
  except (KeyError, TypeError, ValueError):
    logger.warning('Payload inválido para recordatorio: %s', payload)
    return

  if not email:
    return

  reservation_date = datetime.fromisoformat(date_str).date()
  reservation_dt = timezone.make_aware(
    datetime.combine(reservation_date, datetime.min.time()).replace(hour=start_hour)
  )
  trigger_time = reservation_dt - timedelta(hours=settings.REMINDER_HOURS_BEFORE)

  ScheduledReminder.objects.update_or_create(
    reservation_id=reservation_id,
    defaults={
      'user_id': user_id,
      'user_email': email,
      'space_label': payload.get('space_label', '') or str(payload.get('space_id', '')),
      'reservation_date': reservation_date,
      'start_hour': start_hour,
      'end_hour': end_hour,
      'trigger_time': trigger_time,
      'status': ScheduledReminder.Status.PENDING,
    },
  )
  logger.info('Recordatorio programado para %s en %s', reservation_id, trigger_time)


def _handle_password_reset_event(payload: dict) -> None:
  email = payload.get('user_email')
  if not email:
    return
  reset_link = payload.get('reset_link') or (
    f"{settings.FRONTEND_URL}/reset-password?token={payload.get('token', '')}"
  )
  subject, body = render_password_reset_email(reset_link, payload.get('code'))
  send_notification(
    to_email=email,
    notif_type=NotificationHistory.NotificationType.PASSWORD_RESET,
    subject=subject,
    body=body,
    user_id=payload.get('user_id'),
  )


def _connect_with_retry(max_wait: int = 60):
  """Conecta a RabbitMQ con backoff exponencial — no spamea logs ni reinicia el contenedor."""
  import pika

  params = pika.URLParameters(settings.RABBITMQ_URL)
  params.heartbeat = 60
  params.socket_timeout = 5

  delay = 1
  while True:
    try:
      return pika.BlockingConnection(params)
    except Exception as exc:
      logger.warning('RabbitMQ no disponible (%s). Reintentando en %ds…', exc, delay)
      time.sleep(delay)
      delay = min(delay * 2, max_wait)


def run_consumer() -> None:
  """Bucle de consumo. Bloquea indefinidamente. Reconecta si se cae."""
  while True:
    try:
      _consume_forever()
    except Exception as exc:
      logger.error('Consumer cayó (%s). Reconectando en 5s…', exc)
      time.sleep(5)


def _consume_forever() -> None:
  connection = _connect_with_retry()
  channel = connection.channel()

  # Exchange de reservations
  channel.exchange_declare(
    exchange=RESERVATIONS_EXCHANGE,
    exchange_type='topic',
    durable=True,
  )
  channel.queue_declare(queue=RESERVATIONS_QUEUE, durable=True)
  for routing_key in (
    'ReservationCreated',
    'ReservationApproved',
    'ReservationRejected',
    'ReservationCancelled',
  ):
    channel.queue_bind(
      exchange=RESERVATIONS_EXCHANGE,
      queue=RESERVATIONS_QUEUE,
      routing_key=routing_key,
    )

  # Exchange de users (HU-4)
  channel.exchange_declare(
    exchange=USERS_EXCHANGE,
    exchange_type='topic',
    durable=True,
  )
  channel.queue_declare(queue=USERS_QUEUE, durable=True)
  channel.queue_bind(
    exchange=USERS_EXCHANGE,
    queue=USERS_QUEUE,
    routing_key='PasswordResetRequested',
  )

  def on_reservation_message(ch, method, properties, body):
    try:
      payload = json.loads(body)
      event_type = method.routing_key
      logger.info('← evento %s', event_type)
      _handle_reservation_event(event_type, payload)
      ch.basic_ack(delivery_tag=method.delivery_tag)
    except Exception as exc:
      logger.exception('Error procesando evento reservations: %s', exc)
      ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

  def on_users_message(ch, method, properties, body):
    try:
      payload = json.loads(body)
      logger.info('← evento %s', method.routing_key)
      _handle_password_reset_event(payload)
      ch.basic_ack(delivery_tag=method.delivery_tag)
    except Exception as exc:
      logger.exception('Error procesando evento users: %s', exc)
      ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

  channel.basic_qos(prefetch_count=10)
  channel.basic_consume(queue=RESERVATIONS_QUEUE, on_message_callback=on_reservation_message)
  channel.basic_consume(queue=USERS_QUEUE, on_message_callback=on_users_message)

  logger.info('Notifications consumer listo, esperando eventos…')
  channel.start_consuming()
