from django.urls import path

from .api import (
    AreaListCreateAPIView,
    SpaceDetailAPIView,
    SpaceListCreateAPIView,
    SpaceOperatingHourDetailAPIView,
    SpaceOperatingHoursAPIView,
    SpaceResolveAPIView,
    health_check,
)

urlpatterns = [
    # Áreas
    path('areas/', AreaListCreateAPIView.as_view()),

    # Espacios — CRUD (HU-20, 21, 22, 23)
    path('spaces/', SpaceListCreateAPIView.as_view()),
    path('spaces/resolve/', SpaceResolveAPIView.as_view()),
    path('spaces/<uuid:pk>/', SpaceDetailAPIView.as_view()),

    # Horarios (HU-25)
    path('spaces/<uuid:pk>/horarios/', SpaceOperatingHoursAPIView.as_view()),
    path('spaces/<uuid:pk>/horarios/<uuid:hour_id>/', SpaceOperatingHourDetailAPIView.as_view()),
]
