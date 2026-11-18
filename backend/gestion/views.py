"""Administration en ligne : connexion (identifiant + mot de passe) et actions du panneau."""
import json
import re
import secrets
import time
from functools import wraps

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.http import FileResponse, Http404, HttpResponse, JsonResponse
from django.middleware.csrf import get_token
from django.shortcuts import redirect, render
from django.urls import reverse
from django.views.decorators.debug import sensitive_post_parameters
from django.views.decorators.http import require_GET, require_http_methods, require_POST

from . import boutique
from . import emails as courriels
from . import contenu as contenus
from .catalogue import Invalide, enregistrer, enregistrer_photo, verifier
from django.utils import timezone

from django.db import transaction

from .models import Commande, ModeleEmail, Suivi
from .securite import csp

ERREUR = "Identifiant ou mot de passe incorrect."
BLOQUE = "Trop de tentatives. Réessayez dans 15 minutes."


def _verifie(user) -> bool:
    return user.is_authenticated and user.is_active and user.is_staff


def admin_requis(api=False):
    """Accès réservé à un compte d'administration connecté."""
    def deco(vue):
        @wraps(vue)
        def enveloppe(request, *args, **kwargs):
            if not _verifie(request.user):
                if api:
                    return JsonResponse({"ok": False, "erreur": "Session expirée : reconnectez-vous dans un autre onglet, puis rechargez cette page."}, status=401)
                return redirect("connexion")
            return vue(request, *args, **kwargs)
        return enveloppe
    return deco


# ---------- Connexion ----------
def bloque(request, credentials, *args, **kwargs):
    """Réponse de django-axes quand l'adresse est bloquée."""
    return render(request, "gestion/connexion.html", {"erreur": BLOQUE}, status=429)


@sensitive_post_parameters("mdp")
@require_http_methods(["GET", "POST"])
def connexion(request):
    if _verifie(request.user):
        return redirect("panneau")
    erreur = ""
    if request.method == "POST":
        identifiant = request.POST.get("identifiant", "")[:150]
        mdp = request.POST.get("mdp", "")[:1024]

        user = authenticate(request, username=identifiant, password=mdp)
        if getattr(request, "axes_locked_out", False):
            return bloque(request, None)
        if user is not None and user.is_active and user.is_staff:
            login(request, user)            # nouvel identifiant de session (anti-fixation)
            request.session["debut"] = time.time()
            return redirect("panneau")
        time.sleep(0.5 + secrets.randbelow(700) / 1000)   # ralentit les essais en série
        erreur = ERREUR
    return render(request, "gestion/connexion.html", {"erreur": erreur}, status=401 if erreur else 200)


# ---------- Panneau ----------
@require_GET
@admin_requis()
def panneau(request):
    # « /admin » sans « / » final : les liens relatifs de la page seraient faux.
    if not request.path.endswith("/") or request.META.get("PATH_INFO", "/") == "":
        return redirect(request.path.rstrip("/") + "/")
    nonce = secrets.token_urlsafe(16)
    html = settings.PANNEAU_HTML.read_text("utf-8")
    html = re.sub(r"<script(?=[\s>])", f'<script nonce="{nonce}"', html)
    init = f'<script nonce="{nonce}">window.ADMIN_ONLINE={json.dumps({"csrf": get_token(request), "api": reverse("panneau") + "api/"})};</script>\n'
    html = html.replace("</head>", init + "</head>", 1)
    response = HttpResponse(html, content_type="text/html; charset=utf-8")
    response["Content-Security-Policy"] = csp(nonce)
    return response


