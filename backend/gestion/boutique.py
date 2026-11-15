"""Calcul d'une commande côté serveur, à partir du catalogue publié sur le site.

Le navigateur n'envoie que des identifiants (objet, couleur, taille, quantité et
mode de livraison) : les prix, les suppléments de taille et les frais de port sont
toujours relus ici, jamais repris de la requête.

Sources, dans l'ordre :
  - assets/js/catalogue.js : catalogue écrit par l'administration en ligne ;
  - assets/js/data.js      : catalogue d'origine (tant que catalogue.js vaut null),
                             couleurs de filament et modes de livraison.
"""
import json
import re
from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings

MAX_LIGNES = 50
MAX_QUANTITE = 99          # même limite que le panier du site


class CatalogueIndisponible(RuntimeError):
    """Le catalogue du site n'a pas pu être lu : on refuse de faire payer."""


class PanierInvalide(ValueError):
    """Le panier envoyé ne correspond pas au catalogue : le message est montré au client."""


# ---------- Lecture d'une valeur littérale JavaScript ----------
_JETON = re.compile(r"""
    (?P<blanc>\s+)
  | (?P<commentaire>//[^\n]*|/\*.*?\*/)
  | (?P<chaine>"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')
  | (?P<nombre>-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)
  | (?P<mot>[A-Za-z_$][\w$]*)
  | (?P<signe>[{}\[\],:])
""", re.S | re.X)
_MOTS = {"true": True, "false": False, "null": None}


def _chaine(brut: str) -> str:
    if brut[0] == "'":
        brut = '"' + brut[1:-1].replace("\\'", "'").replace('"', '\\"') + '"'
    return json.loads(brut)


class _LecteurJS:
    """Objets, tableaux, chaînes, nombres, true/false/null, commentaires et virgules finales.
    Tout le reste (fonctions, calculs, gabarits `...`) est refusé."""

    def __init__(self, src: str, pos: int):
        self.src, self.pos = src, pos

    def _jeton(self):
        while True:
            m = _JETON.match(self.src, self.pos)
            if not m:
                raise CatalogueIndisponible(f"Syntaxe non reconnue dans le catalogue (caractère {self.pos}).")
            self.pos = m.end()
            if m.lastgroup not in ("blanc", "commentaire"):
                return m.lastgroup, m.group()

    def _suivant(self) -> str:
        pos = self.pos
        _, v = self._jeton()
        self.pos = pos
        return v

    def valeur(self):
        sorte, v = self._jeton()
        if v == "{":
            return self._objet()
        if v == "[":
            return self._tableau()
        if sorte == "chaine":
            return _chaine(v)
        if sorte == "nombre":
            return Decimal(v)
        if sorte == "mot" and v in _MOTS:
            return _MOTS[v]
        raise CatalogueIndisponible(f"Valeur inattendue « {v[:30]} » dans le catalogue.")

    def _objet(self) -> dict:
        obj = {}
        while True:
            sorte, v = self._jeton()
            if v == "}":
                return obj
            if sorte not in ("mot", "chaine"):
                raise CatalogueIndisponible("Clé d'objet invalide dans le catalogue.")
            cle = _chaine(v) if sorte == "chaine" else v
            if self._jeton()[1] != ":":
                raise CatalogueIndisponible(f"« : » attendu après « {cle} » dans le catalogue.")
            obj[cle] = self.valeur()
            _, v = self._jeton()
            if v == "}":
                return obj
            if v != ",":
                raise CatalogueIndisponible(f"« , » attendue après « {cle} » dans le catalogue.")

    def _tableau(self) -> list:
        tab = []
        while True:
            if self._suivant() == "]":
                self._jeton()
                return tab
            tab.append(self.valeur())
            _, v = self._jeton()
            if v == "]":
                return tab
            if v != ",":
                raise CatalogueIndisponible("« , » attendue dans un tableau du catalogue.")


def lire_constante(src: str, nom: str):
    """Valeur de « const NOM = … » ou « window.NOM = … » dans un fichier JavaScript."""
    m = re.search(rf"(?:\bconst\s+{nom}|\bwindow\.{nom})\s*=\s*", src)
    if not m:
        raise CatalogueIndisponible(f"{nom} introuvable dans le catalogue.")
    return _LecteurJS(src, m.end()).valeur()


# ---------- Catalogue du site ----------
def _lire(nom: str) -> str:
    try:
        return (settings.SITE_ROOT / "assets" / "js" / nom).read_text("utf-8")
    except OSError as e:
        raise CatalogueIndisponible(f"Lecture de {nom} impossible.") from e


