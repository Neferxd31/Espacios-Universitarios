import uuid

from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import F, Q


class Reservation(models.Model):
    """
    Hourly blocks use half-open intervals: [start_hour, end_hour) in local campus date.
    Example: 8–9 is start_hour=8, end_hour=9.
    """

    class Status(models.TextChoices):
        CONFIRMED = 'confirmed', 'Confirmed'
        CANCELLED = 'cancelled', 'Cancelled'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    space_id = models.UUIDField(db_index=True)
    requester_user_id = models.UUIDField(db_index=True)
    reservation_date = models.DateField()
    start_hour = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(23)],
    )
    end_hour = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(24)],
    )
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.CONFIRMED,
    )
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by_user_id = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['space_id', 'reservation_date', 'status']),
            models.Index(fields=['requester_user_id', 'reservation_date']),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(start_hour__lt=F('end_hour')),
                name='reservations_start_hour_before_end_hour',
            ),
            models.CheckConstraint(
                condition=Q(start_hour__gte=0) & Q(start_hour__lte=23),
                name='reservations_start_hour_range',
            ),
            models.CheckConstraint(
                condition=Q(end_hour__gte=1) & Q(end_hour__lte=24),
                name='reservations_end_hour_range',
            ),
        ]

    def __str__(self) -> str:
        return (
            f'{self.space_id} {self.reservation_date} '
            f'{self.start_hour}-{self.end_hour} ({self.status})'
        )

    def clean(self) -> None:
        super().clean()
        if self.status == self.Status.CANCELLED:
            return
        if self.start_hour >= self.end_hour:
            raise ValidationError(
                'end_hour must be greater than start_hour (half-open hourly blocks).'
            )
        self._validate_no_overlapping_confirmed()

    def _validate_no_overlapping_confirmed(self) -> None:
        """Two half-open ranges [s1, e1) and [s2, e2) overlap iff s1 < e2 and s2 < e1."""
        overlaps = Reservation.objects.filter(
            space_id=self.space_id,
            reservation_date=self.reservation_date,
            status=self.Status.CONFIRMED,
            start_hour__lt=self.end_hour,
            end_hour__gt=self.start_hour,
        )
        if self.pk:
            overlaps = overlaps.exclude(pk=self.pk)
        if overlaps.exists():
            raise ValidationError(
                'This space already has a confirmed reservation overlapping that time window.'
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class OutboxEvent(models.Model):
    class EventType(models.TextChoices):
        RESERVATION_CREATED = 'ReservationCreated', 'Reservation Created'
        RESERVATION_CANCELLED = 'ReservationCancelled', 'Reservation Cancelled'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event_type = models.CharField(max_length=64, choices=EventType.choices)
    payload = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['published_at', 'created_at']),
        ]

    def __str__(self) -> str:
        return f'{self.event_type} @ {self.created_at}'