# ---------- Modèles des e-mails de commande ----------
@require_http_methods(["GET", "POST"])
@admin_requis()
def modeles_emails(request):
    actif = request.POST.get("modele") or request.GET.get("modele") or "client"
    if actif not in courriels.MODELES:
        actif = "client"
    message = erreur = ""
    saisie = None   # texte en cours de modification (aperçu ou erreur) : on ne le perd pas
    if request.method == "POST":
        action = request.POST.get("action")
        if action == "defaut":
            ModeleEmail.objects.filter(nom=actif).delete()
            message = "Modèle par défaut rétabli."
        else:
            objet = request.POST.get("objet", "").replace("\r\n", "\n")
            corps = request.POST.get("corps", "").replace("\r\n", "\n")
            try:
                courriels.verifier(objet, corps)
            except courriels.ModeleInvalide as e:
                erreur, saisie = str(e), (objet, corps)
            else:
                if action == "enregistrer":
                    ModeleEmail.objects.update_or_create(nom=actif, defaults={"objet": objet, "corps": corps})
                    message = "Modèle enregistré : il servira dès la prochaine commande payée."
                else:
                    saisie, message = (objet, corps), "Aperçu mis à jour (pas encore enregistré)."

    objet, corps, perso = courriels.source(actif)
    if saisie:
        objet, corps = saisie
    try:
        apercu = courriels.rendre(objet, corps, courriels.contexte(courriels.exemple()))
        logo = reverse("emails_logo") if courriels.LOGO.is_file() else None
        apercu_html = courriels.habiller(*apercu, logo, document=False)
    except Exception:
        apercu = apercu_html = None
    return render(request, "gestion/emails.html", {
        "apercu_html": apercu_html,
        "modeles": courriels.MODELES.items(), "actif": actif, "titre": courriels.MODELES[actif],
        "objet": objet, "corps": corps, "perso": perso, "non_enregistre": bool(saisie),
        "apercu": apercu, "message": message, "erreur": erreur, "variables": courriels.VARIABLES,
        "destinataire": settings.COMMANDES_DESTINATAIRE,
    }, status=400 if erreur else 200)


@require_GET
@admin_requis()
def logo_email(request):
    """Logo du bandeau des e-mails, pour l'aperçu de l'administration."""
    if not courriels.LOGO.is_file():
        raise Http404
    return FileResponse(open(courriels.LOGO, "rb"), content_type="image/png")


# ---------- Commandes à expédier ----------
NUMERO_SUIVI = re.compile(r"^[A-Z0-9]{8,20}$")
VUES = {
    "a-expedier": ("À expédier", (Commande.PAYEE,)),
    "expediees": ("Expédiées", (Commande.EXPEDIEE,)),
    "attente": ("Paiement en attente", (Commande.ATTENTE,)),
}


def _fiche(cde: Commande) -> dict:
    ctx = courriels.contexte(cde)
    return {"cde": cde, "lignes": ctx["lignes"], "total": ctx["total"], "livraison": ctx["livraison"],
            "lien_suivi": ctx["lien_suivi"],
            "etiquette": [("Prénom", ctx["prenom"]), ("Nom", ctx["nom_famille"]), ("Adresse", cde.adresse),
                          ("Code postal", cde.code_postal), ("Ville", cde.ville), ("E-mail", cde.email)]}


