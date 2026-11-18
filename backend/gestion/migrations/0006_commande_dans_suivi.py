from django.db import migrations, models


class Migration(migrations.Migration):
    """Commandes payées sur le site ajoutées au tableau « Suivi commande » (une seule fois)."""

    dependencies = [
        ("gestion", "0005_suivi_etiquettes"),
    ]

    operations = [
        migrations.AddField(model_name="commande", name="dans_suivi",
                            field=models.BooleanField(default=False, verbose_name="ajoutée au tableau de suivi")),
    ]
