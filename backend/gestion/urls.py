from django.urls import path

from . import paiement, views

urlpatterns = [
    path("", views.panneau, name="panneau"),
    path("connexion/", views.connexion, name="connexion"),
    path("api/etat/", views.api_etat, name="api_etat"),
    path("api/sauver/", views.api_sauver, name="api_sauver"),
    path("api/photo/", views.api_photo, name="api_photo"),
    path("api/deconnexion/", views.api_deconnexion, name="api_deconnexion"),
    # Paiement Stripe, appelé par la boutique publique (www.biboulab.fr/admin/paiement/…)
    path("paiement/session/", paiement.creer_session, name="paiement_session"),
    path("paiement/etat/", paiement.etat_session, name="paiement_etat"),
    path("paiement/webhook/", paiement.webhook, name="paiement_webhook"),
]
