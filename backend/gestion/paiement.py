"""Paiement en ligne avec Stripe Checkout (page de paiement hébergée par Stripe).

  POST paiement/session/  panier du site → commande + session Checkout → adresse de la page Stripe
  GET  paiement/etat/     état d'une session, pour la page de retour du site
  POST paiement/webhook/  événements signés envoyés par Stripe : seule preuve de paiement

Les montants sont recalculés par boutique.calculer() : la requête du navigateur ne
contient aucun prix. La commande n'est considérée comme payée qu'à réception du
webhook, jamais au simple retour du client sur le site.
"""
import json
import logging
import re
import secrets
import time
from urllib.parse import urlsplit

import stripe
from django.conf import settings
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from .boutique import CatalogueIndisponible, PanierInvalide, calculer
from .emails import envoyer_commande_payee
from .models import Commande

log = logging.getLogger(__name__)

INDISPONIBLE = "Le paiement en ligne est momentanément indisponible. Réessayez dans quelques minutes, ou contactez-moi."
NON_ACTIVE = "Le paiement en ligne n'est pas encore activé : contactez-moi pour passer commande."
CODE_POSTAL = re.compile(r"^\d{5}$")
ID_SESSION = re.compile(r"^cs_(?:test|live)_[A-Za-z0-9]{1,250}$")
DELAI = re.compile(r"(\d+)\s*à\s*(\d+)\s*jours?\s*(ouvrés?)?")
ESSAIS_PAR_HEURE = 20
PAYE = ("paid", "no_payment_required")


def _stripe() -> stripe.StripeClient:
    return stripe.StripeClient(settings.STRIPE_SECRET_KEY)


def _erreur(message: str, statut: int) -> JsonResponse:
    return JsonResponse({"ok": False, "erreur": message}, status=statut)


def _meme_origine(request) -> bool:
    """Le bouton « Payer » du site envoie toujours l'en-tête Origin de son propre domaine."""
    hote = urlsplit(request.headers.get("Origin", "")).netloc
    return bool(hote) and hote == request.get_host()


def _trop_d_essais(request) -> bool:
    cle = "paiement-essais:" + request.META.get("REMOTE_ADDR", "?")
    cache.add(cle, 0, 3600)
    try:
        return cache.incr(cle) > ESSAIS_PAR_HEURE
    except ValueError:
        return False


def _coordonnees(d) -> dict:
    if not isinstance(d, dict):
        raise PanierInvalide("Complétez votre adresse de livraison.")

    def champ(nom: str, maxi: int, requis: bool = True) -> str:
        v = d.get(nom, "")
        if not isinstance(v, str):
            raise PanierInvalide("Complétez votre adresse de livraison.")
        v = v.strip() if nom == "note" else " ".join(v.split())
        if len(v) > maxi:
            raise PanierInvalide("Un des champs de l'adresse de livraison est trop long.")
        if requis and not v:
            raise PanierInvalide("Complétez votre adresse de livraison.")
        return v

    c = {"prenom": champ("prenom", 100), "nom": champ("nom", 100), "email": champ("email", 150),
         "adresse": champ("adresse", 200), "cp": champ("cp", 10), "ville": champ("ville", 100),
         "note": champ("note", 450, requis=False), "point": champ("point", 300, requis=False)}
    try:
        validate_email(c["email"])
    except ValidationError:
        raise PanierInvalide("Adresse e-mail invalide.") from None
    if not CODE_POSTAL.match(c["cp"]):
        raise PanierInvalide("Code postal invalide : 5 chiffres (livraison en France métropolitaine).")
    return c


def _parametres(cde: Commande, base: str) -> dict:
    """Paramètres de la session Checkout. Les moyens de paiement (carte, Apple Pay,
    Google Pay, Link…) se règlent dans le Dashboard Stripe : on n'en impose aucun."""
    liv = cde.livraison
    tarif = {"type": "fixed_amount", "fixed_amount": {"amount": liv["prix"], "currency": "eur"},
             "display_name": liv["label"] + ("" if liv["prix"] else " (offerte)")}
    m = DELAI.search(liv.get("delai", ""))
    if m:
        unite = "business_day" if m.group(3) else "day"
        tarif["delivery_estimate"] = {"minimum": {"unit": unite, "value": int(m.group(1))},
                                      "maximum": {"unit": unite, "value": int(m.group(2))}}
    meta = {"commande": cde.ref}
    if cde.note:
        meta["note"] = cde.note
    if cde.point_retrait:
        meta["point_retrait"] = cde.point_retrait[:500]
    return {
        "mode": "payment",
        "line_items": [{
            "quantity": l["quantite"],
            "price_data": {"currency": "eur", "unit_amount": l["unitaire"],
                           "product_data": {"name": l["nom"][:250], **({"description": l["options"]} if l["options"] else {})}},
        } for l in cde.lignes],
        "shipping_options": [{"shipping_rate_data": tarif}],
        "customer_email": cde.email,
        "client_reference_id": cde.ref,
        "metadata": meta,
        "payment_intent_data": {
            "description": f"Commande {cde.ref}",
            "metadata": {"commande": cde.ref},
            "shipping": {"name": cde.nom, "address": {"line1": cde.adresse, "postal_code": cde.code_postal,
                                                      "city": cde.ville, "country": "FR"}},
        },
        "adaptive_pricing": {"enabled": True},
        "locale": "fr",
        "submit_type": "pay",
        "expires_at": int(time.time()) + 3600,
        "success_url": base + "panier.html?paiement=ok&session_id={CHECKOUT_SESSION_ID}",
        "cancel_url": base + "panier.html?paiement=annule",
    }


