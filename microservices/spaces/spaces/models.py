import uuid

from django.core.exceptions import ValidationError
from django.db import models


class Area(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.SlugField(max_length=32, unique=True)
    name = models.CharField(max_length=128)
    description = models.TextField(blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['sort_order', 'code']

    def __str__(self) -> str:
        return f'{self.code} ({self.name})'

    def clean(self) -> None:
        super().clean()
        if self.code and not self.code.strip():
            raise ValidationError({'code': 'Code cannot be blank.'})


class Space(models.Model):
    class Status(models.TextChoices):
        OPERATIONAL = 'operational', 'Operacional'
        MAINTENANCE = 'maintenance', 'En mantenimiento'
        INACTIVE = 'inactive', 'Inactivo'

    class SpaceType(models.TextChoices):
        AULA = 'Aula', 'Aula'
        LABORATORIO = 'Laboratorio', 'Laboratorio'
        AUDITORIO = 'Auditorio', 'Auditorio'
        SALA = 'Sala', 'Sala'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    area = models.ForeignKey(
        Area,
        on_delete=models.CASCADE,
        related_name='spaces',
    )
    code = models.CharField(max_length=64)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    floor = models.PositiveSmallIntegerField(null=True, blank=True)
    capacity = models.PositiveSmallIntegerField(null=True, blank=True)
    space_type = models.CharField(
        max_length=32,
        choices=SpaceType.choices,
        default=SpaceType.AULA,
    )
    has_air_conditioning = models.BooleanField(default=False)
    has_computers = models.BooleanField(default=False)
    has_projector = models.BooleanField(default=False)
    has_internet = models.BooleanField(default=False)
    amenities = models.JSONField(default=dict, blank=True)
    # Roles que pueden reservar este espacio. Lista vacía = todos.
    allowed_roles = models.JSONField(default=list, blank=True)
    status = models.CharField(
        max_length=32,
        choices=Status.choices,
        default=Status.OPERATIONAL,
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['area', 'code']
        constraints = [
            models.UniqueConstraint(
                fields=['area', 'code'],
                name='spaces_space_unique_code_per_area',
            ),
        ]
        indexes = [
            models.Index(fields=['area', 'floor']),
            models.Index(fields=['status']),
        ]

    def __str__(self) -> str:
        return f'{self.area.code}-{self.code}'

    def clean(self) -> None:
        super().clean()
        if self.code is not None and not str(self.code).strip():
            raise ValidationError({'code': 'Code cannot be blank.'})
        if self.name is not None and not str(self.name).strip():
            raise ValidationError({'name': 'Name cannot be blank.'})
        if self.capacity is not None and self.capacity < 1:
            raise ValidationError({'capacity': 'Capacity must be at least 1 when set.'})


class SpaceOperatingHours(models.Model):
    class Weekday(models.IntegerChoices):
        MONDAY = 0, 'Monday'
        TUESDAY = 1, 'Tuesday'
        WEDNESDAY = 2, 'Wednesday'
        THURSDAY = 3, 'Thursday'
        FRIDAY = 4, 'Friday'
        SATURDAY = 5, 'Saturday'
        SUNDAY = 6, 'Sunday'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    space = models.ForeignKey(
        Space,
        on_delete=models.CASCADE,
        related_name='operating_hours',
    )
    day_of_week = models.PositiveSmallIntegerField(choices=Weekday.choices)
    opens_at = models.TimeField()
    closes_at = models.TimeField()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['space', 'day_of_week'],
                name='spaces_operating_hours_unique_day_per_space',
            ),
        ]

    def clean(self) -> None:
        super().clean()
        if self.opens_at and self.closes_at and self.opens_at >= self.closes_at:
            raise ValidationError('opens_at must be before closes_at.')

    def __str__(self) -> str:
        return f'{self.space} — {self.get_day_of_week_display()} {self.opens_at}-{self.closes_at}'
