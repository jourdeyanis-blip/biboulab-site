"""Formulaire de contact du site : envoi du message par e-mail à la boîte de l'entreprise.

  POST contact/   champs du formulaire de contact.html (FormData) → e-mail au vendeur

Remplace l'ancien envoyer-contact.php : mêmes contrôles (champs obligatoires, e-mail
valide, champ piège anti-robots, 5 messages par heure et par visiteur), même envoi
par le sendmail d'O2switch que les e-mails de commande.
"""
import logging
import re

from django.conf import settings
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.mail import EmailMessage
from django.core.validators import validate_email
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from .boutique import infos_site
from .paiement import _erreur, _meme_origine

log = logging.getLogger(__name__)

MESSAGES_PAR_HEURE = 5


def _ligne(v, maxi: int) -> str:
    """Une ligne : sans retour à la ligne ni tabulation (pas d'injection d'en-têtes)."""
    return re.sub(r"[\r\n\t]+", " ", str(v or ""))[:maxi].strip()


def _texte(v, maxi: int) -> str:
    return str(v or "").replace("\r\n", "\n").replace("\r", "\n")[:maxi].strip()


def _deja_trop(ip: str) -> bool:
    return (cache.get("contact:" + ip) or 0) >= MESSAGES_PAR_HEURE


def _compter(ip: str) -> None:
    cle = "contact:" + ip
    cache.add(cle, 0, 3600)
    try:
        cache.incr(cle)
    except ValueError:
        pass


@csrf_exempt   # appelé par le site public : ni session ni cookie, donc rien que la CSRF protégerait
@require_POST
def envoyer(request):
    if not _meme_origine(request):
        return _erreur("Requête refusée.", 403)
    d = request.POST
    if _ligne(d.get("site_web"), 200):           # champ piège invisible : rempli par un robot
        return JsonResponse({"ok": True})
    ip = request.META.get("REMOTE_ADDR", "?")
    if _deja_trop(ip):
        return _erreur("Trop de messages envoyés. Réessayez plus tard.", 429)

    prenom, nom = _ligne(d.get("prenom"), 100), _ligne(d.get("nom"), 100)
    email, message = _ligne(d.get("email"), 150), _texte(d.get("message"), 5000)
    perso = bool(d.get("personnalisation"))
    dimensions, couleur = _ligne(d.get("dimensions"), 100), _ligne(d.get("couleur"), 100)
    if not prenom or not nom or not message or not d.get("accord"):
        return _erreur("Champs obligatoires manquants.", 422)
    try:
        validate_email(email)
    except ValidationError:
        return _erreur("Adresse e-mail invalide.", 422)

    site = infos_site()["nom"]
    complet = f"{prenom} {nom}"
    objet = f"{'Demande de personnalisation' if perso else 'Message'} — {complet}"
    corps = (f"Nouveau message depuis le site {site}\n\n"
             f"Prénom : {prenom}\nNom : {nom}\nE-mail : {email}\n"
             + (f"Type : demande de personnalisation\nDimensions : {dimensions or '—'}\nCouleur : {couleur or '—'}\n" if perso else "")
             + f"\nMessage :\n{message}\n")
    try:
        EmailMessage(objet, corps, settings.COMMANDES_EXPEDITEUR,   # adresse seule : sendmail la reçoit en -f
                     [settings.CONTACT_DESTINATAIRE],
                     reply_to=[f"{complet} <{email}>"]).send()
    except Exception:
        log.exception("Formulaire de contact : envoi impossible")
        return _erreur("L'envoi a échoué.", 500)
    _compter(ip)
    log.info("Formulaire de contact : message envoyé")
    return JsonResponse({"ok": True})
