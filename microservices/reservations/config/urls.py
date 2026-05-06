from django.contrib import admin
from django.urls import path

from reservations import api

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/reservations/', api.ReservationListCreateAPIView.as_view()),
    path('api/v1/reservations/by-space/<uuid:space_id>/', api.SpaceAvailabilityAPIView.as_view()),
    # HU-3 — la ruta /review/ debe ir ANTES del <uuid:pk>/ genérico
    path('api/v1/reservations/<uuid:pk>/review/', api.ReservationReviewAPIView.as_view()),
    path('api/v1/reservations/<uuid:pk>/', api.ReservationDetailAPIView.as_view()),
]
