"""
HU-3 — Aprobar/rechazar reservas con notificación RabbitMQ.

Cambios:
- Reservation.status: añade 'pending', 'approved', 'rejected'; cambia default a 'pending'
- Reservation: añade reviewed_at, reviewed_by_user_id, review_notes
- OutboxEvent.event_type: añade 'ReservationApproved', 'ReservationRejected'
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reservations', '0001_initial'),
    ]

    operations = [
        # Ampliar el campo status para admitir los nuevos valores
        migrations.AlterField(
            model_name='reservation',
            name='status',
            field=models.CharField(
                max_length=16,
                choices=[
                    ('pending',   'Pendiente'),
                    ('confirmed', 'Confirmada'),
                    ('approved',  'Aprobada'),
                    ('rejected',  'Rechazada'),
                    ('cancelled', 'Cancelada'),
                ],
                default='pending',
            ),
        ),
        # Campos de revisión
        migrations.AddField(
            model_name='reservation',
            name='reviewed_at',
            field=models.DateTimeField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='reservation',
            name='reviewed_by_user_id',
            field=models.UUIDField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='reservation',
            name='review_notes',
            field=models.TextField(blank=True, default=''),
        ),
        # Ampliar event_type de OutboxEvent
        migrations.AlterField(
            model_name='outboxevent',
            name='event_type',
            field=models.CharField(
                max_length=64,
                choices=[
                    ('ReservationCreated',   'Reservation Created'),
                    ('ReservationApproved',  'Reservation Approved'),
                    ('ReservationRejected',  'Reservation Rejected'),
                    ('ReservationCancelled', 'Reservation Cancelled'),
                ],
            ),
        ),
    ]
