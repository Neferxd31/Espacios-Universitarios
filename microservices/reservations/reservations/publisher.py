"""
Publisher RabbitMQ — HU-3.

Publica eventos de reserva en el exchange 'reservations' (tipo topic, durable).
Usa pika con conexión síncrona y cierre inmediato tras publicar.

Si RabbitMQ no está disponible, registra el error y continúa —
el OutboxEvent guardado en BD garantiza que el evento no se pierda.
"""

from __future__ import annotations

import json
import logging

from django.conf import settings

logger = logging.getLogger(__name__)

EXCHANGE = 'reservations'


def publish_reservation_event(event_type: str, payload: dict) -> bool:
    """
    Publica un mensaje en RabbitMQ.

    Args:
        event_type: Nombre del evento (routing key). Ej: 'ReservationApproved'
        payload:    Diccionario que se serializa a JSON en el cuerpo del mensaje.

    Returns:
        True si se publicó correctamente, False si hubo un error.
    """
    try:
        import pika  # Import diferido — no falla si pika no está instalado en dev

        url = getattr(settings, 'RABBITMQ_URL', None)
        if not url:
            logger.warning('RABBITMQ_URL no configurado — evento %s no publicado', event_type)
            return False

        params = pika.URLParameters(url)
        params.socket_timeout = 5  # no bloquear más de 5 s si rabbit está caído

        connection = pika.BlockingConnection(params)
        channel = connection.channel()

        # Exchange durable — sobrevive reinicios de RabbitMQ
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
                delivery_mode=2,  # mensaje persistente
            ),
        )
        connection.close()
        logger.info('RabbitMQ ← %s publicado correctamente', event_type)
        return True

    except ImportError:
        logger.warning('pika no instalado — evento %s no publicado', event_type)
        return False
    except Exception as exc:
        logger.error('Error publicando %s en RabbitMQ: %s', event_type, exc)
        return False
