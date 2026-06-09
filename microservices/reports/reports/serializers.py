from rest_framework import serializers

from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
  class Meta:
    model = AuditLog
    fields = (
      'id', 'user_id', 'user_label', 'action', 'resource', 'resource_id',
      'metadata', 'ip_address', 'timestamp',
    )
    read_only_fields = ('id', 'timestamp')
