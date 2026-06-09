from django.core.management.base import BaseCommand

from reports.consumer import run_consumer


class Command(BaseCommand):
  help = 'Inicia el consumer RabbitMQ del MS reports.'

  def handle(self, *args, **options):
    self.stdout.write(self.style.SUCCESS('Iniciando consumer de reports…'))
    run_consumer()
