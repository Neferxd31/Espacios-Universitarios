from django.contrib import admin
from django.urls import path

from users import api, views

urlpatterns = [
    path('admin/', admin.site.urls),

    # Salud del servicio
    path('api/health/', api.health_check),

    # ------------------------------------------------------------------ #
    # Auth — HU-01 a HU-04                                               #
    # ------------------------------------------------------------------ #
    path('api/v1/auth/register/', api.RegisterAPIView.as_view()),
    path('api/v1/auth/login/', api.LoginAPIView.as_view()),
    path('api/v1/auth/logout/', api.LogoutAPIView.as_view()),
    path('api/v1/auth/password-recovery/', api.PasswordRecoveryAPIView.as_view()),

    # ------------------------------------------------------------------ #
    # Perfil — HU-05                                                      #
    # ------------------------------------------------------------------ #
    path('api/v1/users/me/', api.UpdateProfileAPIView.as_view()),

    # ------------------------------------------------------------------ #
    # HU-04 — Recuperación de contraseña (reset)                         #
    # ------------------------------------------------------------------ #
    path('api/v1/auth/reset-password/', api.ResetPasswordAPIView.as_view()),

    # ------------------------------------------------------------------ #
    # Admin — HU-16, 17, 18, 19                                          #
    # ------------------------------------------------------------------ #
    path('api/v1/admin/users/', api.AdminUserListCreateAPIView.as_view()),
    path('api/v1/admin/users/<uuid:pk>/', api.AdminUserDetailAPIView.as_view()),

    # ------------------------------------------------------------------ #
    # Endpoints internos (consumidos por otros microservicios)            #
    # ------------------------------------------------------------------ #
    path('api/v1/users/resolve/', api.UserResolveAPIView.as_view()),
    path('api/v1/users/<uuid:pk>/', api.UserDetailAPIView.as_view()),
]
