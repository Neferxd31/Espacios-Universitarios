from django.contrib import admin
from django.urls import path

from notifications import api

urlpatterns = [
  path('admin/', admin.site.urls),

  # Salud
  path('api/health/', api.health_check),

  # HU-14 — historial de notificaciones del usuario actual
  path('api/v1/notifications/', api.NotificationListAPIView.as_view()),

  # HU-4 — endpoint llamado por el MS users cuando arranca recuperación
  # (alternativa al evento RabbitMQ para flujos síncronos)
  path('api/v1/notifications/password-reset/', api.PasswordResetEmailAPIView.as_view()),
]
