import csv
import io
from datetime import date, timedelta

from django.db.models import Sum, Count
from django.http import HttpResponse
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView

from .auth import get_token_payload, require_admin
from .models import AuditLog, DailyUsageStats
from .serializers import AuditLogSerializer


@api_view(['GET'])
def health_check(request):
  return Response({'status': 'ok', 'service': 'reports'})


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_range(request):
  """Devuelve (start, end) o lanza ValueError."""
  end_str = request.query_params.get('end_date')
  start_str = request.query_params.get('start_date')
  end = date.fromisoformat(end_str) if end_str else date.today()
  start = date.fromisoformat(start_str) if start_str else end - timedelta(days=30)
  return start, end


# ---------------------------------------------------------------------------
# HU-27 — Audit
# ---------------------------------------------------------------------------

class AuditLogListCreateAPIView(APIView):
  """
  GET  /api/v1/audit/  — solo admin
  POST /api/v1/audit/  — cualquier servicio interno puede insertar audit
  """

  def get(self, request):
    payload, error = require_admin(request)
    if error:
      return error

    qs = AuditLog.objects.all()
    action = request.query_params.get('action', '').strip()
    user_id = request.query_params.get('user_id', '').strip()
    if action:
      qs = qs.filter(action__iexact=action)
    if user_id:
      qs = qs.filter(user_id=user_id)

    qs = qs[:500]
    return Response(AuditLogSerializer(qs, many=True).data)

  def post(self, request):
    ser = AuditLogSerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    ip = request.META.get('HTTP_X_FORWARDED_FOR') or request.META.get('REMOTE_ADDR')
    ser.save(ip_address=ip)
    return Response(ser.data, status=201)


# ---------------------------------------------------------------------------
# HU-22 — Uso por rango
# ---------------------------------------------------------------------------

class UsageReportAPIView(APIView):
  """GET /api/v1/reports/usage/?start_date=&end_date="""

  def get(self, request):
    payload, error = require_admin(request)
    if error:
      return error
    try:
      start, end = _parse_range(request)
    except ValueError:
      return Response({'detail': 'Fechas inválidas.'}, status=400)

    qs = DailyUsageStats.objects.filter(date__gte=start, date__lte=end)
    agg = qs.aggregate(
      total=Sum('total_reservations'),
      approved=Sum('approved_reservations'),
      cancelled=Sum('cancelled_reservations'),
      rejected=Sum('rejected_reservations'),
      hours=Sum('total_hours'),
    )
    by_day = (
      qs.values('date')
      .annotate(total=Sum('total_reservations'))
      .order_by('date')
    )

    return Response({
      'start_date': start.isoformat(),
      'end_date': end.isoformat(),
      'totals': {k: (v or 0) for k, v in agg.items()},
      'by_day': [{'date': r['date'].isoformat(), 'total': r['total']} for r in by_day],
    })


# ---------------------------------------------------------------------------
# HU-24 — Top espacios
# ---------------------------------------------------------------------------

class TopSpacesAPIView(APIView):
  """GET /api/v1/reports/top-spaces/?start_date=&end_date=&limit=10"""

  def get(self, request):
    payload, error = require_admin(request)
    if error:
      return error
    try:
      start, end = _parse_range(request)
    except ValueError:
      return Response({'detail': 'Fechas inválidas.'}, status=400)
    limit = int(request.query_params.get('limit', '10'))

    qs = (
      DailyUsageStats.objects.filter(date__gte=start, date__lte=end)
      .values('space_id')
      .annotate(total=Sum('total_reservations'), hours=Sum('total_hours'))
      .order_by('-total')[:limit]
    )

    return Response({
      'start_date': start.isoformat(),
      'end_date': end.isoformat(),
      'top_spaces': [
        {'space_id': str(r['space_id']), 'total': r['total'], 'hours': r['hours']}
        for r in qs
      ],
    })


# ---------------------------------------------------------------------------
# HU-25 — Heatmap por hora del día
# ---------------------------------------------------------------------------

