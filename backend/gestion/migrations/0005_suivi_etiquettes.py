from django.db import migrations, models


class Migration(migrations.Migration):
    """Étiquettes personnalisées du tableau « Suivi commande »."""

    dependencies = [
        ("gestion", "0004_suivi"),
    ]

    operations = [
        migrations.AddField(model_name="suivi", name="etiquettes", field=models.JSONField(default=list)),
    ]
