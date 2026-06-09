"""
Consumer RabbitMQ del MS reports. Escucha eventos de reservations
y alimenta DailyUsageStats. También opcionalmente registra audit.
"""

from __future__ import annotations

import json
import logging

from django.conf import settings

from .models import AuditLog
from .stats import record_event

logger = logging.getLogger(__name__)

RESERVATIONS_EXCHANGE = 'reservations'
RESERVATIONS_QUEUE = 'reports.reservations'


def _handle_event(event_type: str, payload: dict) -> None:
  record_event(event_type, payload)

  # Audit log automático para acciones de admin (approve/reject) — payload trae reviewed_by
  if event_type in ('ReservationApproved', 'ReservationRejected'):
    AuditLog.objects.create(
      user_id=payload.get('reviewed_by'),
      action=event_type,
      resource='reservation',
      resource_id=str(payload.get('reservation_id', '')),
      metadata=payload,
    )


def run_consumer() -> None:
  import pika

  params = pika.URLParameters(settings.RABBITMQ_URL)
  params.heartbeat = 60
  connection = pika.BlockingConnection(params)
  channel = connection.channel()

  channel.exchange_declare(
    exchange=RESERVATIONS_EXCHANGE, exchange_type='topic', durable=True,
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

  def on_message(ch, method, properties, body):
    try:
      payload = json.loads(body)
      event_type = method.routing_key
      logger.info('← %s', event_type)
      _handle_event(event_type, payload)
      ch.basic_ack(delivery_tag=method.delivery_tag)
    except Exception as exc:
      logger.exception('Error procesando %s: %s', method.routing_key, exc)
      ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

  channel.basic_qos(prefetch_count=10)
  channel.basic_consume(queue=RESERVATIONS_QUEUE, on_message_callback=on_message)
  logger.info('Reports consumer listo, esperando eventos…')
  channel.start_consuming()