@require_http_methods(["GET", "POST"])
@admin_requis()
def commandes(request):
    """Commandes payées : coordonnées prêtes à recopier pour l'étiquette, puis numéro de suivi
    → statut « Expédiée » et e-mail au client avec le lien de suivi."""
    vue = request.GET.get("vue") if request.GET.get("vue") in VUES else "a-expedier"
    message = erreur = ""
    if request.method == "POST":
        cde = Commande.objects.filter(ref=request.POST.get("ref", "")[:20], statut__in=Commande.REGLEES).first()
        numero = re.sub(r"[\s-]+", "", request.POST.get("numero_suivi", ""))[:40].upper()
        if not cde:
            erreur = "Commande introuvable ou pas encore payée."
        elif not NUMERO_SUIVI.match(numero):
            erreur = f"Numéro de suivi invalide pour {cde.ref} : 8 à 20 lettres et chiffres (ex. 6A12345678901)."
        else:
            deja = cde.statut == Commande.EXPEDIEE
            cde.numero_suivi, cde.statut = numero, Commande.EXPEDIEE
            cde.expediee_le = cde.expediee_le or timezone.now()
            cde.save(update_fields=["numero_suivi", "statut", "expediee_le"])
            if courriels.envoyer_expedition(cde):
                message = f"{cde.ref} : {'numéro corrigé, ' if deja else 'marquée comme expédiée, '}e-mail de suivi envoyé à {cde.email}."
            else:
                erreur = f"{cde.ref} est marquée comme expédiée, mais l'e-mail au client n'a pas pu partir. Réessayez plus tard avec le même numéro."

    liste = Commande.objects.filter(statut__in=VUES[vue][1])
    liste = liste.order_by("payee_le", "creee_le") if vue == "a-expedier" else liste.order_by("-expediee_le", "-creee_le")
    nonce = secrets.token_urlsafe(16)
    response = render(request, "gestion/commandes.html", {
        "vues": [(k, v[0], Commande.objects.filter(statut__in=v[1]).count()) for k, v in VUES.items()],
        "vue": vue, "fiches": [_fiche(c) for c in liste[:100]], "message": message, "erreur": erreur, "nonce": nonce,
    }, status=400 if erreur and not message else 200)
    response["Content-Security-Policy"] = csp(nonce)
    return response


# ---------- API du panneau (JSON) ----------
def _fin(chemin, lignes=200) -> str:
    """Dernières lignes d'un fichier journal (ou un mot d'explication s'il n'existe pas)."""
    try:
        with open(chemin, "rb") as f:
            f.seek(0, 2)
            f.seek(max(0, f.tell() - 200_000))
            texte = f.read().decode("utf-8", "replace")
    except OSError:
        return "(fichier absent : rien n'a encore été écrit)"
    return "\n".join(texte.splitlines()[-lignes:]) or "(vide)"


@require_GET
@admin_requis()
def journal(request):
    """Dernières erreurs de l'application et dernières mises à jour automatiques, en texte brut :
    évite d'aller chercher les fichiers journaux sur le serveur."""
    texte = (f"=== Erreurs de l'application ({settings.JOURNAL_ERREURS.name}) ===\n{_fin(settings.JOURNAL_ERREURS)}\n\n"
             f"=== Mises à jour automatiques ({settings.JOURNAL_DEPLOIEMENT.name}) ===\n{_fin(settings.JOURNAL_DEPLOIEMENT, 60)}\n")
    response = HttpResponse(texte, content_type="text/plain; charset=utf-8")
    response["Cache-Control"] = "no-store"
    return response


@require_GET
@admin_requis(api=True)
def api_etat(request):
    return JsonResponse({"ok": True})


@require_POST
@admin_requis(api=True)
def api_sauver(request):
    if len(request.body) > 8_000_000:
        return JsonResponse({"erreur": "Données trop volumineuses."}, status=413)
    try:
        data = json.loads(request.body)
        cats, prods = data["categories"], data["products"]
        if not isinstance(cats, list) or not isinstance(prods, list):
            raise KeyError
    except (ValueError, KeyError, TypeError):
        return JsonResponse({"erreur": "Données incomplètes."}, status=400)
    # Pages et réglages (onglets « Pages » et « Réglages ») : envoyés avec le catalogue.
    contenu = {k: data[k] for k in ("site", "filaments", "reviews", "about", "pages") if k in data}
    try:
        if contenu:
            verifier(cats, prods)                     # tout est vérifié avant la moindre écriture
            contenus.verifier(contenu, prods)
        enregistrer(cats, prods)
        if contenu:
            contenus.enregistrer(contenu, prods)
    except Invalide as e:
        return JsonResponse({"erreur": str(e)}, status=400)
    except OSError:
        return JsonResponse({"erreur": "Écriture impossible sur le serveur."}, status=500)
    return JsonResponse({"ok": True})


@require_POST
@admin_requis(api=True)
def api_photo(request):
    try:
        chemin = enregistrer_photo(request.GET.get("nom", ""), request.body, request.GET.get("dossier") or "produits")
    except Invalide as e:
        return JsonResponse({"erreur": str(e)}, status=400)
    except OSError:
        return JsonResponse({"erreur": "Écriture impossible sur le serveur."}, status=500)
    return JsonResponse({"ok": True, "chemin": chemin})


