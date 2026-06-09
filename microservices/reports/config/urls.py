from django.contrib import admin
from django.urls import path

from reports import api

urlpatterns = [
  path('admin/', admin.site.urls),

  path('api/health/', api.health_check),

  # HU-27 — Audit log
  path('api/v1/audit/', api.AuditLogListCreateAPIView.as_view()),

  # HU-22, HU-23, HU-24, HU-25 — Reportes y estadísticas
  path('api/v1/reports/usage/', api.UsageReportAPIView.as_view()),
  path('api/v1/reports/top-spaces/', api.TopSpacesAPIView.as_view()),
  path('api/v1/reports/heatmap/', api.HeatmapAPIView.as_view()),
  path('api/v1/reports/summary/', api.SummaryAPIView.as_view()),

  # Exportación
  path('api/v1/reports/export/csv/', api.ExportCSVAPIView.as_view()),
  path('api/v1/reports/export/pdf/', api.ExportPDFAPIView.as_view()),
]
