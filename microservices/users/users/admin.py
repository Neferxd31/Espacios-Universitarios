from django.contrib import admin

from .models import Role, User, UserSession


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('id', 'name')
    search_fields = ('name',)


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('university_code', 'email', 'first_name', 'last_name', 'role', 'is_active', 'created_at')
    list_filter = ('role', 'is_active')
    search_fields = ('university_code', 'email', 'first_name', 'last_name')
    readonly_fields = ('id', 'password_hash', 'created_at', 'updated_at')
    ordering = ('university_code',)


@admin.register(UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'ip_address', 'expires_at', 'created_at')
    list_filter = ('expires_at',)
    search_fields = ('user__university_code', 'user__email', 'ip_address')
    readonly_fields = ('id', 'refresh_token', 'created_at')
