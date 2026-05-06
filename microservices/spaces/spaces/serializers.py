from rest_framework import serializers

from .models import Area, Space, SpaceOperatingHours


class AreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Area
        fields = ('id', 'code', 'name', 'description', 'sort_order')


class OperatingHoursSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpaceOperatingHours
        fields = ('id', 'day_of_week', 'opens_at', 'closes_at')


class SpaceSerializer(serializers.ModelSerializer):
    """Serializer de lectura — incluye área anidada y horarios."""
    area = AreaSerializer(read_only=True)
    operating_hours = OperatingHoursSerializer(many=True, read_only=True)

    class Meta:
        model = Space
        fields = (
            'id', 'area', 'code', 'name', 'description', 'floor', 'capacity',
            'space_type', 'has_air_conditioning', 'has_computers', 'has_projector',
            'has_internet', 'amenities', 'allowed_roles', 'status', 'is_active',
            'operating_hours', 'created_at', 'updated_at',
        )
        read_only_fields = fields


class SpaceWriteSerializer(serializers.ModelSerializer):
    """Serializer de escritura — acepta area_id como FK."""
    area_id = serializers.UUIDField(write_only=True, required=False)

    class Meta:
        model = Space
        fields = (
            'area_id', 'code', 'name', 'description', 'floor', 'capacity',
            'space_type', 'has_air_conditioning', 'has_computers', 'has_projector',
            'has_internet', 'amenities', 'allowed_roles', 'status', 'is_active',
        )

    def validate_area_id(self, value):
        if not Area.objects.filter(pk=value).exists():
            raise serializers.ValidationError('El área no existe.')
        return value

    def create(self, validated_data):
        area_id = validated_data.pop('area_id')
        area = Area.objects.get(pk=area_id)
        return Space.objects.create(area=area, **validated_data)

    def update(self, instance, validated_data):
        if 'area_id' in validated_data:
            area_id = validated_data.pop('area_id')
            instance.area = Area.objects.get(pk=area_id)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class AreaWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Area
        fields = ('code', 'name', 'description', 'sort_order')


class OperatingHoursWriteSerializer(serializers.Serializer):
    """Para actualizar horarios de un espacio (HU-25)."""
    day_of_week = serializers.IntegerField(min_value=0, max_value=6)
    opens_at = serializers.TimeField()
    closes_at = serializers.TimeField()

    def validate(self, data):
        if data.get('opens_at') and data.get('closes_at'):
            if data['opens_at'] >= data['closes_at']:
                raise serializers.ValidationError(
                    'La hora de apertura debe ser antes de la de cierre.'
                )
        return data
