from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('spaces', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='space',
            name='description',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='space',
            name='space_type',
            field=models.CharField(
                choices=[
                    ('Aula', 'Aula'),
                    ('Laboratorio', 'Laboratorio'),
                    ('Auditorio', 'Auditorio'),
                    ('Sala', 'Sala'),
                ],
                default='Aula',
                max_length=32,
            ),
        ),
        migrations.AddField(
            model_name='space',
            name='allowed_roles',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='space',
            name='is_active',
            field=models.BooleanField(default=True),
        ),
        migrations.AlterField(
            model_name='space',
            name='status',
            field=models.CharField(
                choices=[
                    ('operational', 'Operacional'),
                    ('maintenance', 'En mantenimiento'),
                    ('inactive', 'Inactivo'),
                ],
                default='operational',
                max_length=32,
            ),
        ),
    ]
