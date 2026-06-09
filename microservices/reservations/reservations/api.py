import uuid
from datetime import datetime, timedelta

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from .auth import get_token_payload, require_admin
from .models import OutboxEvent, Reservation, ReservationRules
from .publisher import publish_reservation_event
from .serializers import ReservationCreateSerializer, ReservationRulesSerializer
from .services import (
    UpstreamServiceError,
    check_holiday,
    fetch_space_by_area_and_code,
    fetch_space_by_id,
    fetch_user_by_id,
    fetch_user_by_university_code,
)


def _build_space_label(space: dict | None) -> str:
    if not space:
        return ''
    area_code = ((space.get('area') or {}).get('code') or '').upper()
    code = space.get('code') or ''
    name = space.get('name') or ''
    label = f'{area_code}-{code} · {name}'.strip(' ·-')
    return label or name


def _payload_for_event(reservation, user_payload=None, space_payload=None, **extra) -> dict:
    """
    Construye el payload base que se publica en RabbitMQ.
    Si no recibe user_payload / space_payload, los resuelve por HTTP.
    Si la resolución falla, el campo respectivo queda vacío y el consumer
    decide qué hacer (omitir envío, log, etc.).
    """
    if user_payload is None:
        user_payload = fetch_user_by_id(str(reservation.requester_user_id)) or {}
    if space_payload is None:
        space_payload = fetch_space_by_id(str(reservation.space_id)) or {}

    payload = {
        'reservation_id': str(reservation.id),
        'space_id': str(reservation.space_id),
        'requester_user_id': str(reservation.requester_user_id),
        'reservation_date': reservation.reservation_date.isoformat(),
        'start_hour': reservation.start_hour,
        'end_hour': reservation.end_hour,
        'user_email': user_payload.get('email', ''),
        'user_first_name': user_payload.get('first_name', ''),
        'user_last_name': user_payload.get('last_name', ''),
        'space_label': _build_space_label(space_payload),
    }
    payload.update(extra)
    return payload


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _serialize_reservation(r: Reservation) -> dict:
    return {
        'id': str(r.id),
        'space_id': str(r.space_id),
        'requester_user_id': str(r.requester_user_id),
        'reservation_date': r.reservation_date.isoformat(),
        'start_hour': r.start_hour,
        'end_hour': r.end_hour,
        'status': r.status,
        'review_notes': r.review_notes,
        'reviewed_at': r.reviewed_at.isoformat() if r.reviewed_at else None,
        'created_at': r.created_at.isoformat() if r.created_at else None,
        'cancelled_at': r.cancelled_at.isoformat() if r.cancelled_at else None,
    }


def _create_outbox_and_publish(event_type: str, payload: dict) -> None:
    """Guarda OutboxEvent en DB y publica en RabbitMQ (best-effort)."""
    OutboxEvent.objects.create(event_type=event_type, payload=payload)
    publish_reservation_event(event_type, payload)


# ---------------------------------------------------------------------------
# Reservaciones — listar y crear
# ---------------------------------------------------------------------------

