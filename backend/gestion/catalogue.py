"""Vérification et écriture du catalogue en ligne (assets/js/catalogue.js) et du sitemap."""
import json
import os
import re
import secrets
import shutil
from datetime import date, datetime
from html import escape
from pathlib import Path

from django.conf import settings

ID = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
IMAGE = re.compile(r"^assets/img/produits/[a-z0-9][a-z0-9._-]*\.(webp|png|jpe?g)$")
NOM_PHOTO = re.compile(r"^[a-z0-9][a-z0-9-]*\.(webp|png|jpe?g)$")
SAUVEGARDES = 30


class Invalide(ValueError):
    """Le catalogue envoyé ne respecte pas les règles : le message est montré tel quel."""


def _id_ok(v) -> bool:
    return isinstance(v, str) and bool(ID.match(v))


def verifier(cats: list, prods: list) -> None:
    """Mêmes règles que l'outil local (outils/serveur-local.js), plus le contrôle des chemins de photos."""
    if not cats:
        raise Invalide("Il faut au moins une catégorie.")
    if len(cats) > 500 or len(prods) > 5000:
        raise Invalide("Catalogue trop volumineux.")
    slugs = set()
    for c in cats:
        if not isinstance(c, dict) or not _id_ok(c.get("slug")):
            raise Invalide(f"Identifiant de catégorie invalide : « {c.get('slug', '') if isinstance(c, dict) else ''} » (minuscules, chiffres et tirets).")
        if c["slug"] in slugs:
            raise Invalide(f"Deux catégories portent l'identifiant « {c['slug']} ».")
        if not str(c.get("name") or "").strip():
            raise Invalide(f"La catégorie « {c['slug']} » n'a pas de nom.")
        if c.get("image") not in (None, "") and not (isinstance(c["image"], str) and IMAGE.match(c["image"])):
            raise Invalide(f"Chemin de photo non autorisé pour la catégorie « {c['name']} ».")
        slugs.add(c["slug"])

    parents = {}
    for c in cats:
        p = c.get("parent")
        if p in (None, ""):
            c.pop("parent", None)
            continue
        if p not in slugs:
            raise Invalide(f"La catégorie « {c['name']} » est rangée dans une catégorie qui n'existe pas.")
        parents[c["slug"]] = p
    for slug, p in parents.items():   # pas de boucle dans les sous-catégories
        vus = {slug}
        while p is not None:
            if p in vus:
                raise Invalide("Une catégorie est rangée dans l'une de ses propres sous-catégories.")
            vus.add(p)
            p = parents.get(p)

    ids = set()
    for p in prods:
        if not isinstance(p, dict) or not _id_ok(p.get("id")):
            raise Invalide(f"Identifiant d'objet invalide : « {p.get('id', '') if isinstance(p, dict) else ''} » (minuscules, chiffres et tirets).")
        nom = str(p.get("name") or "").strip()
        if p["id"] in ids:
            raise Invalide(f"Deux objets portent l'identifiant « {p['id']} ».")
        if not nom:
            raise Invalide(f"L'objet « {p['id']} » n'a pas de nom.")
        if p.get("category") not in slugs:
            raise Invalide(f"L'objet « {nom} » est rangé dans une catégorie qui n'existe pas.")
        prix = p.get("price")
        if isinstance(prix, bool) or not isinstance(prix, (int, float)) or prix < 0 or prix != prix:
            raise Invalide(f"Le prix de « {nom} » n'est pas valide.")
        if not all(isinstance(p.get(k), list) for k in ("colors", "sizes", "images")):
            raise Invalide(f"L'objet « {nom} » est incomplet.")
        if not all(isinstance(i, str) and IMAGE.match(i) for i in p["images"]):
            raise Invalide(f"Chemin de photo non autorisé dans « {nom} ».")
        if not isinstance(p.get("nonCommercial", False), bool):
            raise Invalide(f"Réglage « licence non commerciale » invalide pour « {nom} ».")
        ids.add(p["id"])


