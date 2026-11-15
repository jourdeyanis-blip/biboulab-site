"""Affiche les deux e-mails de commande (vendeur et client) pour une commande d'exemple.

python manage.py apercu_emails    (rien n'est envoyé ni enregistré)
Les modèles se modifient dans l'administration : /admin/emails/
"""
from django.core.management.base import BaseCommand

from gestion import emails


class Command(BaseCommand):
    help = "Aperçu des e-mails de commande (rien n'est envoyé)."

    def handle(self, *args, **options):
        ctx = emails.contexte(emails.exemple())
        for nom in emails.MODELES:
            objet, corps = emails.rendre(*emails.source(nom)[:2], ctx)
            self.stdout.write(f"===== E-mail {nom.upper()} =====\nObjet : {objet}\n\n{corps}\n")
