"""Tests de l'administration :  DJANGO_SECRET_KEY=test python manage.py test"""
import json
import shutil
import tempfile
from pathlib import Path

from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import Client, TestCase, override_settings

HOTE = {"HTTP_HOST": "www.biboulab.fr", "HTTP_ORIGIN": "https://www.biboulab.fr", "secure": True}   # les navigateurs envoient Origin sur un POST
CATALOGUE = {
    "categories": [{"slug": "deco", "name": "Déco", "icon": "deco", "color": "#112233", "color2": "#445566", "fx": "glow"}],
    "products": [{"id": "vase", "name": "Vase </script>", "category": "deco", "price": 12.5, "colors": [], "sizes": [], "images": []}],
}


class AdminTests(TestCase):
    def setUp(self):
        self.site = Path(tempfile.mkdtemp())
        (self.site / "assets" / "js").mkdir(parents=True)
        (self.site / "assets" / "js" / "data.js").write_text('const SITE = { url: "https://www.biboulab.fr" };', "utf-8")
        self.override = override_settings(SITE_ROOT=self.site, SECURE_SSL_REDIRECT=False)
        self.override.enable()
        self.user = get_user_model().objects.create_user("gerant", password="Un-mot-de-passe-solide-42", is_staff=True)
        self.c = Client(enforce_csrf_checks=True)

    def tearDown(self):
        self.override.disable()
        shutil.rmtree(self.site)

    def csrf(self):
        r = self.c.get("/connexion/", **HOTE)
        return r.context["csrf_token"]

    def jeton(self):
        """Jeton CSRF injecté dans le panneau (après connexion)."""
        return self.c.get("/", **HOTE).content.decode().split('"csrf": "')[1].split('"')[0]

    def connecter(self, mdp="Un-mot-de-passe-solide-42"):
        return self.c.post("/connexion/", {"csrfmiddlewaretoken": self.csrf(), "identifiant": "gerant", "mdp": mdp}, **HOTE)

    def test_panneau_inaccessible_sans_connexion(self):
        r = self.c.get("/", **HOTE)
        self.assertRedirects(r, "/connexion/", fetch_redirect_response=False)
        r = self.c.post("/api/sauver/", data="{}", content_type="application/json", **HOTE)
        self.assertIn(r.status_code, (401, 403))

    def test_mauvais_mot_de_passe_refuse(self):
        r = self.connecter(mdp="faux")
        self.assertEqual(r.status_code, 401)
        self.assertEqual(self.c.get("/", **HOTE).status_code, 302)

    def test_connexion_complete_puis_panneau(self):
        r = self.connecter()
        self.assertRedirects(r, "/", fetch_redirect_response=False)
        r = self.c.get("/", **HOTE)
        self.assertEqual(r.status_code, 200)
        html = r.content.decode()
        self.assertIn("window.ADMIN_ONLINE", html)
        self.assertIn("nonce-", r["Content-Security-Policy"])
        self.assertTrue(r.cookies or self.c.cookies)
        cookie = self.c.cookies[settings.SESSION_COOKIE_NAME]
        self.assertTrue(cookie["secure"] and cookie["httponly"])
        self.assertEqual(cookie["samesite"], "Strict")

    def test_deconnexion(self):
        self.connecter()
        self.assertEqual(self.c.post("/api/deconnexion/", HTTP_X_CSRFTOKEN=self.jeton(), **HOTE).status_code, 200)
        self.assertEqual(self.c.get("/", **HOTE).status_code, 302)

    def test_blocage_apres_5_echecs(self):
        for _ in range(5):
            self.connecter(mdp="faux")
        r = self.connecter()   # même avec les bons identifiants
        self.assertEqual(r.status_code, 429)

    def test_enregistrement_et_csrf(self):
        self.connecter()
        jeton = self.jeton()
        corps = json.dumps(CATALOGUE)
        r = self.c.post("/api/sauver/", data=corps, content_type="application/json", **HOTE)
        self.assertEqual(r.status_code, 403)   # sans jeton CSRF
        r = self.c.post("/api/sauver/", data=corps, content_type="application/json", HTTP_X_CSRFTOKEN=jeton, **HOTE)
        self.assertEqual(r.status_code, 200, r.content)
        js = (self.site / "assets" / "js" / "catalogue.js").read_text("utf-8")
        self.assertIn("window.CATALOGUE", js)
        self.assertNotIn("</script>", js)
        self.assertIn("produit.html?id=vase", (self.site / "sitemap.xml").read_text("utf-8"))

    def test_catalogue_invalide_et_photo_piegee(self):
        self.connecter()
        jeton = self.jeton()
        mauvais = json.loads(json.dumps(CATALOGUE))
        mauvais["products"][0]["images"] = ["../../admin/x.php"]
        r = self.c.post("/api/sauver/", data=json.dumps(mauvais), content_type="application/json", HTTP_X_CSRFTOKEN=jeton, **HOTE)
        self.assertEqual(r.status_code, 400)
        r = self.c.post("/api/photo/?nom=x.png", data=b"<?php echo 1; ?>", content_type="application/octet-stream", HTTP_X_CSRFTOKEN=jeton, **HOTE)
        self.assertEqual(r.status_code, 400)
        r = self.c.post("/api/photo/?nom=../x.png", data=b"\x89PNG\r\n\x1a\n0000", content_type="application/octet-stream", HTTP_X_CSRFTOKEN=jeton, **HOTE)
        self.assertEqual(r.status_code, 400)
        r = self.c.post("/api/photo/?nom=vase-1.png", data=b"\x89PNG\r\n\x1a\n0000", content_type="application/octet-stream", HTTP_X_CSRFTOKEN=jeton, **HOTE)
        self.assertEqual(r.status_code, 200)
        self.assertTrue((self.site / "assets" / "img" / "produits" / "vase-1.png").exists())
