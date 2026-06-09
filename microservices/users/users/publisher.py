"""
Publisher RabbitMQ del MS users.

Publica eventos en el exchange 'users' (topic, durable). Por ahora solo
PasswordResetRequested, consumido por notifications.

Si RabbitMQ no está disponible, registra el error y continúa — no rompe
la respuesta al cliente.
"""

from __future__ import annotations

import json
import logging

from django.conf import settings

logger = logging.getLogger(__name__)

EXCHANGE = 'users'


def publish_user_event(event_type: str, payload: dict) -> bool:
  """
  Publica un mensaje en RabbitMQ.

  Returns True si publicó OK, False si falló.
  """
  try:
    import pika

    url = getattr(settings, 'RABBITMQ_URL', None)
    if not url:
      logger.warning('RABBITMQ_URL no configurado — evento %s no publicado', event_type)
      return False

    params = pika.URLParameters(url)
    params.socket_timeout = 5

    connection = pika.BlockingConnection(params)
    channel = connection.channel()

    channel.exchange_declare(
      exchange=EXCHANGE,
      exchange_type='topic',
      durable=True,
    )

    channel.basic_publish(
      exchange=EXCHANGE,
      routing_key=event_type,
      body=json.dumps(payload, default=str),
      properties=pika.BasicProperties(
        content_type='application/json',
        delivery_mode=2,
      ),
    )
    connection.close()
    logger.info('RabbitMQ ← %s publicado', event_type)
    return True

  except ImportError:
    logger.warning('pika no instalado — evento %s no publicado', event_type)
    return False
  except Exception as exc:
    logger.error('Error publicando %s: %s', event_type, exc)
    return False
