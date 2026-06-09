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
from .services import fetch_spaces_map


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

    qs = DailyUsageStats.objects.filter(date__gte=start, date__lte=end).order_by('date', 'space_id')
    spaces_map = fetch_spaces_map()

    # Sumario por espacio
    summary = {}
    for r in qs:
      sid = str(r.space_id)
      bucket = summary.setdefault(sid, {
        'total': 0, 'approved': 0, 'cancelled': 0, 'rejected': 0, 'hours': 0,
      })
      bucket['total'] += r.total_reservations
      bucket['approved'] += r.approved_reservations
      bucket['cancelled'] += r.cancelled_reservations
      bucket['rejected'] += r.rejected_reservations
      bucket['hours'] += r.total_hours

    # Totales generales
    grand = {'total': 0, 'approved': 0, 'cancelled': 0, 'rejected': 0, 'hours': 0}
    for b in summary.values():
      for k in grand:
        grand[k] += b[k]

    # BOM para que Excel detecte UTF-8 con tildes
    buf = io.StringIO()
    buf.write('﻿')
    writer = csv.writer(buf, delimiter=';')

    writer.writerow(['REPORTE DE USO — ESPACIOS UNIVERSITARIOS UFPS'])
    writer.writerow([f'Periodo: {start.isoformat()} a {end.isoformat()}'])
    writer.writerow([])

    writer.writerow(['RESUMEN GENERAL'])
    writer.writerow(['Total reservas', 'Aprobadas', 'Canceladas', 'Rechazadas', 'Horas totales'])
    writer.writerow([grand['total'], grand['approved'], grand['cancelled'], grand['rejected'], grand['hours']])
    writer.writerow([])

    writer.writerow(['RESUMEN POR ESPACIO'])
    writer.writerow(['Espacio', 'Código', 'Capacidad', 'Tipo', 'Total', 'Aprobadas', 'Canceladas', 'Rechazadas', 'Horas'])
    for sid, b in sorted(summary.items(), key=lambda kv: -kv[1]['total']):
      info = spaces_map.get(sid, {})
      writer.writerow([
        info.get('name', '—'),
        f'{(info.get("area_code") or "").upper()}-{info.get("code") or ""}'.strip('-'),
        info.get('capacity', ''),
        info.get('type', ''),
        b['total'], b['approved'], b['cancelled'], b['rejected'], b['hours'],
      ])
    writer.writerow([])

    writer.writerow(['DETALLE DIARIO'])
    writer.writerow(['Fecha', 'Espacio', 'Código', 'Total', 'Aprobadas', 'Canceladas', 'Rechazadas', 'Horas', 'Pico hora'])
    for r in qs:
      sid = str(r.space_id)
      info = spaces_map.get(sid, {})
      writer.writerow([
        r.date.isoformat(),
        info.get('name', '—'),
        f'{(info.get("area_code") or "").upper()}-{info.get("code") or ""}'.strip('-'),
        r.total_reservations,
        r.approved_reservations,
        r.cancelled_reservations,
        r.rejected_reservations,
        r.total_hours,
        f'{r.peak_hour:02d}:00' if r.peak_hour is not None else '',
      ])

    response = HttpResponse(buf.getvalue(), content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="reporte_{start}_{end}.csv"'
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
      from reportlab.lib import colors
      from reportlab.lib.pagesizes import A4, landscape
      from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
      from reportlab.lib.units import mm
      from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
      )
    except ImportError:
      return Response({'detail': 'reportlab no disponible.'}, status=503)

    qs = list(
      DailyUsageStats.objects.filter(date__gte=start, date__lte=end).order_by('date', 'space_id')
    )
    spaces_map = fetch_spaces_map()

    # Agregados
    summary = {}
    grand = {'total': 0, 'approved': 0, 'cancelled': 0, 'rejected': 0, 'hours': 0}
    for r in qs:
      sid = str(r.space_id)
      b = summary.setdefault(sid, {'total': 0, 'approved': 0, 'cancelled': 0, 'rejected': 0, 'hours': 0})
      b['total'] += r.total_reservations
      b['approved'] += r.approved_reservations
      b['cancelled'] += r.cancelled_reservations
      b['rejected'] += r.rejected_reservations
      b['hours'] += r.total_hours
      for k in grand:
        grand[k] += b[k] if False else 0  # se acumula abajo

    grand = {'total': 0, 'approved': 0, 'cancelled': 0, 'rejected': 0, 'hours': 0}
    for b in summary.values():
      for k in grand:
        grand[k] += b[k]

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
      buf, pagesize=landscape(A4),
      leftMargin=15 * mm, rightMargin=15 * mm,
      topMargin=15 * mm, bottomMargin=15 * mm,
      title=f'Reporte {start} a {end}',
    )

    styles = getSampleStyleSheet()
    h1 = ParagraphStyle(
      'h1', parent=styles['Heading1'], fontSize=18, textColor=colors.HexColor('#922B21'),
      spaceAfter=4,
    )
    h2 = ParagraphStyle(
      'h2', parent=styles['Heading2'], fontSize=12, textColor=colors.HexColor('#1A1A2E'),
      spaceBefore=10, spaceAfter=6,
    )
    meta = ParagraphStyle('meta', parent=styles['Normal'], fontSize=9, textColor=colors.grey)
    cell = ParagraphStyle('cell', parent=styles['Normal'], fontSize=9, leading=11)

    story = []
    story.append(Paragraph('Reporte de uso de espacios — UFPS', h1))
    story.append(Paragraph(f'Periodo: {start.isoformat()} → {end.isoformat()}', meta))
    story.append(Spacer(1, 8))

    # ── Resumen general
    story.append(Paragraph('Resumen general', h2))
    summary_data = [
      ['Total reservas', 'Aprobadas', 'Canceladas', 'Rechazadas', 'Horas totales'],
      [grand['total'], grand['approved'], grand['cancelled'], grand['rejected'], grand['hours']],
    ]
    t = Table(summary_data, colWidths=[45 * mm] * 5)
    t.setStyle(TableStyle([
      ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#922B21')),
      ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
      ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
      ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
      ('FONTSIZE', (0, 1), (-1, 1), 14),
      ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
      ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
      ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#D5D8DC')),
      ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
      ('TOPPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t)

    # ── Resumen por espacio
    story.append(Paragraph('Resumen por espacio', h2))
    rows = [['Espacio', 'Código', 'Capacidad', 'Tipo', 'Total', 'Aprob.', 'Canc.', 'Rech.', 'Horas']]
    for sid, b in sorted(summary.items(), key=lambda kv: -kv[1]['total']):
      info = spaces_map.get(sid, {})
      label = info.get('name') or '—'
      code = f'{(info.get("area_code") or "").upper()}-{info.get("code") or ""}'.strip('-')
      rows.append([
        Paragraph(label, cell),
        code or '—',
        info.get('capacity', '') or '',
        info.get('type', '') or '',
        b['total'], b['approved'], b['cancelled'], b['rejected'], b['hours'],
      ])
    t = Table(rows, colWidths=[55 * mm, 25 * mm, 22 * mm, 28 * mm, 18 * mm, 18 * mm, 18 * mm, 18 * mm, 18 * mm])
    t.setStyle(_table_style())
    story.append(t)

    # ── Detalle diario (paginado)
    story.append(PageBreak())
    story.append(Paragraph('Detalle diario', h2))
    detail = [['Fecha', 'Espacio', 'Código', 'Total', 'Aprob.', 'Canc.', 'Rech.', 'Horas', 'Pico']]
    for r in qs:
      sid = str(r.space_id)
      info = spaces_map.get(sid, {})
      label = info.get('name') or '—'
      code = f'{(info.get("area_code") or "").upper()}-{info.get("code") or ""}'.strip('-')
      detail.append([
        r.date.isoformat(),
        Paragraph(label, cell),
        code or '—',
        r.total_reservations,
        r.approved_reservations,
        r.cancelled_reservations,
        r.rejected_reservations,
        r.total_hours,
        f'{r.peak_hour:02d}:00' if r.peak_hour is not None else '—',
      ])
    t = Table(detail, colWidths=[25 * mm, 65 * mm, 22 * mm, 18 * mm, 18 * mm, 18 * mm, 18 * mm, 18 * mm, 18 * mm], repeatRows=1)
    t.setStyle(_table_style())
    story.append(t)

    doc.build(story)
    pdf = buf.getvalue()
    buf.close()

    response = HttpResponse(pdf, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="reporte_{start}_{end}.pdf"'
    return response


def _table_style():
  from reportlab.lib import colors
  from reportlab.platypus import TableStyle
  return TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1A1A2E')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 9),
    ('FONTSIZE', (0, 1), (-1, -1), 8),
    ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
    ('ALIGN', (3, 1), (-1, -1), 'CENTER'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('GRID', (0, 0), (-1, -1), 0.3, colors.HexColor('#D5D8DC')),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#FAFAFA')]),
    ('LEFTPADDING', (0, 0), (-1, -1), 4),
    ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
  ])
