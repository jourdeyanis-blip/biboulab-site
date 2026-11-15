from django.db import migrations, models


class Migration(migrations.Migration):
    """Expédition des commandes : prénom et nom séparés (étiquette), point de retrait,
    numéro de suivi et statut « Expédiée »."""

    dependencies = [
        ("gestion", "0002_modele_email"),
    ]

    operations = [
        migrations.AddField(model_name="commande", name="prenom", field=models.CharField(blank=True, max_length=100)),
        migrations.AddField(model_name="commande", name="nom_famille", field=models.CharField(blank=True, max_length=100)),
        migrations.AddField(model_name="commande", name="point_retrait", field=models.TextField(blank=True, verbose_name="point de retrait")),
        migrations.AddField(model_name="commande", name="numero_suivi", field=models.CharField(blank=True, max_length=40, verbose_name="numéro de suivi")),
        migrations.AddField(model_name="commande", name="expediee_le", field=models.DateTimeField(blank=True, null=True)),
        migrations.AlterField(
            model_name="commande", name="statut",
            field=models.CharField(choices=[("creee", "En cours de paiement"), ("attente", "Paiement en attente de confirmation"),
                                            ("payee", "Payée, à expédier"), ("expediee", "Expédiée"), ("echouee", "Paiement échoué")],
                                   default="creee", max_length=10),
        ),
    ]
