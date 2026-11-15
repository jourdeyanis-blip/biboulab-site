"""Administration en ligne : connexion (identifiant + mot de passe) et actions du panneau."""
import json
import re
import secrets
import time
from functools import wraps

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.http import HttpResponse, JsonResponse
from django.middleware.csrf import get_token
from django.shortcuts import redirect, render
from django.urls import reverse
from django.views.decorators.debug import sensitive_post_parameters
from django.views.decorators.http import require_GET, require_http_methods, require_POST

from .catalogue import Invalide, enregistrer, enregistrer_photo
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
    if not request.path.endswith("/"):
        return redirect(request.path + "/")
    nonce = secrets.token_urlsafe(16)
    html = settings.PANNEAU_HTML.read_text("utf-8")
    html = re.sub(r"<script(?=[\s>])", f'<script nonce="{nonce}"', html)
    init = f'<script nonce="{nonce}">window.ADMIN_ONLINE={json.dumps({"csrf": get_token(request)})};</script>\n'
    html = html.replace("</head>", init + "</head>", 1)
    response = HttpResponse(html, content_type="text/html; charset=utf-8")
    response["Content-Security-Policy"] = csp(nonce)
    return response


# ---------- API du panneau (JSON) ----------
@require_GET
@admin_requis(api=True)
def api_etat(request):
    return JsonResponse({"ok": True})


@require_POST
@admin_requis(api=True)
def api_sauver(request):
    if len(request.body) > 5_000_000:
        return JsonResponse({"erreur": "Données trop volumineuses."}, status=413)
    try:
        data = json.loads(request.body)
        cats, prods = data["categories"], data["products"]
        if not isinstance(cats, list) or not isinstance(prods, list):
            raise KeyError
    except (ValueError, KeyError, TypeError):
        return JsonResponse({"erreur": "Données incomplètes."}, status=400)
    try:
        enregistrer(cats, prods)
    except Invalide as e:
        return JsonResponse({"erreur": str(e)}, status=400)
    except OSError:
        return JsonResponse({"erreur": "Écriture impossible sur le serveur."}, status=500)
    return JsonResponse({"ok": True})


@require_POST
@admin_requis(api=True)
def api_photo(request):
    try:
        chemin = enregistrer_photo(request.GET.get("nom", ""), request.body)
    except Invalide as e:
        return JsonResponse({"erreur": str(e)}, status=400)
    except OSError:
        return JsonResponse({"erreur": "Écriture impossible sur le serveur."}, status=500)
    return JsonResponse({"ok": True, "chemin": chemin})


@require_POST
def api_deconnexion(request):
    logout(request)
    return JsonResponse({"ok": True})


def csrf_refuse(request, reason=""):
    if request.path.startswith(reverse("panneau") + "api/"):
        return JsonResponse({"erreur": "Requête refusée (jeton de sécurité invalide). Rechargez la page."}, status=403)
    return render(request, "gestion/connexion.html", {"erreur": "Session expirée, réessayez."}, status=403)
