from django.contrib import admin

from .models import OutboxEvent, Reservation, ReservationRules


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'space_id',
        'requester_user_id',
        'reservation_date',
        'start_hour',
        'end_hour',
        'status',
        'updated_at',
    )
    list_filter = ('status', 'reservation_date')
    search_fields = ('id', 'space_id', 'requester_user_id')


@admin.register(OutboxEvent)
class OutboxEventAdmin(admin.ModelAdmin):
    list_display = ('event_type', 'created_at', 'published_at')
    list_filter = ('event_type',)


@admin.register(ReservationRules)
class ReservationRulesAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'max_hours_per_day',
        'min_anticipation_hours',
        'max_anticipation_days',
        'cancel_anticipation_hours',
        'max_simultaneous_per_user',
        'updated_at',
    )
