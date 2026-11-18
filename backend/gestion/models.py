"""Commandes payées en ligne (Stripe Checkout), leur expédition, et modèles des e-mails."""
from django.db import models


class Commande(models.Model):
    CREEE, ATTENTE, PAYEE, EXPEDIEE, ECHOUEE = "creee", "attente", "payee", "expediee", "echouee"
    STATUTS = [
        (CREEE, "En cours de paiement"),
        (ATTENTE, "Paiement en attente de confirmation"),
        (PAYEE, "Payée, à expédier"),
        (EXPEDIEE, "Expédiée"),
        (ECHOUEE, "Paiement échoué"),
    ]
    REGLEES = (PAYEE, EXPEDIEE)   # payées : un webhook Stripe tardif ne doit plus y toucher

    ref = models.CharField("référence", max_length=20, unique=True)
    statut = models.CharField(max_length=10, choices=STATUTS, default=CREEE)
    session_stripe = models.CharField(max_length=255, unique=True, null=True, blank=True)

    email = models.EmailField()
    nom = models.CharField(max_length=210)            # prénom et nom
    prenom = models.CharField(max_length=100, blank=True)
    nom_famille = models.CharField(max_length=100, blank=True)
    adresse = models.CharField(max_length=200)
    code_postal = models.CharField(max_length=10)
    ville = models.CharField(max_length=100)
    note = models.TextField(blank=True)
    point_retrait = models.TextField("point de retrait", blank=True)   # recopié par le client (Colissimo, Mondial Relay)

    lignes = models.JSONField()                       # [{id, nom, options, unitaire, quantite}]
    livraison = models.JSONField()                    # {id, label, delai, prix, transporteur, point, suivi}
    sous_total = models.PositiveIntegerField()        # montants en centimes d'euro
    total = models.PositiveIntegerField()

    creee_le = models.DateTimeField(auto_now_add=True)
    payee_le = models.DateTimeField(null=True, blank=True)
    numero_suivi = models.CharField("numéro de suivi", max_length=40, blank=True)
    expediee_le = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-creee_le"]

    def __str__(self):
        return f"{self.ref} ({self.get_statut_display()})"

    def coordonnees(self) -> tuple[str, str]:
        """(prénom, nom) séparés ; les commandes plus anciennes n'ont que le nom complet."""
        if self.prenom or self.nom_famille:
            return self.prenom, self.nom_famille
        prenom, _, nom = self.nom.partition(" ")
        return prenom, nom

    def lien_suivi(self) -> str:
        """Adresse de suivi du colis (modèle du mode de livraison, {numero} remplacé)."""
        modele = (self.livraison or {}).get("suivi") or ""
        if not self.numero_suivi or not modele:
            return ""
        return modele.replace("{numero}", self.numero_suivi).replace("{cp}", self.code_postal)


class ModeleEmail(models.Model):
    """Modèle d'e-mail modifié dans l'administration (sinon : gestion/modeles_emails/)."""
    nom = models.CharField(max_length=20, unique=True)     # « client », « vendeur » ou « expedition »
    objet = models.CharField(max_length=300)
    corps = models.TextField()
    modifie_le = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.nom


class Suivi(models.Model):
    """Tableau personnel « Suivi commande » de l'administration (tickets façon Trello :
    Commande → En cours d'impression → À livrer). Indépendant des commandes payées du site.
    Une seule ligne : la liste des tickets telle que la page de gestion la manipule."""
    tickets = models.JSONField(default=list)
    version = models.PositiveIntegerField(default=0)   # un autre onglet ou appareil n'écrase pas les changements
    modifie_le = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Suivi des commandes ({len(self.tickets)} tickets)"
