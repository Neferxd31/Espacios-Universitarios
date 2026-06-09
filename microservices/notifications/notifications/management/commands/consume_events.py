"""
Worker que escucha RabbitMQ y procesa eventos.

Uso:
  python manage.py consume_events
"""

from django.core.management.base import BaseCommand

from notifications.consumer import run_consumer


class Command(BaseCommand):
  help = 'Inicia el consumer de eventos RabbitMQ.'

  def handle(self, *args, **options):
    self.stdout.write(self.style.SUCCESS('Iniciando consumer de notifications…'))
    run_consumer()