class ReservationListCreateAPIView(APIView):
    """
    GET  /api/v1/reservations/
      - Usuario normal: sus propias reservas
      - Admin con ?all=true: todas las reservas del sistema

    POST /api/v1/reservations/
      Crea una reserva en estado 'pending'. Publica ReservationCreated.
    """

    def get(self, request):
        payload, error = get_token_payload(request)
        if error:
            return error

        user_id = payload.get('user_id')
        role = (payload.get('role') or '').lower()
        is_admin = role in ('admin', 'administrativo')

        # Admin puede ver todas las reservas con ?all=true
        if is_admin and request.query_params.get('all') == 'true':
            qs = Reservation.objects.all().order_by('-created_at')
        else:
            qs = Reservation.objects.filter(
                requester_user_id=user_id
            ).order_by('-reservation_date', '-start_hour')

        # Filtros opcionales
        status_filter = request.query_params.get('status', '').strip()
        if status_filter:
            qs = qs.filter(status=status_filter)

        date_filter = request.query_params.get('date', '').strip()
        if date_filter:
            qs = qs.filter(reservation_date=date_filter)

        return Response([_serialize_reservation(r) for r in qs])

    def post(self, request):
        payload, error = get_token_payload(request)
        if error:
            return error

        ser = ReservationCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        try:
            user_payload = fetch_user_by_university_code(data['university_code'])
            space_payload = fetch_space_by_area_and_code(
                data['area_code'],
                data['space_code'],
            )
        except UpstreamServiceError as e:
            return Response({'detail': str(e)}, status=e.status_code)

        if not user_payload.get('is_active', False):
            return Response({'detail': 'User is not active.'}, status=400)

        space_status = space_payload.get('status')
        if space_status != 'operational':
            return Response(
                {'detail': f'Space is not operational (status={space_status}).'},
                status=400,
            )

        try:
            user_id = uuid.UUID(str(user_payload['id']))
            space_id = uuid.UUID(str(space_payload['id']))
        except (KeyError, ValueError, TypeError):
            return Response(
                {'detail': 'Invalid response from upstream service (missing id).'},
                status=502,
            )

        # ============================================================
        # Reglas de negocio (HU-13, HU-18, HU-19, HU-26)
        # ============================================================
        rules = ReservationRules.current()
        now = timezone.now()

        # HU-26 — anticipación min/max
        reservation_dt = timezone.make_aware(
            datetime.combine(data['reservation_date'], datetime.min.time())
        ).replace(hour=data['start_hour'])
        delta = reservation_dt - now
        if delta.total_seconds() < rules.min_anticipation_hours * 3600:
            return Response(
                {'detail': f'Se requieren al menos {rules.min_anticipation_hours}h de anticipación.'},
                status=400,
            )
        if delta.days > rules.max_anticipation_days:
            return Response(
                {'detail': f'No se puede reservar con más de {rules.max_anticipation_days} días de anticipación.'},
                status=400,
            )

        # HU-26 — max_hours_per_day
        requested_hours = data['end_hour'] - data['start_hour']
        already = sum(
            r.end_hour - r.start_hour
            for r in Reservation.objects.filter(
                requester_user_id=user_id,
                reservation_date=data['reservation_date'],
                status__in=Reservation.ACTIVE_STATUSES,
            )
        )
        if already + requested_hours > rules.max_hours_per_day:
            return Response(
                {'detail': f'Máximo {rules.max_hours_per_day} horas reservadas por día.'},
                status=400,
            )

        # HU-26 — max_simultaneous_per_user
        active_count = Reservation.objects.filter(
            requester_user_id=user_id,
            status__in=Reservation.ACTIVE_STATUSES,
            reservation_date__gte=now.date(),
        ).count()
        if active_count >= rules.max_simultaneous_per_user:
            return Response(
                {'detail': f'Solo puedes tener {rules.max_simultaneous_per_user} reservas activas.'},
                status=400,
            )

        # HU-18 — restricción de rol por aula
        allowed_roles = space_payload.get('allowed_roles') or []
        user_role = (user_payload.get('role') or {}).get('name', '') if isinstance(user_payload.get('role'), dict) else ''
        if allowed_roles and user_role and user_role not in allowed_roles:
            return Response(
                {'detail': f'El rol "{user_role}" no tiene permitido reservar este espacio.'},
                status=403,
            )

        # HU-19 — bloqueo de festivos
        holiday = check_holiday(data['reservation_date'].isoformat(), str(space_id))
        if holiday.get('is_blocked'):
            return Response(
                {'detail': f'Fecha bloqueada: {holiday.get("label") or "festivo"}.'},
                status=400,
            )

        # HU-10 — auto-confirmación si el espacio no requiere aprobación
        requires_approval = space_payload.get('requires_approval', True)
        initial_status = (
            Reservation.Status.CONFIRMED
            if not requires_approval
            else Reservation.Status.PENDING
        )

        reservation = Reservation(
            requester_user_id=user_id,
            space_id=space_id,
            reservation_date=data['reservation_date'],
            start_hour=data['start_hour'],
            end_hour=data['end_hour'],
            status=initial_status,
        )
        try:
            with transaction.atomic():
                reservation.save()
                _create_outbox_and_publish(
                    OutboxEvent.EventType.RESERVATION_CREATED,
                    _payload_for_event(
                        reservation,
                        user_payload=user_payload,
                        space_payload=space_payload,
                    ),
                )
        except ValidationError as exc:
            detail = getattr(exc, 'message_dict', None) or list(exc.messages)
            return Response({'detail': detail}, status=400)

        return Response(_serialize_reservation(reservation), status=201)


