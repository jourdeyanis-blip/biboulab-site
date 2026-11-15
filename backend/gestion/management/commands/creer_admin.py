"""Crée le compte d'administration, ou change son mot de passe.

    python manage.py creer_admin

Demande un identifiant et un mot de passe (12 caractères minimum).
Si le compte existe déjà, son mot de passe est remplacé.
"""
import getpass

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Crée le compte d'administration ou change son mot de passe."

    def add_arguments(self, parser):
        parser.add_argument("--identifiant", help="Identifiant du compte (demandé sinon).")

    def handle(self, *args, **opts):
        User = get_user_model()
        identifiant = opts["identifiant"] or input("Identifiant : ").strip()
        if not identifiant:
            raise CommandError("Identifiant vide.")
        user = User.objects.filter(username=identifiant).first() or User(username=identifiant)

        mdp = getpass.getpass("Mot de passe (12 caractères minimum) : ")
        if mdp != getpass.getpass("Confirmez le mot de passe : "):
            raise CommandError("Les deux mots de passe sont différents.")
        try:
            validate_password(mdp, user)
        except ValidationError as e:
            raise CommandError(" ".join(e.messages))

        user.is_active = True
        user.is_staff = True
        user.set_password(mdp)
        user.save()
        self.stdout.write(self.style.SUCCESS(f"Compte « {identifiant} » prêt. Connexion : https://<votre-domaine>/admin/"))
