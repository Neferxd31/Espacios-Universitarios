from django.db import migrations, models


class Migration(migrations.Migration):
    """
    HU-1: Extiende el modelo Area para soportar tipo de entidad y responsable.
    """

    dependencies = [
        ('spaces', '0002_space_add_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='area',
            name='area_type',
            field=models.CharField(
                choices=[
                    ('departamento', 'Departamento'),
                    ('unidad', 'Unidad'),
                    ('dependencia', 'Dependencia'),
                ],
                default='departamento',
                help_text='Tipo de entidad: departamento, unidad o dependencia.',
                max_length=32,
            ),
        ),
        migrations.AddField(
            model_name='area',
            name='responsible_user_id',
            field=models.UUIDField(
                blank=True,
                null=True,
                help_text='UUID del usuario responsable (jefe) de esta dependencia.',
            ),
        ),
    ]
