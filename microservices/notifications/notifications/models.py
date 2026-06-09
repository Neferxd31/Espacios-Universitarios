import uuid

from django.db import models


class NotificationHistory(models.Model):
  """
  Registro de todas las notificaciones emitidas (correo, in-app, etc).
  Se crea al consumir un evento de RabbitMQ o al llamarse el endpoint sync.
  """

  class NotificationType(models.TextChoices):
    RESERVATION_CREATED = 'reservation_created', 'Reserva creada'
    RESERVATION_APPROVED = 'reservation_approved', 'Reserva aprobada'
    RESERVATION_REJECTED = 'reservation_rejected', 'Reserva rechazada'
    RESERVATION_CANCELLED = 'reservation_cancelled', 'Reserva cancelada'
    RESERVATION_REMINDER = 'reservation_reminder', 'Recordatorio'
    PASSWORD_RESET = 'password_reset', 'Recuperación de contraseña'

  class Status(models.TextChoices):
    PENDING = 'pending', 'Pendiente'
    SENT = 'sent', 'Enviada'
    FAILED = 'failed', 'Fallida'

  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  reservation_id = models.UUIDField(null=True, blank=True, db_index=True)
  user_id = models.UUIDField(null=True, blank=True, db_index=True)
  user_email = models.EmailField()
  type = models.CharField(max_length=32, choices=NotificationType.choices)
  status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
  subject = models.CharField(max_length=255, blank=True, default='')
  body = models.TextField(blank=True, default='')
  error_message = models.TextField(blank=True, default='')
  sent_at = models.DateTimeField(null=True, blank=True)
  created_at = models.DateTimeField(auto_now_add=True)

  class Meta:
    db_table = 'notification_history'
    ordering = ['-created_at']
    indexes = [
      models.Index(fields=['user_id', 'created_at']),
      models.Index(fields=['type', 'status']),
    ]

  def __str__(self) -> str:
    return f'{self.type} → {self.user_email} ({self.status})'


class ScheduledReminder(models.Model):
  """
  Recordatorio programado para una reserva confirmada (HU-15).
  Se crea cuando se aprueba una reserva.
  Un worker periódico envía los que ya pasaron su trigger_time.
  """

  class Status(models.TextChoices):
    PENDING = 'pending', 'Pendiente'
    SENT = 'sent', 'Enviado'
    CANCELLED = 'cancelled', 'Cancelado'

  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  reservation_id = models.UUIDField(db_index=True)
  user_id = models.UUIDField()
  user_email = models.EmailField()
  space_label = models.CharField(max_length=128, blank=True, default='')
  reservation_date = models.DateField()
  start_hour = models.PositiveSmallIntegerField()
  end_hour = models.PositiveSmallIntegerField()
  trigger_time = models.DateTimeField(db_index=True)
  status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
  created_at = models.DateTimeField(auto_now_add=True)
  sent_at = models.DateTimeField(null=True, blank=True)

  class Meta:
    db_table = 'scheduled_reminders'
    ordering = ['trigger_time']
    indexes = [
      models.Index(fields=['status', 'trigger_time']),
    ]

  def __str__(self) -> str:
    return f'Reminder({self.reservation_id}) → {self.trigger_time} [{self.status}]'
