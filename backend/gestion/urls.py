from django.urls import path

from . import contact, paiement, views

urlpatterns = [
    path("", views.panneau, name="panneau"),
    path("connexion/", views.connexion, name="connexion"),
    path("emails/", views.modeles_emails, name="emails"),
    path("commandes/", views.commandes, name="commandes"),
    path("journal/", views.journal, name="journal"),
    path("emails/logo.png", views.logo_email, name="emails_logo"),
    path("api/etat/", views.api_etat, name="api_etat"),
    path("api/sauver/", views.api_sauver, name="api_sauver"),
    path("api/photo/", views.api_photo, name="api_photo"),
    path("api/deconnexion/", views.api_deconnexion, name="api_deconnexion"),
    path("api/suivi/", views.api_suivi, name="api_suivi"),
    path("api/suivi-photo/", views.api_suivi_photo, name="api_suivi_photo"),
    # Paiement Stripe, appelé par la boutique publique (www.biboulab.fr/admin/paiement/…)
    path("paiement/session/", paiement.creer_session, name="paiement_session"),
    path("paiement/etat/", paiement.etat_session, name="paiement_etat"),
    path("paiement/webhook/", paiement.webhook, name="paiement_webhook"),
    # Formulaire de contact du site (www.biboulab.fr/admin/contact/)
    path("contact/", contact.envoyer, name="contact"),
]