# ---------------------------------------------------------------------------
# Disponibilidad por espacio
# ---------------------------------------------------------------------------

class SpaceAvailabilityAPIView(APIView):
    """
    GET /api/v1/reservations/by-space/<space_id>/?date=YYYY-MM-DD
    Retorna los slots ocupados (pending + confirmed + approved).
    Sin autenticación requerida — no expone datos de usuario.
    """

    def get(self, request, space_id):
        date_str = request.query_params.get('date')
        if not date_str:
            return Response({'detail': 'Se requiere el parámetro ?date=YYYY-MM-DD.'}, status=400)

        qs = Reservation.objects.filter(
            space_id=space_id,
            reservation_date=date_str,
            status__in=Reservation.ACTIVE_STATUSES,
        ).order_by('start_hour')

        slots = [
            {'start_hour': r.start_hour, 'end_hour': r.end_hour, 'status': r.status}
            for r in qs
        ]

        return Response({'date': date_str, 'space_id': str(space_id), 'reserved_slots': slots})


# ---------------------------------------------------------------------------
# Detalle de reserva (usuario)
# ---------------------------------------------------------------------------

class ReservationDetailAPIView(APIView):
    """
    GET   /api/v1/reservations/<id>/  — detalle (solo propietario)
    PATCH /api/v1/reservations/<id>/  — cancelar (solo si está pending o confirmed/approved)
    """

    def get(self, request, pk):
        payload, error = get_token_payload(request)
        if error:
            return error

        try:
            r = Reservation.objects.get(pk=pk, requester_user_id=payload['user_id'])
        except Reservation.DoesNotExist:
            return Response({'detail': 'Reserva no encontrada.'}, status=404)

        return Response(_serialize_reservation(r))

    def patch(self, request, pk):
        payload, error = get_token_payload(request)
        if error:
            return error

        try:
            r = Reservation.objects.get(pk=pk, requester_user_id=payload['user_id'])
        except Reservation.DoesNotExist:
            return Response({'detail': 'Reserva no encontrada.'}, status=404)

        new_status = request.data.get('status')
        if new_status != 'cancelled':
            return Response(
                {'detail': 'Solo se permite cambiar el estado a "cancelled".'},
                status=400,
            )

        if r.status == Reservation.Status.CANCELLED:
            return Response({'detail': 'La reserva ya está cancelada.'}, status=400)

        # HU-13 — anticipación mínima al cancelar
        rules = ReservationRules.current()
        reservation_dt = timezone.make_aware(
            datetime.combine(r.reservation_date, datetime.min.time())
        ).replace(hour=r.start_hour)
        if reservation_dt - timezone.now() < timedelta(hours=rules.cancel_anticipation_hours):
            return Response(
                {'detail': f'Solo se puede cancelar con al menos {rules.cancel_anticipation_hours}h de anticipación.'},
                status=400,
            )

        r.status = Reservation.Status.CANCELLED
        r.cancelled_at = timezone.now()
        r.cancelled_by_user_id = uuid.UUID(str(payload['user_id']))
        super(Reservation, r).save(
            update_fields=['status', 'cancelled_at', 'cancelled_by_user_id', 'updated_at']
        )

        _create_outbox_and_publish(
            OutboxEvent.EventType.RESERVATION_CANCELLED,
            _payload_for_event(r, cancelled_by=str(payload['user_id'])),
        )

        return Response(_serialize_reservation(r))