class HeatmapAPIView(APIView):
  """GET /api/v1/reports/heatmap/?start_date=&end_date="""

  def get(self, request):
    payload, error = require_admin(request)
    if error:
      return error
    try:
      start, end = _parse_range(request)
    except ValueError:
      return Response({'detail': 'Fechas inválidas.'}, status=400)

    qs = DailyUsageStats.objects.filter(date__gte=start, date__lte=end)

    # Mapa hora→total a través de hour_distribution JSON
    aggregate_hours = {str(h): 0 for h in range(24)}
    for stats in qs:
      for hour, count in (stats.hour_distribution or {}).items():
        aggregate_hours[hour] = aggregate_hours.get(hour, 0) + count

    return Response({
      'start_date': start.isoformat(),
      'end_date': end.isoformat(),
      'hour_distribution': aggregate_hours,
    })


# ---------------------------------------------------------------------------
# HU-23 — Summary para dashboard
# ---------------------------------------------------------------------------

class SummaryAPIView(APIView):
  """GET /api/v1/reports/summary/  — números clave últimos 30 días"""

  def get(self, request):
    payload, error = require_admin(request)
    if error:
      return error
    today = date.today()
    last30 = today - timedelta(days=30)
    qs = DailyUsageStats.objects.filter(date__gte=last30, date__lte=today)
    agg = qs.aggregate(
      total=Sum('total_reservations'),
      approved=Sum('approved_reservations'),
      cancelled=Sum('cancelled_reservations'),
      rejected=Sum('rejected_reservations'),
    )
    return Response({
      'last_30_days': {k: (v or 0) for k, v in agg.items()},
    })


# ---------------------------------------------------------------------------
# Exportación CSV / PDF (HU-22)
# ---------------------------------------------------------------------------

class ExportCSVAPIView(APIView):
  def get(self, request):
    payload, error = require_admin(request)
    if error:
      return error
    try:
      start, end = _parse_range(request)
    except ValueError:
      return Response({'detail': 'Fechas inválidas.'}, status=400)

    qs = DailyUsageStats.objects.filter(date__gte=start, date__lte=end).order_by('date')

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(['date', 'space_id', 'total', 'approved', 'cancelled', 'rejected', 'hours', 'peak_hour'])
    for r in qs:
      writer.writerow([
        r.date.isoformat(), str(r.space_id), r.total_reservations,
        r.approved_reservations, r.cancelled_reservations, r.rejected_reservations,
        r.total_hours, r.peak_hour or '',
      ])

    response = HttpResponse(buf.getvalue(), content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="report_{start}_{end}.csv"'
    return response


class ExportPDFAPIView(APIView):
  def get(self, request):
    payload, error = require_admin(request)
    if error:
      return error
    try:
      start, end = _parse_range(request)
    except ValueError:
      return Response({'detail': 'Fechas inválidas.'}, status=400)

    try:
      from reportlab.lib.pagesizes import LETTER
      from reportlab.pdfgen import canvas
    except ImportError:
      return Response({'detail': 'reportlab no disponible.'}, status=503)

    qs = DailyUsageStats.objects.filter(date__gte=start, date__lte=end).order_by('date')

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=LETTER)
    width, height = LETTER

    c.setFont('Helvetica-Bold', 14)
    c.drawString(40, height - 50, f'Reporte de uso — {start} a {end}')

    c.setFont('Helvetica', 10)
    y = height - 90
    c.drawString(40, y, 'Fecha       | Espacio                              | Total | Aprob. | Canc. | Horas')
    y -= 15
    for r in qs:
      if y < 60:
        c.showPage()
        y = height - 60
        c.setFont('Helvetica', 10)
      line = (
        f'{r.date.isoformat()} | {str(r.space_id)[:36]} | '
        f'{r.total_reservations:>5} | {r.approved_reservations:>6} | '
        f'{r.cancelled_reservations:>5} | {r.total_hours:>5}'
      )
      c.drawString(40, y, line)
      y -= 13

    c.showPage()
    c.save()
    pdf = buf.getvalue()
    buf.close()

    response = HttpResponse(pdf, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="report_{start}_{end}.pdf"'
    return response