def _ecrire(chemin: Path, contenu: bytes) -> None:
    """Écriture atomique : fichier temporaire puis renommage."""
    chemin.parent.mkdir(parents=True, exist_ok=True)
    tmp = chemin.with_name(f".{chemin.name}.{secrets.token_hex(4)}.tmp")
    try:
        tmp.write_bytes(contenu)
        os.chmod(tmp, 0o644)
        os.replace(tmp, chemin)
    finally:
        tmp.unlink(missing_ok=True)


def enregistrer(cats: list, prods: list) -> None:
    verifier(cats, prods)
    cible = settings.SITE_ROOT / "assets" / "js" / "catalogue.js"

    if cible.exists():   # on garde les 30 dernières versions
        dossier = settings.BASE_DIR / "sauvegardes"
        dossier.mkdir(mode=0o700, exist_ok=True)
        shutil.copy2(cible, dossier / f"catalogue-{datetime.now():%Y%m%d-%H%M%S}.js")
        for vieux in sorted(dossier.glob("catalogue-*.js"))[:-SAUVEGARDES]:
            vieux.unlink()

    data = json.dumps({"categories": cats, "products": prods}, ensure_ascii=False, indent=2)
    data = data.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")   # jamais de </script>
    _ecrire(cible, (
        "/* Catalogue en ligne — écrit par l'administration (/admin/). Ne pas modifier à la main. */\n"
        f"window.CATALOGUE = {data};\n"
    ).encode("utf-8"))
    _sitemap(cats, prods)


def _sitemap(cats: list, prods: list) -> None:
    try:
        data_js = (settings.SITE_ROOT / "assets" / "js" / "data.js").read_text("utf-8")
    except OSError:
        return
    m = re.search(r'\burl:\s*"(https?://[^"]+)"', data_js)
    base = m.group(1) if m else None
    try:   # adresse réglée dans l'administration en ligne (contenu.js), si elle existe
        en_ligne = re.search(r'"url":\s*"(https?://[^"]+)"', (settings.SITE_ROOT / "assets" / "js" / "contenu.js").read_text("utf-8"))
        base = en_ligne.group(1) if en_ligne else base
    except OSError:
        pass
    if not base:
        return
    base = base.rstrip("/")
    jour = date.today().isoformat()
    urls = [("", "1.0"), ("boutique.html", "0.9")]
    urls += [(f"categorie.html?c={c['slug']}", "0.8") for c in cats]
    urls += [(f"produit.html?id={p['id']}", "0.7") for p in prods]
    urls += [("a-propos.html", "0.5"), ("contact.html", "0.5"), ("mentions-legales.html", "0.2"),
             ("cgv.html", "0.2"), ("confidentialite.html", "0.2"), ("retractation.html", "0.2")]
    lignes = "\n".join(f"  <url><loc>{escape(f'{base}/{u}')}</loc><lastmod>{jour}</lastmod><priority>{pr}</priority></url>" for u, pr in urls)
    _ecrire(settings.SITE_ROOT / "sitemap.xml",
            f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{lignes}\n</urlset>\n'.encode("utf-8"))


def type_image(data: bytes) -> str | None:
    """Reconnaît le format à partir du contenu réel (et pas du nom du fichier)."""
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "png"
    if data[:3] == b"\xff\xd8\xff":
        return "jpeg"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    return None


def enregistrer_photo(nom: str, data: bytes, dossier: str = "produits") -> str:
    """Photo d'objet (assets/img/produits) ou de l'atelier, logo… (assets/img/atelier)."""
    if dossier not in ("produits", "atelier"):
        raise Invalide("Dossier d'image inconnu.")
    if not NOM_PHOTO.match(nom):
        raise Invalide("Nom de photo invalide.")
    if not data or len(data) > 12_000_000:
        raise Invalide("Photo trop lourde (12 Mo maximum).")
    vrai = type_image(data)
    ext = nom.rsplit(".", 1)[1].replace("jpg", "jpeg")
    if vrai is None or vrai != ext:
        raise Invalide("Ce fichier n'est pas une image valide.")
    _ecrire(settings.SITE_ROOT / "assets" / "img" / dossier / nom, data)
    return f"assets/img/{dossier}/{nom}"