# ---------- Création de la session de paiement ----------
@csrf_exempt   # appelé par le site public : ni session ni cookie, donc rien que la CSRF protégerait
@require_POST
def creer_session(request):
    if not settings.STRIPE_SECRET_KEY:
        return _erreur(NON_ACTIVE, 503)
    if not _meme_origine(request):
        return _erreur("Requête refusée.", 403)
    if len(request.body) > 20_000:
        return _erreur("Panier trop volumineux.", 413)
    if _trop_d_essais(request):
        return _erreur("Trop de tentatives de paiement. Réessayez dans une heure.", 429)
    try:
        data = json.loads(request.body)
        if not isinstance(data, dict):
            raise PanierInvalide("Requête invalide : rechargez la page.")
        client = _coordonnees(data.get("client"))
        calcul = calculer(data.get("panier"), data.get("livraison"))
        if calcul["livraison"]["point"] and not client["point"]:
            raise PanierInvalide("Indiquez le point de retrait choisi pour la livraison.")
    except PanierInvalide as e:
        return _erreur(str(e), 400)
    except ValueError:
        return _erreur("Requête invalide : rechargez la page.", 400)
    except CatalogueIndisponible:
        log.exception("Catalogue illisible : paiement refusé")
        return _erreur(INDISPONIBLE, 503)

    cde = Commande.objects.create(
        ref="BL-" + secrets.token_hex(4).upper(),
        email=client["email"], nom=f"{client['prenom']} {client['nom']}", prenom=client["prenom"], nom_famille=client["nom"],
        adresse=client["adresse"], code_postal=client["cp"], ville=client["ville"], note=client["note"],
        point_retrait=client["point"] if calcul["livraison"]["point"] else "",
        lignes=calcul["lignes"], livraison=calcul["livraison"], sous_total=calcul["sous_total"], total=calcul["total"],
    )
    base = f"{'http' if settings.DEBUG else 'https'}://{request.get_host()}/"
    try:
        session = _stripe().v1.checkout.sessions.create(
            _parametres(cde, base), {"idempotency_key": f"commande-{cde.ref}"})
    except stripe.StripeError:
        log.exception("Session Stripe impossible pour %s", cde.ref)
        cde.delete()
        return _erreur(INDISPONIBLE, 502)
    cde.session_stripe = session.id
    cde.save(update_fields=["session_stripe"])
    return JsonResponse({"ok": True, "url": session.url})


# ---------- Page de retour du site ----------
@require_GET
def etat_session(request):
    sid = request.GET.get("session_id", "")
    if not settings.STRIPE_SECRET_KEY or not ID_SESSION.match(sid):
        return _erreur("Session inconnue.", 404)
    try:
        s = _stripe().v1.checkout.sessions.retrieve(sid)
    except stripe.InvalidRequestError:
        return _erreur("Session inconnue.", 404)
    except stripe.StripeError:
        log.exception("Lecture de la session Stripe impossible")
        return _erreur(INDISPONIBLE, 502)
    statut = Commande.PAYEE if s.payment_status in PAYE else Commande.ATTENTE if s.status == "complete" else Commande.CREEE
    return JsonResponse({"ok": True, "ref": s.client_reference_id, "statut": statut})


# ---------- Webhook Stripe ----------
@csrf_exempt   # authentifié par la signature Stripe-Signature
@require_POST
def webhook(request):
    if not settings.STRIPE_WEBHOOK_SECRET:
        return HttpResponse(status=503)
    try:
        event = stripe.Webhook.construct_event(
            request.body, request.headers.get("Stripe-Signature", ""), settings.STRIPE_WEBHOOK_SECRET)
    except (ValueError, stripe.SignatureVerificationError):
        return HttpResponse(status=400)
    if event.type.startswith("checkout.session."):
        _traiter(event.type, event.data.object)
    return HttpResponse(status=200)


def _traiter(type_evenement: str, s) -> None:
    cde = (Commande.objects.filter(session_stripe=s.id).first()
           or Commande.objects.filter(ref=getattr(s, "client_reference_id", None) or "").first())
    if not cde:
        log.warning("Webhook %s pour une session inconnue (%s)", type_evenement, s.id)
        return
    commande = Commande.objects.filter(pk=cde.pk)

    if type_evenement == "checkout.session.expired":
        # Panier abandonné : on ne garde pas les coordonnées d'un client qui n'a rien acheté.
        commande.filter(statut=Commande.CREEE).delete()
    elif type_evenement == "checkout.session.async_payment_failed":
        commande.exclude(statut__in=Commande.REGLEES).update(statut=Commande.ECHOUEE)
    elif type_evenement in ("checkout.session.completed", "checkout.session.async_payment_succeeded"):
        if s.payment_status in PAYE:
            # update() renvoie 0 si la commande était déjà payée : Stripe peut renvoyer
            # un même événement, le vendeur n'est prévenu qu'une fois.
            if commande.exclude(statut__in=Commande.REGLEES).update(statut=Commande.PAYEE, payee_le=timezone.now()):
                envoyer_commande_payee(commande.get())
        else:   # moyen de paiement différé (ex. prélèvement SEPA) : confirmation plus tard
            commande.filter(statut=Commande.CREEE).update(statut=Commande.ATTENTE)
