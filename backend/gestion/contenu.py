"""Vérification et écriture des contenus en ligne (assets/js/contenu.js) :
réglages du site, page À propos, pages légales, couleurs de filament et avis.

Même principe que catalogue.js : le déploiement GitHub n'écrase jamais ce fichier,
et tant qu'il vaut null le site utilise les contenus de data.js."""
import json
import re
import shutil
from datetime import datetime

from django.conf import settings

from .catalogue import ID, SAUVEGARDES, Invalide, _ecrire

PAGES_LEGALES = ("mentions-legales", "cgv", "confidentialite", "retractation")
IMAGE = re.compile(r"^assets/img/(?:(?:atelier|produits)/)?[a-z0-9][a-z0-9._-]*\.(webp|png|jpe?g|svg)$")
HEX = re.compile(r"^#[0-9a-fA-F]{6}$")
TEINTE = re.compile(r"^[#a-zA-Z0-9(),.%\s-]{1,200}$")   # couleur ou dégradé CSS, sans « ; » ni guillemet
CLE_COULEUR = re.compile(r"^[a-z0-9]+$")
URL = re.compile(r"^https?://[^\s\"'<>]+$")
LIEN_PAGE = re.compile(r"^[a-z0-9-]+\.html(\?[\w=&%.-]*)?(#[\w-]*)?$", re.I)   # page du site, ex. produit.html?id=dragon
TEXTE_MAX = 20_000


def _forme(v, chemin="contenu", profondeur=0) -> None:
    """Uniquement des textes, nombres, booléens, listes et objets, de taille raisonnable."""
    if profondeur > 8:
        raise Invalide("Contenus trop imbriqués.")
    if isinstance(v, str):
        if len(v) > TEXTE_MAX:
            raise Invalide(f"Texte trop long ({chemin}).")
    elif isinstance(v, bool) or v is None:
        pass
    elif isinstance(v, (int, float)):
        if v != v or v in (float("inf"), float("-inf")):
            raise Invalide(f"Nombre invalide ({chemin}).")
    elif isinstance(v, list):
        if len(v) > 300:
            raise Invalide(f"Liste trop longue ({chemin}).")
        for i, x in enumerate(v):
            _forme(x, f"{chemin}[{i}]", profondeur + 1)
    elif isinstance(v, dict):
        if len(v) > 100:
            raise Invalide(f"Trop de champs ({chemin}).")
        for k, x in v.items():
            if not isinstance(k, str) or len(k) > 60:
                raise Invalide(f"Champ invalide ({chemin}).")
            _forme(x, f"{chemin}.{k}", profondeur + 1)
    else:
        raise Invalide(f"Valeur invalide ({chemin}).")


def _texte(v, quoi: str, vide=True) -> str:
    if not isinstance(v, str) or (not vide and not v.strip()):
        raise Invalide(f"{quoi} manquant.")
    return v


def _nombre(v, quoi: str) -> float:
    if isinstance(v, bool) or not isinstance(v, (int, float)) or v < 0:
        raise Invalide(f"{quoi} invalide.")
    return v


def _image(v, quoi: str) -> None:
    if v not in ("", None) and not (isinstance(v, str) and IMAGE.match(v)):
        raise Invalide(f"Chemin d'image non autorisé ({quoi}).")


def _liste(v, quoi: str, minimum=0) -> list:
    if not isinstance(v, list) or not all(isinstance(x, dict) for x in v):
        raise Invalide(f"{quoi} incomplet.")
    if len(v) < minimum:
        raise Invalide(f"Il faut au moins un élément dans « {quoi} ».")
    return v


def _ids(liste: list, quoi: str) -> None:
    vus = set()
    for x in liste:
        i = x.get("id")
        if not isinstance(i, str) or not ID.match(i):
            raise Invalide(f"Identifiant invalide dans « {quoi} » : « {i} » (minuscules, chiffres et tirets).")
        if i in vus:
            raise Invalide(f"Deux éléments de « {quoi} » portent l'identifiant « {i} ».")
        vus.add(i)


