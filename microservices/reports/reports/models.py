import uuid

from django.db import models


class AuditLog(models.Model):
  """
  HU-27: Registro de acciones críticas.
  Llenado por POST /api/v1/audit/ (sync) o por consumer RabbitMQ (async).
  """

  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user_id = models.UUIDField(null=True, blank=True, db_index=True)
  user_label = models.CharField(max_length=128, blank=True, default='')
  action = models.CharField(max_length=64, db_index=True)
  resource = models.CharField(max_length=64, db_index=True)
  resource_id = models.CharField(max_length=64, blank=True, default='')
  metadata = models.JSONField(default=dict, blank=True)
  ip_address = models.GenericIPAddressField(null=True, blank=True)
  timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

  class Meta:
    db_table = 'audit_logs'
    ordering = ['-timestamp']
    indexes = [
      models.Index(fields=['user_id', 'timestamp']),
      models.Index(fields=['action', 'timestamp']),
    ]

  def __str__(self) -> str:
    return f'[{self.timestamp}] {self.user_label or self.user_id} → {self.action} {self.resource}'


class DailyUsageStats(models.Model):
  """
  Estadística agregada por día y espacio. Se alimenta al consumir
  eventos ReservationApproved/Cancelled/Rejected del exchange reservations.
  """

  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  date = models.DateField(db_index=True)
  space_id = models.UUIDField(db_index=True)
  total_reservations = models.IntegerField(default=0)
  approved_reservations = models.IntegerField(default=0)
  cancelled_reservations = models.IntegerField(default=0)
  rejected_reservations = models.IntegerField(default=0)
  total_hours = models.IntegerField(default=0)
  peak_hour = models.PositiveSmallIntegerField(null=True, blank=True)
  hour_distribution = models.JSONField(
    default=dict, blank=True,
    help_text='{ "8": 3, "9": 5, ... } reservas por hora del día',
  )
  updated_at = models.DateTimeField(auto_now=True)

  class Meta:
    db_table = 'daily_usage_stats'
    unique_together = ('date', 'space_id')
    ordering = ['-date']

  def __str__(self) -> str:
    return f'{self.date} space={self.space_id} total={self.total_reservations}'
