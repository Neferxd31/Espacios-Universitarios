import uuid

from django.core.exceptions import ValidationError
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from .auth import get_token_payload
from .models import Reservation
from .serializers import ReservationCreateSerializer
from .services import UpstreamServiceError, fetch_space_by_area_and_code, fetch_user_by_university_code


def _serialize_reservation(r):
    return {
        'id': str(r.id),
        'space_id': str(r.space_id),
        'requester_user_id': str(r.requester_user_id),
        'reservation_date': r.reservation_date.isoformat(),
        'start_hour': r.start_hour,
        'end_hour': r.end_hour,
        'status': r.status,
        'created_at': r.created_at.isoformat() if r.created_at else None,
        'cancelled_at': r.cancelled_at.isoformat() if r.cancelled_at else None,
    }


class ReservationListCreateAPIView(APIView):
    """
    GET  /api/v1/reservations/  — list reservations for authenticated user
    POST /api/v1/reservations/  — create a reservation
    """

    def get(self, request):
        payload, error = get_token_payload(request)
        if error:
            return error

        user_id = payload.get('user_id')
        if not user_id:
            return Response({'detail': 'Token inválido (sin user_id).'}, status=401)

        qs = Reservation.objects.filter(
            requester_user_id=user_id
        ).order_by('-reservation_date', '-start_hour')

        # Optional status filter: ?status=confirmed
        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        return Response([_serialize_reservation(r) for r in qs])

    def post(self, request):
        # Auth: extract user from JWT
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

        reservation = Reservation(
            requester_user_id=user_id,
            space_id=space_id,
            reservation_date=data['reservation_date'],
            start_hour=data['start_hour'],
            end_hour=data['end_hour'],
            status=Reservation.Status.CONFIRMED,
        )
        try:
            reservation.save()
        except ValidationError as exc:
            detail = getattr(exc, 'message_dict', None) or list(exc.messages)
            return Response({'detail': detail}, status=400)

        return Response(_serialize_reservation(reservation), status=201)


class SpaceAvailabilityAPIView(APIView):
    """
    GET /api/v1/reservations/by-space/<space_id>/?date=YYYY-MM-DD
    Returns confirmed reservation time slots for a space on a given date.
    No auth required — only exposes occupied hours, not user data.
    """

    def get(self, request, space_id):
        date_str = request.query_params.get('date')
        if not date_str:
            return Response({'detail': 'Se requiere el parámetro ?date=YYYY-MM-DD.'}, status=400)

        qs = Reservation.objects.filter(
            space_id=space_id,
            reservation_date=date_str,
            status=Reservation.Status.CONFIRMED,
        ).order_by('start_hour')

        slots = [
            {'start_hour': r.start_hour, 'end_hour': r.end_hour}
            for r in qs
        ]

        return Response({'date': date_str, 'space_id': str(space_id), 'reserved_slots': slots})


class ReservationDetailAPIView(APIView):
    """
    GET   /api/v1/reservations/<id>/  — detail
    PATCH /api/v1/reservations/<id>/  — cancel (status → cancelled)
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

        r.status = Reservation.Status.CANCELLED
        r.cancelled_at = timezone.now()
        r.cancelled_by_user_id = uuid.UUID(str(payload['user_id']))
        # skip full_clean to avoid overlap re-validation on cancel
        super(Reservation, r).save(update_fields=['status', 'cancelled_at', 'cancelled_by_user_id', 'updated_at'])

        return Response(_serialize_reservation(r))
