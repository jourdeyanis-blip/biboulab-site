"""Réglages de l'administration en ligne de Biboulab.

Tout ce qui change d'un serveur à l'autre se règle par variables d'environnement
(cPanel › Setup Python App › Environment variables) :

  DJANGO_SECRET_KEY     clé secrète longue et aléatoire (obligatoire en ligne)
  DJANGO_ALLOWED_HOSTS  domaines autorisés, séparés par des virgules
  SITE_ROOT             dossier public du site (ex. /home/<compte>/public_html)
  DJANGO_DEBUG          1 uniquement sur votre ordinateur, jamais en ligne

Paiement en ligne (Stripe Checkout, voir LISEZ-MOI.md) :

  STRIPE_SECRET_KEY       clé secrète Stripe (sk_… ou clé restreinte rk_…) ; vide = paiement désactivé
  STRIPE_WEBHOOK_SECRET   secret de signature du webhook (whsec_…)
  COMMANDES_DESTINATAIRE  adresse prévenue à chaque commande payée
  CONTACT_DESTINATAIRE    adresse qui reçoit le formulaire de contact (par défaut : COMMANDES_DESTINATAIRE)
  COMMANDES_EXPEDITEUR    expéditeur de cet e-mail (adresse du domaine du site)
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent          # backend/
REPO_DIR = BASE_DIR.parent                                 # racine du dépôt

DEBUG = os.environ.get("DJANGO_DEBUG") == "1"

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "")
if not SECRET_KEY:
    if not DEBUG:
        raise RuntimeError("DJANGO_SECRET_KEY doit être défini (voir LISEZ-MOI.md).")
    SECRET_KEY = "dev-uniquement-pas-pour-la-production"

ALLOWED_HOSTS = [h.strip() for h in os.environ.get(
    "DJANGO_ALLOWED_HOSTS", "www.biboulab.fr,biboulab.fr,pprod.biboulab.fr"
).split(",") if h.strip()]
if DEBUG:
    ALLOWED_HOSTS += ["localhost", "127.0.0.1"]

# Dossier public du site, où l'administration écrit le catalogue, le sitemap et les photos.
SITE_ROOT = Path(os.environ.get("SITE_ROOT", REPO_DIR)).resolve()
# Page de gestion (la même que l'outil local).
PANNEAU_HTML = REPO_DIR / "outils" / "admin.html"

INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "axes",
    "gestion",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "gestion.securite.SecuriteMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "axes.middleware.AxesMiddleware",   # en dernier, comme le demande django-axes
]

ROOT_URLCONF = "biboulab_admin.urls"
WSGI_APPLICATION = "biboulab_admin.wsgi.application"

TEMPLATES = [{
    "BACKEND": "django.template.backends.django.DjangoTemplates",
    "DIRS": [],
    "APP_DIRS": True,
    "OPTIONS": {"context_processors": ["django.template.context_processors.request"]},
}]

DATABASES = {"default": {
    "ENGINE": "django.db.backends.sqlite3",
    "NAME": os.environ.get("DJANGO_DB", BASE_DIR / "db.sqlite3"),
}}

# ---------- Mots de passe ----------
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
]
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 12}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]
AUTHENTICATION_BACKENDS = [
    "axes.backends.AxesStandaloneBackend",          # refuse toute connexion pendant un blocage
    "django.contrib.auth.backends.ModelBackend",
]

# ---------- Blocage des essais répétés (django-axes) ----------
AXES_FAILURE_LIMIT = 5                       # 5 échecs…
AXES_COOLOFF_TIME = 0.25                     # … = 15 minutes de blocage
AXES_LOCKOUT_PARAMETERS = ["ip_address", ["username", "ip_address"]]
AXES_RESET_ON_SUCCESS = True
AXES_LOCKOUT_CALLABLE = "gestion.views.bloque"
AXES_IPWARE_META_PRECEDENCE_ORDER = ["REMOTE_ADDR"]   # ne pas croire X-Forwarded-For

# ---------- Session ----------
SESSION_COOKIE_NAME = "bbadm" if DEBUG else "__Host-bbadm"   # « __Host- » : HTTPS, sans domaine, chemin /
SESSION_COOKIE_PATH = "/"
SESSION_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Strict"
SESSION_COOKIE_AGE = 3600                    # déconnexion après 1 h sans action…
SESSION_SAVE_EVERY_REQUEST = True
SESSION_EXPIRE_AT_BROWSER_CLOSE = True
SESSION_DUREE_MAX = 8 * 3600                 # … et au plus 8 h après la connexion
CSRF_USE_SESSIONS = True                     # jeton CSRF stocké dans la session (pas de cookie en plus)
CSRF_COOKIE_SECURE = not DEBUG
CSRF_FAILURE_VIEW = "gestion.views.csrf_refuse"

# ---------- En-têtes de sécurité ----------
SECURE_SSL_REDIRECT = not DEBUG and os.environ.get("DJANGO_SSL_REDIRECT", "1") == "1"
SECURE_HSTS_SECONDS = 0 if DEBUG else 31536000
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"

# Corps de requête : JSON du catalogue (5 Mo) ou photo (12 Mo)
DATA_UPLOAD_MAX_MEMORY_SIZE = 12 * 1024 * 1024

LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "Europe/Paris"
USE_I18N = True
USE_TZ = True
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------- Paiement en ligne (Stripe) ----------
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
COMMANDES_DESTINATAIRE = os.environ.get("COMMANDES_DESTINATAIRE", "biboulab@outlook.fr")
COMMANDES_EXPEDITEUR = os.environ.get("COMMANDES_EXPEDITEUR", "no-reply@biboulab.fr")
# Boîte qui reçoit les messages du formulaire de contact (par défaut, la même que les commandes)
CONTACT_DESTINATAIRE = os.environ.get("CONTACT_DESTINATAIRE", COMMANDES_DESTINATAIRE)
# En ligne, les e-mails partent par le sendmail d'O2switch ; en local, ils s'affichent dans le terminal.
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend" if DEBUG else "gestion.courriel.SendmailBackend"
SENDMAIL = os.environ.get("SENDMAIL", "/usr/sbin/sendmail")

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "loggers": {
        "axes": {"handlers": ["console"], "level": "WARNING"},
        "gestion": {"handlers": ["console"], "level": "INFO"},
    },
}
