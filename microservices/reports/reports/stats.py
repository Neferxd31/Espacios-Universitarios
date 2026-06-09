"""
Agregación de DailyUsageStats a partir de eventos consumidos.

Se llama desde el consumer cuando llega ReservationApproved/Cancelled/Rejected.
"""

from __future__ import annotations

from datetime import date
from uuid import UUID

from django.db import transaction
from django.db.models import F

from .models import DailyUsageStats


def _parse_payload(payload: dict) -> tuple[date, UUID, int, int] | None:
  try:
    d = date.fromisoformat(payload['reservation_date'])
    space_id = UUID(str(payload['space_id']))
    start_hour = int(payload['start_hour'])
    end_hour = int(payload.get('end_hour', start_hour + 1))
    return d, space_id, start_hour, end_hour
  except (KeyError, ValueError, TypeError):
    return None


@transaction.atomic
def record_event(event_type: str, payload: dict) -> None:
  parsed = _parse_payload(payload)
  if not parsed:
    return
  d, space_id, start_hour, end_hour = parsed

  stats, _ = DailyUsageStats.objects.select_for_update().get_or_create(
    date=d, space_id=space_id,
  )

  if event_type == 'ReservationApproved':
    stats.approved_reservations += 1
    stats.total_reservations += 1
    stats.total_hours += (end_hour - start_hour)
    dist = stats.hour_distribution or {}
    for h in range(start_hour, end_hour):
      dist[str(h)] = dist.get(str(h), 0) + 1
    stats.hour_distribution = dist
    if dist:
      stats.peak_hour = int(max(dist, key=lambda k: dist[k]))
  elif event_type == 'ReservationCancelled':
    stats.cancelled_reservations += 1
  elif event_type == 'ReservationRejected':
    stats.rejected_reservations += 1

  stats.save()
