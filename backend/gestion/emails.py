"""E-mails envoyés quand une commande est payée : un pour le vendeur, un pour le client.

Les modèles se modifient dans l'administration (/admin/emails/) et sont alors
enregistrés en base (ModeleEmail). Sans modification, ce sont les modèles par
défaut du dossier modeles_emails/ qui servent.

Syntaxe des modèles Django en texte simple : {{ variable }}, {% if … %}, {% for … %}.
"""
import logging
from pathlib import Path

from django.conf import settings
from django.core.mail import EmailMessage
from django.template import Context, Engine, TemplateSyntaxError

from .boutique import infos_site
from .models import Commande, ModeleEmail

log = logging.getLogger(__name__)

MODELES = {
    "client": "Confirmation envoyée au client",
    "vendeur": "Nouvelle commande, envoyée à vous",
}
VARIABLES = [
    ("ref", "Référence de la commande (BL-…)"),
    ("nom", "Prénom et nom du client"),
    ("email", "Adresse e-mail du client"),
    ("adresse", "Adresse de livraison (rue)"),
    ("code_postal", "Code postal"),
    ("ville", "Ville"),
    ("note", "Précision laissée par le client (souvent vide : à utiliser dans {% if note %} … {% endif %})"),
    ("lignes", "Les articles, à parcourir avec {% for l in lignes %} … {% endfor %}"),
    ("l.quantite", "Dans la boucle : quantité"),
    ("l.nom", "Dans la boucle : nom de l'objet"),
    ("l.options", "Dans la boucle : couleur et taille (peut être vide)"),
    ("l.unitaire", "Dans la boucle : prix unitaire (ex. 8,90 €)"),
    ("l.total", "Dans la boucle : prix × quantité"),
    ("sous_total", "Total des articles"),
    ("livraison.label", "Mode de livraison (ex. Point relais)"),
    ("livraison.delai", "Délai de livraison (ex. 3 à 5 jours ouvrés)"),
    ("livraison.prix", "Frais de port (ex. 4,90 €) ou « offerte »"),
    ("total", "Total payé"),
    ("boutique", "Nom de la boutique (data.js)"),
    ("site_url", "Adresse du site (data.js)"),
]
MAX_OBJET, MAX_CORPS = 300, 20_000

_DEFAUTS = Path(__file__).resolve().parent / "modeles_emails"
# Texte simple : pas d'échappement HTML (« O'Brien & fils » reste tel quel), et aucun accès aux fichiers.
_MOTEUR = Engine(autoescape=False)


class ModeleInvalide(ValueError):
    """Le modèle ne peut pas être utilisé : le message est montré dans l'administration."""


def euros(centimes: int) -> str:
    return f"{centimes / 100:.2f} €".replace(".", ",")


# ---------- Sources des modèles ----------
def defaut(nom: str) -> tuple[str, str]:
    """(objet, message) par défaut, livrés avec le site."""
    return ((_DEFAUTS / f"{nom}_objet.txt").read_text("utf-8").strip(),
            (_DEFAUTS / f"{nom}.txt").read_text("utf-8"))


def source(nom: str) -> tuple[str, str, bool]:
    """(objet, message, personnalisé ?) : le modèle de l'administration s'il existe, sinon celui par défaut."""
    m = ModeleEmail.objects.filter(nom=nom).first()
    if m:
        return m.objet, m.corps, True
    return (*defaut(nom), False)


# ---------- Rendu ----------
def rendre(objet: str, corps: str, contexte: dict) -> tuple[str, str]:
    c = Context(contexte, autoescape=False)
    return (" ".join(_MOTEUR.from_string(objet).render(c).split()),   # l'objet tient sur une ligne
            _MOTEUR.from_string(corps).render(c).strip() + "\n")


def verifier(objet: str, corps: str) -> tuple[str, str]:
    """Contrôle un modèle avant de l'enregistrer et renvoie l'aperçu de la commande d'exemple."""
    if not objet.strip():
        raise ModeleInvalide("L'objet de l'e-mail est vide.")
    if not corps.strip():
        raise ModeleInvalide("Le message est vide.")
    if len(objet) > MAX_OBJET or len(corps) > MAX_CORPS:
        raise ModeleInvalide("Le modèle est trop long.")
    try:
        apercu = rendre(objet, corps, contexte(exemple()))
    except TemplateSyntaxError as e:
        raise ModeleInvalide(f"Erreur dans le modèle : {e}") from None
    except Exception as e:   # filtre mal utilisé, etc.
        raise ModeleInvalide(f"Le modèle ne peut pas être affiché : {e}") from None
    if not apercu[0]:
        raise ModeleInvalide("L'objet de l'e-mail est vide une fois les variables remplacées.")
    return apercu


def contexte(cde: Commande) -> dict:
    """Variables des modèles, montants déjà mis en forme."""
    site = infos_site()
    liv = cde.livraison
    return {
        "ref": cde.ref, "nom": cde.nom, "email": cde.email, "note": cde.note,
        "adresse": cde.adresse, "code_postal": cde.code_postal, "ville": cde.ville,
        "lignes": [{"quantite": l["quantite"], "nom": l["nom"], "options": l["options"],
                    "unitaire": euros(l["unitaire"]), "total": euros(l["unitaire"] * l["quantite"])} for l in cde.lignes],
        "sous_total": euros(cde.sous_total), "total": euros(cde.total),
        "livraison": {"label": liv["label"], "delai": liv.get("delai", ""),
                      "prix": euros(liv["prix"]) if liv["prix"] else "offerte"},
        "boutique": site["nom"], "site_url": site["url"],
    }


def exemple() -> Commande:
    """Commande fictive pour les aperçus (jamais enregistrée)."""
    return Commande(
        ref="BL-EXEMPLE1", nom="Ada Lovelace", email="client@example.com", note="Pour un anniversaire",
        adresse="1 rue des Lilas", code_postal="75011", ville="Paris",
        lignes=[{"nom": "Dragon articulé", "options": "Arc-en-ciel · 45 cm", "unitaire": 2790, "quantite": 1},
                {"nom": "Renne articulé", "options": "Or soie", "unitaire": 1250, "quantite": 2}],
        livraison={"label": "Point relais", "delai": "3 à 5 jours ouvrés", "prix": 0},
        sous_total=5290, total=5290,
    )


# ---------- Envoi ----------
def _envoyer(nom: str, ctx: dict, destinataire: str, repondre_a: str) -> None:
    try:
        objet, corps = rendre(*source(nom)[:2], ctx)
        EmailMessage(objet, corps, settings.COMMANDES_EXPEDITEUR, [destinataire], reply_to=[repondre_a]).send()
        log.info("Commande %s : e-mail envoyé au %s", ctx["ref"], nom)
    except Exception:   # modèle cassé ou envoi en échec : le webhook ne doit jamais échouer, la commande reste enregistrée
        log.exception("Commande %s : e-mail au %s non envoyé", ctx["ref"], nom)


def envoyer_commande_payee(cde: Commande) -> None:
    ctx = contexte(cde)
    _envoyer("vendeur", ctx, settings.COMMANDES_DESTINATAIRE, cde.email)
    _envoyer("client", ctx, cde.email, settings.COMMANDES_DESTINATAIRE)
