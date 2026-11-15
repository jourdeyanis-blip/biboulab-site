from django.conf import settings
from django.urls import include, path, re_path
from django.views.static import serve

urlpatterns = [path("", include("gestion.urls"))]

if settings.DEBUG:
    # En local seulement : sert les fichiers du site (en ligne, c'est Apache qui s'en charge).
    urlpatterns += [re_path(r"^assets/(?P<path>.*)$", serve, {"document_root": settings.SITE_ROOT / "assets"})]
