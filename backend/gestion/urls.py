from django.urls import path

from . import views

urlpatterns = [
    path("", views.panneau, name="panneau"),
    path("connexion/", views.connexion, name="connexion"),
    path("api/etat/", views.api_etat, name="api_etat"),
    path("api/sauver/", views.api_sauver, name="api_sauver"),
    path("api/photo/", views.api_photo, name="api_photo"),
    path("api/deconnexion/", views.api_deconnexion, name="api_deconnexion"),
]
