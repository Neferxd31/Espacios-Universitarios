from rest_framework import serializers

from .models import NotificationHistory


class NotificationHistorySerializer(serializers.ModelSerializer):
  class Meta:
    model = NotificationHistory
    fields = (
      'id', 'reservation_id', 'user_id', 'user_email',
      'type', 'status', 'subject', 'body',
      'sent_at', 'created_at',
    )
