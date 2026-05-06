"""
API del microservicio Spaces.

Endpoints:
  HU-21  GET    /api/v1/spaces/                        — Listar espacios
  HU-20  POST   /api/v1/spaces/                        — Crear espacio (admin)
  HU-21  GET    /api/v1/spaces/<uuid>/                 — Detalle de espacio
  HU-22  PATCH  /api/v1/spaces/<uuid>/                 — Editar espacio (admin)
  HU-23  DELETE /api/v1/spaces/<uuid>/                 — Eliminar espacio (admin, lógico)
  HU-25  GET    /api/v1/spaces/<uuid>/horarios/        — Ver horarios
  HU-25  PUT    /api/v1/spaces/<uuid>/horarios/        — Reemplazar horarios (admin)
  HU-25  PATCH  /api/v1/spaces/<uuid>/horarios/<id>/   — Editar un horario (admin)
  HU-25  DELETE /api/v1/spaces/<uuid>/horarios/<id>/   — Eliminar un horario (admin)
         GET    /api/v1/areas/                         — Listar áreas
         POST   /api/v1/areas/                         — Crear área (admin)
         GET    /api/v1/spaces/resolve/                — Resolver por area_code + code
"""

from __future__ import annotations

from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView

from .auth import get_token_payload, require_admin
from .models import Area, Space, SpaceOperatingHours
from .serializers import (
    AreaSerializer,
    AreaWriteSerializer,
    OperatingHoursSerializer,
    OperatingHoursWriteSerializer,
    SpaceSerializer,
    SpaceWriteSerializer,
)


# ---------------------------------------------------------------------------
# Áreas
# ---------------------------------------------------------------------------

class AreaListCreateAPIView(APIView):
    def get(self, request):
        areas = Area.objects.all()
        return Response(AreaSerializer(areas, many=True).data)

    def post(self, request):
        _, error = require_admin(request)
        if error:
            return error
        serializer = AreaWriteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'errors': serializer.errors}, status=400)
        area = serializer.save()
        return Response(AreaSerializer(area).data, status=201)


# ---------------------------------------------------------------------------
# Espacios — CRUD (HU-20, 21, 22, 23)
# ---------------------------------------------------------------------------

class SpaceListCreateAPIView(APIView):
    def get(self, request):
        qs = Space.objects.select_related('area').prefetch_related('operating_hours')

        payload, _ = get_token_payload(request)
        role = (payload.get('role') or '').lower() if payload else ''
        is_admin = role in ('admin', 'administrativo')

        if not is_admin or request.query_params.get('include_inactive') != 'true':
            qs = qs.filter(is_active=True)

        search = request.query_params.get('search', '').strip()
        space_type = request.query_params.get('type', '').strip()
        status = request.query_params.get('status', '').strip()
        min_capacity = request.query_params.get('min_capacity', '').strip()
        area_code = request.query_params.get('area', '').strip()

        if search:
            qs = qs.filter(
                Q(name__icontains=search) |
                Q(code__icontains=search) |
                Q(area__name__icontains=search)
            )
        if space_type:
            qs = qs.filter(space_type__iexact=space_type)
        if status:
            qs = qs.filter(status=status)
        if min_capacity:
            try:
                qs = qs.filter(capacity__gte=int(min_capacity))
            except ValueError:
                pass
        if area_code:
            qs = qs.filter(area__code__iexact=area_code)

        # Filtrar por rol del usuario — HU-18 categorización
        if not is_admin and payload:
            user_role = payload.get('role', '')
            filtered = [s for s in qs if not s.allowed_roles or user_role in s.allowed_roles]
            return Response({'count': len(filtered), 'results': SpaceSerializer(filtered, many=True).data})

        return Response({'count': qs.count(), 'results': SpaceSerializer(qs, many=True).data})

    def post(self, request):
        _, error = require_admin(request)
        if error:
            return error
        serializer = SpaceWriteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'errors': serializer.errors}, status=400)
        space = serializer.save()
        space.refresh_from_db()
        return Response(SpaceSerializer(space).data, status=201)


