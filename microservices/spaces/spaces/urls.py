from django.urls import path

from .api import (
    AreaDetailAPIView,
    AreaListCreateAPIView,
    SpaceDetailAPIView,
    SpaceListCreateAPIView,
    SpaceOperatingHourDetailAPIView,
    SpaceOperatingHoursAPIView,
    SpaceResolveAPIView,
    health_check,
)

urlpatterns = [
    # Dependencias / Áreas — HU-1
    path('areas/', AreaListCreateAPIView.as_view()),
    path('areas/<uuid:pk>/', AreaDetailAPIView.as_view()),

    # Espacios — CRUD (HU-20, 21, 22, 23)
    path('spaces/', SpaceListCreateAPIView.as_view()),
    path('spaces/resolve/', SpaceResolveAPIView.as_view()),
    path('spaces/<uuid:pk>/', SpaceDetailAPIView.as_view()),

    # Horarios (HU-25)
    path('spaces/<uuid:pk>/horarios/', SpaceOperatingHoursAPIView.as_view()),
    path('spaces/<uuid:pk>/horarios/<uuid:hour_id>/', SpaceOperatingHourDetailAPIView.as_view()),
]
