"""Commandes payées en ligne (Stripe Checkout)."""
from django.db import models


class Commande(models.Model):
    CREEE, ATTENTE, PAYEE, ECHOUEE = "creee", "attente", "payee", "echouee"
    STATUTS = [
        (CREEE, "En cours de paiement"),
        (ATTENTE, "Paiement en attente de confirmation"),
        (PAYEE, "Payée"),
        (ECHOUEE, "Paiement échoué"),
    ]

    ref = models.CharField("référence", max_length=20, unique=True)
    statut = models.CharField(max_length=10, choices=STATUTS, default=CREEE)
    session_stripe = models.CharField(max_length=255, unique=True, null=True, blank=True)

    email = models.EmailField()
    nom = models.CharField(max_length=210)
    adresse = models.CharField(max_length=200)
    code_postal = models.CharField(max_length=10)
    ville = models.CharField(max_length=100)
    note = models.TextField(blank=True)

    lignes = models.JSONField()                       # [{id, nom, options, unitaire, quantite}]
    livraison = models.JSONField()                    # {id, label, delai, prix}
    sous_total = models.PositiveIntegerField()        # montants en centimes d'euro
    total = models.PositiveIntegerField()

    creee_le = models.DateTimeField(auto_now_add=True)
    payee_le = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-creee_le"]

    def __str__(self):
        return f"{self.ref} ({self.get_statut_display()})"