def verifier(contenu: dict, produits: list) -> None:
    """Mêmes règles que la page d'administration et l'outil local, plus les contrôles de sécurité
    (chemins d'images, adresses, couleurs) : ces valeurs sont réutilisées dans le HTML du site."""
    if not isinstance(contenu, dict):
        raise Invalide("Contenus incomplets.")
    _forme(contenu)
    site, about, pages = contenu.get("site"), contenu.get("about"), contenu.get("pages")
    filaments, avis = contenu.get("filaments"), contenu.get("reviews")

    # Réglages
    if not isinstance(site, dict):
        raise Invalide("Réglages incomplets.")
    _texte(site.get("name"), "Nom de la boutique", vide=False)
    for k in ("slogan", "logo", "formEndpoint"):
        _texte(site.get(k, ""), k)
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", _texte(site.get("email"), "E-mail")):
        raise Invalide("L'e-mail de contact n'est pas valide.")
    if not URL.match(_texte(site.get("url"), "Adresse du site")):
        raise Invalide("L'adresse du site doit commencer par https://")
    if site.get("formEndpoint") and not (URL.match(site["formEndpoint"]) or re.match(r"^/[\w/-]*$", site["formEndpoint"])):
        raise Invalide("L'adresse d'envoi du formulaire doit commencer par https:// ou par / (ex. /admin/contact/).")
    _image(site.get("logo"), "logo")
    if not isinstance(site.get("demo"), bool):
        raise Invalide("Réglages incomplets (mode démonstration).")
    legal = site.get("legal")
    if not isinstance(legal, dict) or not all(isinstance(v, str) for v in legal.values()):
        raise Invalide("Informations légales incomplètes.")
    hero = site.get("hero")
    if not isinstance(hero, dict) or not all(isinstance(v, str) for v in hero.values()):
        raise Invalide("Bandeau de l'accueil incomplet.")
    for s in _liste(site.get("stats"), "Chiffres de l'accueil"):
        _nombre(s.get("value"), "Chiffre de l'accueil")
    if not isinstance(site.get("marquee"), list) or not all(isinstance(m, str) for m in site["marquee"]):
        raise Invalide("Bandeau défilant incomplet.")
    accueil = site.get("home", {})   # textes et photos des sections de l'accueil (facultatif)
    if not isinstance(accueil, dict):
        raise Invalide("Page d'accueil incomplète.")
    _image(accueil.get("heroPhoto"), "photo du bandeau de l'accueil")
    for k, v in accueil.items():
        if isinstance(v, dict):
            for cle, x in v.items():
                if cle == "gallery":
                    continue   # vérifiée plus bas
                if not (isinstance(x, str) or (isinstance(x, list) and all(isinstance(t, str) for t in x))):
                    raise Invalide("Page d'accueil incomplète.")
        elif not isinstance(v, str):
            raise Invalide("Page d'accueil incomplète.")
    if isinstance(accueil.get("atelier"), dict):
        _image(accueil["atelier"].get("photo"), "photo de l'atelier, à l'accueil")
    # Photos de la galerie « Tout juste sortis du plateau » (vide : les dernières créations)
    galerie = accueil.get("latest", {}).get("gallery", []) if isinstance(accueil.get("latest"), dict) else []
    if not isinstance(galerie, list) or len(galerie) > 60:
        raise Invalide("Galerie de l'accueil invalide (60 photos au maximum).")
    for g in galerie:
        if not isinstance(g, dict) or not all(isinstance(x, str) for x in g.values()):
            raise Invalide("Une photo de la galerie de l'accueil est incomplète.")
        if not g.get("src"):
            raise Invalide("Une photo de la galerie de l'accueil n'a pas d'image.")
        _image(g["src"], "photo de la galerie de l'accueil")
        if g.get("link") and not (URL.match(g["link"]) or LIEN_PAGE.match(g["link"])):
            raise Invalide(f"Lien invalide pour « {g.get('title') or 'une photo de la galerie'} » : une page du site (ex. produit.html?id=dragon) ou une adresse en https://")

    livraison = site.get("shipping")
    if not isinstance(livraison, dict):
        raise Invalide("Livraison incomplète.")
    _nombre(livraison.get("freeFrom"), "Seuil de livraison offerte")
    modes = _liste(livraison.get("methods"), "Modes de livraison", minimum=1)
    _ids(modes, "Modes de livraison")
    for m in modes:
        _texte(m.get("label"), "Nom du mode de livraison", vide=False)
        _nombre(m.get("price"), f"Prix de « {m['label']} »")
        if m.get("carrier", "autre") not in ("colissimo", "mondialrelay", "autre"):
            raise Invalide(f"Transporteur inconnu pour « {m['label']} ».")
        if not isinstance(m.get("point", False), bool):
            raise Invalide(f"Réglage du point de retrait invalide pour « {m['label']} ».")
        for k, quoi in (("finder", "page de recherche des points"), ("tracking", "adresse de suivi")):
            if m.get(k) and not URL.match(_texte(m[k], quoi)):
                raise Invalide(f"La {quoi} de « {m['label']} » doit commencer par https://")

    paiement = site.get("payment")
    if not isinstance(paiement, dict):
        raise Invalide("Paiement incomplet.")
    moyens = _liste(paiement.get("methods"), "Moyens de paiement", minimum=1)
    _ids(moyens, "Moyens de paiement")

    boutiques = _liste(site.get("stores"), "Boutiques externes")
    _ids(boutiques, "Boutiques externes")
    for b in boutiques:
        _texte(b.get("name"), "Nom de la boutique externe", vide=False)
        if not URL.match(_texte(b.get("url"), "Adresse de la boutique externe")):
            raise Invalide(f"L'adresse de « {b['name']} » doit commencer par https://")
        if not HEX.match(_texte(b.get("color"), "Couleur")):
            raise Invalide(f"Couleur invalide pour « {b['name']} » (format #RRVVBB).")
        _image(b.get("logo"), b["name"])

    # Couleurs de filament
    if not isinstance(filaments, dict) or not filaments:
        raise Invalide("Il faut au moins une couleur de filament.")
    for k, f in filaments.items():
        if not CLE_COULEUR.match(k) or not isinstance(f, dict):
            raise Invalide(f"Couleur de filament invalide : « {k} ».")
        _texte(f.get("name"), "Nom de couleur", vide=False)
        if not TEINTE.match(_texte(f.get("hex"), "Teinte")):
            raise Invalide(f"Teinte invalide pour « {f['name']} ».")
    for p in produits:
        for c in p.get("colors") or []:
            if c not in filaments:
                raise Invalide(f"L'objet « {p.get('name')} » utilise la couleur « {c} », qui n'existe plus.")

    # Avis
    for r in _liste(avis, "Avis clients"):
        _texte(r.get("name"), "Nom du client", vide=False)
        if r.get("stars") not in (1, 2, 3, 4, 5):
            raise Invalide("La note d'un avis doit aller de 1 à 5.")

    # Page À propos
    if not isinstance(about, dict):
        raise Invalide("Page « À propos » incomplète.")
    _texte(about.get("title"), "Titre de la page À propos", vide=False)
    if not isinstance(about.get("story"), list) or not all(isinstance(t, str) for t in about["story"]):
        raise Invalide("Histoire de la page À propos incomplète.")
    for ph in _liste(about.get("photos"), "Photos de l'atelier", minimum=1):
        _image(ph.get("src"), "photo de l'atelier")
    _liste(about.get("process"), "Étapes du process")

    # Pages légales
    if not isinstance(pages, dict) or set(pages) != set(PAGES_LEGALES):
        raise Invalide("Pages légales incomplètes.")
    for k, d in pages.items():
        if not isinstance(d, dict):
            raise Invalide(f"La page « {k} » est incomplète.")
        _texte(d.get("title"), f"Titre de la page « {k} »", vide=False)
        for s in _liste(d.get("sections"), f"Sections de « {k} »"):
            _texte(s.get("title", ""), "Intertitre")
            _texte(s.get("text", ""), "Texte")


def enregistrer(contenu: dict, produits: list) -> None:
    verifier(contenu, produits)
    cible = settings.SITE_ROOT / "assets" / "js" / "contenu.js"

    if cible.exists():   # on garde les 30 dernières versions
        dossier = settings.BASE_DIR / "sauvegardes"
        dossier.mkdir(mode=0o700, exist_ok=True)
        shutil.copy2(cible, dossier / f"contenu-{datetime.now():%Y%m%d-%H%M%S}.js")
        for vieux in sorted(dossier.glob("contenu-*.js"))[:-SAUVEGARDES]:
            vieux.unlink()

    garde = {k: contenu[k] for k in ("site", "filaments", "reviews", "about", "pages")}
    data = json.dumps(garde, ensure_ascii=False, indent=2)
    data = data.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")   # jamais de </script>
    _ecrire(cible, (
        "/* Contenus en ligne — écrits par l'administration (/admin/). Ne pas modifier à la main. */\n"
        f"window.CONTENU = {data};\n"
    ).encode("utf-8"))
