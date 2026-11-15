"""Crée (ou réinitialise) le compte d'administration et son second facteur.

    python manage.py creer_admin

Demande un identifiant et un mot de passe, puis affiche :
  - un QR code à scanner avec une application d'authentification
    (Google Authenticator, Microsoft Authenticator, Aegis, 1Password…) ;
  - 10 codes de secours à usage unique, à conserver hors ligne.
Tout ancien code (application ou secours) du compte est révoqué.
"""
import base64
import getpass
import io
import secrets

import qrcode
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django_otp.plugins.otp_static.models import StaticDevice, StaticToken
from django_otp.plugins.otp_totp.models import TOTPDevice

ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"   # sans 0/O ni 1/I


class Command(BaseCommand):
    help = "Crée ou réinitialise le compte d'administration (mot de passe + code à usage unique)."

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

        with transaction.atomic():
            user.is_active = True
            user.is_staff = True
            user.set_password(mdp)
            user.save()
            TOTPDevice.objects.filter(user=user).delete()
            StaticDevice.objects.filter(user=user).delete()
            totp = TOTPDevice.objects.create(user=user, name="Application", confirmed=True)
            secours = StaticDevice.objects.create(user=user, name="Secours", confirmed=True)
            codes = ["".join(secrets.choice(ALPHABET) for _ in range(12)) for _ in range(10)]
            for c in codes:
                StaticToken.objects.create(device=secours, token=c)

        cle = base64.b32encode(totp.bin_key).decode()
        qr = qrcode.QRCode(border=2)
        qr.add_data(totp.config_url)
        dessin = io.StringIO()
        qr.print_ascii(out=dessin, invert=True)
        self.stdout.write("\n1) Scannez ce QR code avec votre application d'authentification :\n")
        self.stdout.write(dessin.getvalue(), ending="")
        self.stdout.write(f"\n   Ou saisissez la clé à la main : {' '.join(cle[i:i + 4] for i in range(0, len(cle), 4))}\n")
        self.stdout.write("\n2) Codes de secours (usage unique, si vous perdez votre téléphone).\n   Notez-les sur papier ou dans un gestionnaire de mots de passe :\n\n")
        for c in codes:
            self.stdout.write(f"   {c[:4]}-{c[4:8]}-{c[8:]}\n")
        self.stdout.write(self.style.SUCCESS(f"\nCompte « {identifiant} » prêt. Connexion : https://<votre-domaine>/admin/\n"))