# ---------- Tableau « Suivi commande » (tickets personnels, enregistrés automatiquement) ----------
ETAPES_SUIVI = {"commande", "impression", "livrer", "livree"}
COULEURS_ETIQUETTES = {"vert", "jaune", "orange", "rouge", "rose", "violet", "bleu", "cyan", "gris"}


def _tickets_valides(tickets) -> bool:
    if not isinstance(tickets, list) or len(tickets) > 5000:
        return False
    vus = set()
    for t in tickets:
        if not isinstance(t, dict) or not isinstance(t.get("id"), str) or not t["id"] or t["id"] in vus:
            return False
        if t.get("status") not in ETAPES_SUIVI or not isinstance(t.get("items"), list):
            return False
        etiquettes = t.get("labels", [])
        if not isinstance(etiquettes, list) or not all(isinstance(e, str) for e in etiquettes):
            return False
        vus.add(t["id"])
    return True


def _etiquettes_valides(etiquettes) -> bool:
    if not isinstance(etiquettes, list) or len(etiquettes) > 200:
        return False
    vus = set()
    for e in etiquettes:
        if not isinstance(e, dict) or not isinstance(e.get("id"), str) or not e["id"] or e["id"] in vus:
            return False
        if not isinstance(e.get("name"), str) or len(e["name"]) > 40 or e.get("color") not in COULEURS_ETIQUETTES:
            return False
        vus.add(e["id"])
    return True


ACHAT_EN_LIGNE = {"id": "achat-en-ligne", "name": "Achat en ligne", "color": "rose"}


def _ticket_de_commande(cde: Commande, etiquette: str, cat) -> dict:
    """Ticket du tableau pour une commande payée sur le site : objets (avec couleur et taille
    retrouvées dans le catalogue pour la photo et les menus), client, livraison, payée."""
    produits = (cat or {}).get("produits", {})
    couleurs = {nom: cle for cle, nom in (cat or {}).get("couleurs", {}).items()}   # « Rouge » → « rouge »
    articles = []
    for ligne in cde.lignes or []:
        p = produits.get(ligne.get("id"))
        morceaux = [x for x in str(ligne.get("options") or "").split(" · ") if x]   # « Rouge · Ø 8 cm »
        couleur = taille = None
        if p and p.get("colors") and morceaux and couleurs.get(morceaux[0]) in p["colors"]:
            couleur = couleurs[morceaux.pop(0)]
        if p and morceaux and morceaux[-1] in [t.get("label") for t in p.get("sizes") or []]:
            taille = morceaux.pop()
        article = {"product": p["id"] if p else None, "name": str(ligne.get("nom") or "Objet"), "color": couleur, "size": taille,
                   "qty": int(ligne.get("quantite") or 1), "price": round((ligne.get("unitaire") or 0) / 100, 2)}
        if morceaux:
            article["options"] = " · ".join(morceaux)
        articles.append(article)
    livraison = cde.livraison or {}
    adresse = [cde.adresse, f"{cde.code_postal} {cde.ville}".strip()] + ([f"Point de retrait : {cde.point_retrait}"] if cde.point_retrait else [])
    jour = timezone.localdate(cde.payee_le or cde.creee_le).isoformat()
    return {"id": f"site-{cde.ref}", "ref": cde.ref, "status": "commande", "date": jour, "moved": jour,
            "client": cde.nom, "email": cde.email, "adresse": "\n".join(x for x in adresse if x), "items": articles,
            "shipping": str(livraison.get("label") or ""), "shippingFee": round((livraison.get("prix") or 0) / 100, 2),
            "payment": "Carte bancaire sur le site", "paid": True, "tracking": cde.numero_suivi or "", "note": cde.note or "",
            "labels": [etiquette], "source": "site"}


