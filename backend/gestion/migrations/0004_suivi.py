from django.db import migrations, models


class Migration(migrations.Migration):
    """Tableau personnel « Suivi commande » de l'administration (tickets façon Trello)."""

    dependencies = [
        ("gestion", "0003_expedition"),
    ]

    operations = [
        migrations.CreateModel(
            name="Suivi",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("tickets", models.JSONField(default=list)),
                ("version", models.PositiveIntegerField(default=0)),
                ("modifie_le", models.DateTimeField(auto_now=True)),
            ],
        ),
    ]
