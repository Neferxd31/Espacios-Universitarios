from rest_framework import serializers


class ReservationCreateSerializer(serializers.Serializer):
    """
    Create a reservation by referencing human-readable codes.
    The reservations service resolves user and space UUIDs via HTTP to peer services.
    """

    area_code = serializers.SlugField()
    space_code = serializers.CharField(max_length=64)
    university_code = serializers.CharField(max_length=32)
    reservation_date = serializers.DateField()
    start_hour = serializers.IntegerField(min_value=0, max_value=23)
    end_hour = serializers.IntegerField(min_value=1, max_value=24)

    def validate(self, attrs):
        if attrs['start_hour'] >= attrs['end_hour']:
            raise serializers.ValidationError(
                {'end_hour': 'end_hour must be greater than start_hour (hourly half-open range).'}
            )
        return attrs