# ---------------------------------------------------------------------------
# Revisión de reserva (admin) — HU-3
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# HU-26 — Configuración global de reglas (admin)
# ---------------------------------------------------------------------------

class ReservationRulesAPIView(APIView):
    """
    GET   /api/v1/admin/rules/  — leer (admin)
    PATCH /api/v1/admin/rules/  — actualizar (admin)
    """

    def get(self, request):
        _, error = require_admin(request)
        if error:
            return error
        rules = ReservationRules.current()
        return Response(ReservationRulesSerializer(rules).data)

    def patch(self, request):
        _, error = require_admin(request)
        if error:
            return error
        rules = ReservationRules.current()
        ser = ReservationRulesSerializer(rules, data=request.data, partial=True)
        if not ser.is_valid():
            return Response({'errors': ser.errors}, status=400)
        ser.save()
        return Response(ser.data)


# ---------------------------------------------------------------------------
# HU-8 — Espacios ocupados en una franja (consumido por spaces/UI)
# ---------------------------------------------------------------------------

class BusySpacesAPIView(APIView):
    """
    GET /api/v1/reservations/busy-spaces/?date=&start_hour=&end_hour=
    Devuelve los space_ids que tienen reservas activas que solapan la franja.
    Sin auth — solo expone UUIDs.
    """

    def get(self, request):
        date_str = request.query_params.get('date')
        try:
            start_hour = int(request.query_params.get('start_hour', '0'))
            end_hour = int(request.query_params.get('end_hour', '24'))
        except ValueError:
            return Response({'detail': 'Horas inválidas.'}, status=400)
        if not date_str:
            return Response({'detail': 'Se requiere date.'}, status=400)

        qs = Reservation.objects.filter(
            reservation_date=date_str,
            status__in=Reservation.ACTIVE_STATUSES,
            start_hour__lt=end_hour,
            end_hour__gt=start_hour,
        ).values_list('space_id', flat=True).distinct()

        return Response({
            'date': date_str,
            'start_hour': start_hour,
            'end_hour': end_hour,
            'busy_space_ids': [str(s) for s in qs],
        })


class ReservationReviewAPIView(APIView):
    """
    PATCH /api/v1/reservations/<id>/review/
    Solo admins. Aprueba o rechaza una reserva pendiente.

    Body: { "action": "approve" | "reject", "notes": "..." }

    Al aprobar → status=approved, publica ReservationApproved
    Al rechazar → status=rejected, publica ReservationRejected
    """

    def patch(self, request, pk):
        payload, error = require_admin(request)
        if error:
            return error

        try:
            r = Reservation.objects.get(pk=pk)
        except Reservation.DoesNotExist:
            return Response({'detail': 'Reserva no encontrada.'}, status=404)

        if r.status not in (Reservation.Status.PENDING,):
            return Response(
                {'detail': f'Solo se pueden revisar reservas pendientes (estado actual: {r.status}).'},
                status=400,
            )

        action = request.data.get('action', '').strip().lower()
        if action not in ('approve', 'reject'):
            return Response(
                {'detail': 'El campo "action" debe ser "approve" o "reject".'},
                status=400,
            )

        notes = request.data.get('notes', '').strip()
        admin_id = uuid.UUID(str(payload['user_id']))
        now = timezone.now()

        if action == 'approve':
            r.status = Reservation.Status.APPROVED
            event_type = OutboxEvent.EventType.RESERVATION_APPROVED
        else:
            r.status = Reservation.Status.REJECTED
            event_type = OutboxEvent.EventType.RESERVATION_REJECTED

        r.reviewed_at = now
        r.reviewed_by_user_id = admin_id
        r.review_notes = notes

        super(Reservation, r).save(
            update_fields=['status', 'reviewed_at', 'reviewed_by_user_id', 'review_notes', 'updated_at']
        )

        _create_outbox_and_publish(
            event_type,
            _payload_for_event(
                r,
                action=action,
                notes=notes,
                reviewed_by=str(admin_id),
                reviewed_at=now.isoformat(),
            ),
        )

        return Response(_serialize_reservation(r))