class SpaceDetailAPIView(APIView):
    def get(self, request, pk):
        space = get_object_or_404(
            Space.objects.select_related('area').prefetch_related('operating_hours'), pk=pk
        )
        return Response(SpaceSerializer(space).data)

    def patch(self, request, pk):
        _, error = require_admin(request)
        if error:
            return error
        space = get_object_or_404(Space, pk=pk)
        serializer = SpaceWriteSerializer(space, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response({'errors': serializer.errors}, status=400)
        space = serializer.save()
        space.refresh_from_db()
        return Response(SpaceSerializer(space).data)

    def delete(self, request, pk):
        _, error = require_admin(request)
        if error:
            return error
        space = get_object_or_404(Space, pk=pk)
        space.is_active = False
        space.status = 'inactive'
        space.save(update_fields=['is_active', 'status', 'updated_at'])
        return Response({'detail': 'Espacio desactivado exitosamente.'})


# ---------------------------------------------------------------------------
# Horarios de operación (HU-25)
# ---------------------------------------------------------------------------

class SpaceOperatingHoursAPIView(APIView):
    def get(self, request, pk):
        space = get_object_or_404(Space, pk=pk)
        hours = SpaceOperatingHours.objects.filter(space=space).order_by('day_of_week')
        return Response(OperatingHoursSerializer(hours, many=True).data)

    def put(self, request, pk):
        """Reemplaza todos los horarios del espacio."""
        _, error = require_admin(request)
        if error:
            return error
        space = get_object_or_404(Space, pk=pk)
        if not isinstance(request.data, list):
            return Response({'detail': 'Se espera una lista de horarios.'}, status=400)
        serializer = OperatingHoursWriteSerializer(data=request.data, many=True)
        if not serializer.is_valid():
            return Response({'errors': serializer.errors}, status=400)
        SpaceOperatingHours.objects.filter(space=space).delete()
        created = [SpaceOperatingHours.objects.create(space=space, **item) for item in serializer.validated_data]
        return Response(OperatingHoursSerializer(created, many=True).data)


class SpaceOperatingHourDetailAPIView(APIView):
    def patch(self, request, pk, hour_id):
        _, error = require_admin(request)
        if error:
            return error
        oh = get_object_or_404(SpaceOperatingHours, pk=hour_id, space__pk=pk)
        serializer = OperatingHoursWriteSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return Response({'errors': serializer.errors}, status=400)
        for attr, value in serializer.validated_data.items():
            setattr(oh, attr, value)
        oh.save()
        return Response(OperatingHoursSerializer(oh).data)

    def delete(self, request, pk, hour_id):
        _, error = require_admin(request)
        if error:
            return error
        oh = get_object_or_404(SpaceOperatingHours, pk=hour_id, space__pk=pk)
        oh.delete()
        return Response({'detail': 'Horario eliminado.'})


# ---------------------------------------------------------------------------
# Resolve (para otros microservicios)
# ---------------------------------------------------------------------------

class SpaceResolveAPIView(APIView):
    def get(self, request):
        area_code = request.query_params.get('area_code', '').strip()
        code = request.query_params.get('code', '').strip()
        if not area_code or not code:
            return Response({'detail': 'Se requieren area_code y code.'}, status=400)
        area = Area.objects.filter(code__iexact=area_code).first()
        if not area:
            return Response({'detail': 'Área no encontrada.'}, status=404)
        space = Space.objects.filter(area=area, code__iexact=code).select_related('area').first()
        if not space:
            return Response({'detail': 'Espacio no encontrado.'}, status=404)
        return Response(SpaceSerializer(space).data)


@api_view(['GET'])
def health_check(request):
    return Response({'status': 'ok', 'service': 'spaces'})