def _importer_commandes_du_site() -> int:
    """Commandes payées sur le site pas encore dans le tableau : un ticket chacune dans « Commande »,
    avec l'étiquette « Achat en ligne » (rose, recréée si elle a été supprimée). Une seule fois par commande."""
    with transaction.atomic():
        nouvelles = list(Commande.objects.select_for_update()
                         .filter(statut=Commande.PAYEE, dans_suivi=False).order_by("payee_le", "creee_le"))
        if not nouvelles:
            return 0
        suivi, _ = Suivi.objects.select_for_update().get_or_create(pk=1)
        etiquettes, tickets = list(suivi.etiquettes or []), list(suivi.tickets or [])
        etiquette = (next((e for e in etiquettes if e.get("id") == ACHAT_EN_LIGNE["id"]), None)
                     or next((e for e in etiquettes if str(e.get("name", "")).strip().lower() == "achat en ligne"), None))
        if not etiquette:
            etiquette = dict(ACHAT_EN_LIGNE)
            etiquettes.append(etiquette)
        try:
            cat = boutique.catalogue()
        except boutique.CatalogueIndisponible:
            cat = None   # le ticket est quand même créé, sans photo ni menus de couleur et de taille
        for cde in nouvelles:
            existant = next((t for t in tickets if t.get("ref") == cde.ref), None)   # ticket déjà créé à la main
            if existant is None:
                tickets.append(_ticket_de_commande(cde, etiquette["id"], cat))
            elif etiquette["id"] not in existant.setdefault("labels", []):
                existant["labels"].append(etiquette["id"])
        suivi.tickets, suivi.etiquettes, suivi.version = tickets, etiquettes, suivi.version + 1
        suivi.save()
        Commande.objects.filter(pk__in=[c.pk for c in nouvelles]).update(dans_suivi=True)
        return len(nouvelles)


@require_http_methods(["GET", "POST"])
@admin_requis(api=True)
def api_suivi(request):
    if request.method == "GET":
        ajoutees = _importer_commandes_du_site()   # à l'ouverture du tableau
        suivi = Suivi.objects.first()
        reponse = {"tickets": suivi.tickets if suivi else [], "etiquettes": suivi.etiquettes if suivi else [],
                   "version": suivi.version if suivi else 0}
        if ajoutees:
            reponse["ajoutees"] = ajoutees
        return JsonResponse(reponse)
    if len(request.body) > 4_000_000:
        return JsonResponse({"erreur": "Tableau trop volumineux."}, status=413)
    try:
        data = json.loads(request.body)
        tickets, version = data["tickets"], int(data["version"])
        etiquettes = data.get("etiquettes")           # absent (ancienne page encore ouverte) : on garde celles enregistrées
    except (ValueError, KeyError, TypeError, AttributeError):
        return JsonResponse({"erreur": "Données incomplètes."}, status=400)
    if not _tickets_valides(tickets) or (etiquettes is not None and not _etiquettes_valides(etiquettes)):
        return JsonResponse({"erreur": "Tableau invalide."}, status=400)
    with transaction.atomic():
        suivi, _ = Suivi.objects.select_for_update().get_or_create(pk=1)
        if version != suivi.version:
            return JsonResponse({"erreur": "Le tableau a été modifié dans un autre onglet ou sur un autre appareil. Rechargez la page pour retrouver la dernière version.",
                                 "version": suivi.version}, status=409)
        suivi.tickets, suivi.version = tickets, suivi.version + 1
        if etiquettes is not None:
            suivi.etiquettes = etiquettes
        suivi.save()
    return JsonResponse({"ok": True, "version": suivi.version})


@require_POST
def api_deconnexion(request):
    logout(request)
    return JsonResponse({"ok": True})


def csrf_refuse(request, reason=""):
    if request.path.startswith(reverse("panneau") + "api/"):
        return JsonResponse({"erreur": "Requête refusée (jeton de sécurité invalide). Rechargez la page."}, status=403)
    return render(request, "gestion/connexion.html", {"erreur": "Session expirée, réessayez."}, status=403)