def catalogue() -> dict:
    """Produits, couleurs et livraison, tels que le site les affiche."""
    data_js = _lire("data.js")
    try:
        en_ligne = lire_constante(_lire("catalogue.js"), "CATALOGUE")
    except CatalogueIndisponible:
        en_ligne = None
    produits = en_ligne["products"] if isinstance(en_ligne, dict) and "products" in en_ligne else lire_constante(data_js, "PRODUCTS")
    site = lire_constante(data_js, "SITE")
    filaments = lire_constante(data_js, "FILAMENTS")
    try:
        livraison = site["shipping"]
        modes = {m["id"]: {"label": m["label"], "delai": m.get("delay", ""), "prix": centimes(m["price"])} for m in livraison["methods"]}
        franco = centimes(livraison["freeFrom"])
        return {
            "produits": {p["id"]: p for p in produits},
            "couleurs": {k: v["name"] for k, v in filaments.items()},
            "livraison": modes,
            "franco": franco,
        }
    except (KeyError, TypeError) as e:
        raise CatalogueIndisponible("Modes de livraison incomplets dans data.js.") from e


def infos_site() -> dict:
    """Nom et adresse de la boutique (SITE dans data.js), pour les e-mails."""
    try:
        site = lire_constante(_lire("data.js"), "SITE")
        return {"nom": str(site.get("name") or "Biboulab"), "url": str(site.get("url") or "")}
    except (CatalogueIndisponible, AttributeError):
        return {"nom": "Biboulab", "url": ""}


def centimes(montant) -> int:
    if isinstance(montant, bool) or not isinstance(montant, (int, float, Decimal)):
        raise CatalogueIndisponible("Prix invalide dans le catalogue.")
    v = (Decimal(str(montant)) * 100).quantize(Decimal(1), rounding=ROUND_HALF_UP)
    if v < 0:
        raise CatalogueIndisponible("Prix négatif dans le catalogue.")
    return int(v)


# ---------- Calcul de la commande ----------
def _texte(v, maxi: int) -> str | None:
    if v is None or v == "":
        return None
    if not isinstance(v, str) or len(v) > maxi:
        raise PanierInvalide("Panier invalide : rechargez la page.")
    return v


def calculer(panier, mode_livraison) -> dict:
    """Lignes, sous-total, frais de port et total en centimes d'euro."""
    if not isinstance(panier, list) or not panier:
        raise PanierInvalide("Votre panier est vide.")
    if len(panier) > MAX_LIGNES:
        raise PanierInvalide("Trop d'articles différents dans le panier.")
    cat = catalogue()

    lignes = []
    for article in panier:
        if not isinstance(article, dict):
            raise PanierInvalide("Panier invalide : rechargez la page.")
        p = cat["produits"].get(_texte(article.get("id"), 100))
        if not p:
            raise PanierInvalide("Un article de votre panier n'est plus en vente : retirez-le puis réessayez.")
        qte = article.get("qty")
        if isinstance(qte, bool) or not isinstance(qte, int) or not 1 <= qte <= MAX_QUANTITE:
            raise PanierInvalide(f"Quantité invalide pour « {p['name']} ».")

        couleur = _texte(article.get("color"), 50)
        couleurs = p.get("colors") or []
        if (couleur is None and couleurs) or (couleur is not None and couleur not in couleurs):
            raise PanierInvalide(f"Couleur indisponible pour « {p['name']} » : choisissez-la à nouveau sur sa fiche.")

        taille = _texte(article.get("size"), 100)
        tailles = {t["label"]: t.get("extra") or 0 for t in p.get("sizes") or []}
        if (taille is None and tailles) or (taille is not None and taille not in tailles):
            raise PanierInvalide(f"Taille indisponible pour « {p['name']} » : choisissez-la à nouveau sur sa fiche.")

        unitaire = centimes(p["price"]) + (centimes(tailles[taille]) if taille else 0)
        options = " · ".join(x for x in (cat["couleurs"].get(couleur, couleur) if couleur else None, taille) if x)
        lignes.append({"id": p["id"], "nom": p["name"], "options": options, "unitaire": unitaire, "quantite": qte})

    mode = cat["livraison"].get(mode_livraison) if isinstance(mode_livraison, str) else None
    if not mode:
        raise PanierInvalide("Choisissez un mode de livraison.")
    sous_total = sum(l["unitaire"] * l["quantite"] for l in lignes)
    frais = 0 if sous_total >= cat["franco"] else mode["prix"]
    return {
        "lignes": lignes,
        "livraison": {"id": mode_livraison, "label": mode["label"], "delai": mode["delai"], "prix": frais},
        "sous_total": sous_total,
        "total": sous_total + frais,
    }
