from django.contrib import admin
from django.urls import path

from reservations import api

urlpatterns = [
    path('admin/', admin.site.urls),

    # Listado / creación
    path('api/v1/reservations/', api.ReservationListCreateAPIView.as_view()),

    # HU-8 — espacios ocupados en una franja
    path('api/v1/reservations/busy-spaces/', api.BusySpacesAPIView.as_view()),

    # HU-9 — disponibilidad por espacio
    path('api/v1/reservations/by-space/<uuid:space_id>/', api.SpaceAvailabilityAPIView.as_view()),

    # HU-3 — la ruta /review/ debe ir ANTES del <uuid:pk>/ genérico
    path('api/v1/reservations/<uuid:pk>/review/', api.ReservationReviewAPIView.as_view()),
    path('api/v1/reservations/<uuid:pk>/', api.ReservationDetailAPIView.as_view()),

    # HU-26 — Configuración global (admin)
    path('api/v1/admin/rules/', api.ReservationRulesAPIView.as_view()),
]
