"""Tests de l'administration :  DJANGO_SECRET_KEY=test python manage.py test"""
import json
import shutil
import tempfile
from pathlib import Path

from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import Client, TestCase, override_settings
from django.test.utils import override_script_prefix

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

    def contenus(self):
        """Pages et réglages tels que la page d'administration les envoie (repris de data.js)."""
        from decimal import Decimal
        from gestion.boutique import lire_constante
        src = (Path(__file__).resolve().parents[2] / "assets" / "js" / "data.js").read_text("utf-8")
        brut = {k: lire_constante(src, n) for k, n in (("site", "SITE"), ("filaments", "FILAMENTS"), ("reviews", "REVIEWS"), ("about", "ABOUT"), ("pages", "PAGES"))}
        return json.loads(json.dumps(brut, default=lambda d: int(d) if isinstance(d, Decimal) and d == int(d) else float(d)))

    def test_enregistrement_des_pages_et_reglages(self):
        self.connecter()
        jeton = self.jeton()
        contenu = self.contenus()
        contenu["pages"]["cgv"]["sections"][0]["text"] = "Nouveau texte </script><b>"
        contenu["site"]["legal"]["siret"] = "123 456 789 00012"
        r = self.c.post("/api/sauver/", data=json.dumps({**CATALOGUE, **contenu}), content_type="application/json", HTTP_X_CSRFTOKEN=jeton, **HOTE)
        self.assertEqual(r.status_code, 200, r.content)
        js = (self.site / "assets" / "js" / "contenu.js").read_text("utf-8")
        self.assertTrue(js.splitlines()[1].startswith("window.CONTENU = {"))
        self.assertNotIn("</script>", js)
        self.assertIn("123 456 789 00012", js)
        relu = json.loads(js.split("window.CONTENU = ", 1)[1].rstrip().rstrip(";"))
        self.assertEqual(relu["pages"]["cgv"]["sections"][0]["text"], "Nouveau texte </script><b>")

    def test_contenus_dangereux_refuses_sans_rien_ecrire(self):
        self.connecter()
        jeton = self.jeton()
        pieges = [
            ("site", lambda c: c["site"]["stores"][0].__setitem__("color", "red;background:url(x)")),
            ("site", lambda c: c["site"]["stores"][0].__setitem__("url", "javascript:alert(1)")),
            ("site", lambda c: c["site"].__setitem__("logo", "../../backend/x.php")),
            ("about", lambda c: c["about"]["photos"][0].__setitem__("src", "https://ailleurs.example/x.png")),
            ("filaments", lambda c: c["filaments"]["rouge"].__setitem__("hex", "red\";}")),
            ("site", lambda c: c["site"]["shipping"]["methods"][0].__setitem__("price", -1)),
            ("pages", lambda c: c["pages"].pop("cgv")),
        ]
        for nom, piege in pieges:
            contenu = self.contenus()
            piege(contenu)
            r = self.c.post("/api/sauver/", data=json.dumps({**CATALOGUE, **contenu}), content_type="application/json", HTTP_X_CSRFTOKEN=jeton, **HOTE)
            self.assertEqual(r.status_code, 400, nom)
        self.assertFalse((self.site / "assets" / "js" / "contenu.js").exists())
        self.assertFalse((self.site / "assets" / "js" / "catalogue.js").exists())   # rien n'est écrit si une partie est refusée

    def test_photo_de_l_atelier(self):
        self.connecter()
        jeton = self.jeton()
        r = self.c.post("/api/photo/?dossier=atelier&nom=atelier-1.png", data=b"\x89PNG\r\n\x1a\n0000", content_type="application/octet-stream", HTTP_X_CSRFTOKEN=jeton, **HOTE)
        self.assertEqual(r.json()["chemin"], "assets/img/atelier/atelier-1.png")
        self.assertTrue((self.site / "assets" / "img" / "atelier" / "atelier-1.png").exists())
        r = self.c.post("/api/photo/?dossier=../js&nom=x.png", data=b"\x89PNG\r\n\x1a\n0000", content_type="application/octet-stream", HTTP_X_CSRFTOKEN=jeton, **HOTE)
        self.assertEqual(r.status_code, 400)

    def test_adresses_api_sous_admin(self):
        """En ligne, l'application est montée sous /admin : l'API doit pointer vers /admin/api/."""
        self.connecter()
        with override_script_prefix("/admin/"):
            html = self.c.get("/", **HOTE).content.decode()
        self.assertIn('"api": "/admin/api/"', html)


# ---------- Paiement Stripe ----------
import time as _time
from unittest import mock

import stripe
from django.core import mail

from django.core.cache import cache

from gestion import boutique
from gestion.models import Commande, ModeleEmail

DEPOT = Path(__file__).resolve().parents[2]
PANIER = [{"id": "boule-flocon", "color": "rouge", "size": "Ø 8 cm", "qty": 2, "price": 0.01},   # le prix envoyé est ignoré
          {"id": "renne-articule", "color": "or", "size": None, "qty": 1}]
CLIENT = {"prenom": "Ada", "nom": "Lovelace", "email": "ada@example.com", "adresse": "1 rue des Lilas",
          "cp": "75011", "ville": "Paris", "note": "Merci !"}
WHSEC = "whsec_test_secret"


def signe(payload: str, secret: str = WHSEC) -> str:
    t = int(_time.time())
    return f"t={t},v1={stripe.WebhookSignature._compute_signature(f'{t}.{payload}', secret)}"


@override_settings(STRIPE_SECRET_KEY="sk_test_x", STRIPE_WEBHOOK_SECRET=WHSEC, SECURE_SSL_REDIRECT=False)
class PaiementTests(TestCase):
    def setUp(self):
        self.site = Path(tempfile.mkdtemp())
        js = self.site / "assets" / "js"
        js.mkdir(parents=True)
        shutil.copy(DEPOT / "assets" / "js" / "data.js", js / "data.js")
        shutil.copy(DEPOT / "assets" / "js" / "catalogue.js", js / "catalogue.js")
        self.override = override_settings(SITE_ROOT=self.site)
        self.override.enable()
        cache.clear()   # compteur anti-abus des tentatives de paiement
        self.c = Client()
        self.stripe = mock.MagicMock()
        self.stripe.v1.checkout.sessions.create.return_value = mock.Mock(id="cs_test_123", url="https://checkout.stripe.com/c/pay/cs_test_123")
        patch = mock.patch("gestion.paiement._stripe", return_value=self.stripe)
        patch.start()
        self.addCleanup(patch.stop)

    def tearDown(self):
        self.override.disable()
        shutil.rmtree(self.site)

    def payer(self, panier=PANIER, livraison="relais", client=CLIENT, **entetes):
        corps = json.dumps({"panier": panier, "livraison": livraison, "client": client})
        return self.c.post("/paiement/session/", corps, content_type="application/json", **{**HOTE, **entetes})

    def params(self):
        return self.stripe.v1.checkout.sessions.create.call_args.args[0]

    def webhook(self, type_, **session):
        corps = json.dumps({"id": "evt_1", "object": "event", "type": type_, "data": {"object": {
            "id": "cs_test_123", "object": "checkout.session", "client_reference_id": None, **session}}})
        return self.c.post("/paiement/webhook/", corps, content_type="application/json",
                           HTTP_STRIPE_SIGNATURE=signe(corps), **HOTE)

    # --- Calcul des prix ---
    def test_data_js_du_site_est_lisible(self):
        cat = boutique.catalogue()
        self.assertGreater(len(cat["produits"]), 0)
        self.assertEqual(set(cat["livraison"]), {"lettre", "relais", "colissimo"})
        self.assertEqual(cat["franco"], 6000)

    def test_prix_recalcules_depuis_le_catalogue(self):
        r = self.payer()
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()["url"], "https://checkout.stripe.com/c/pay/cs_test_123")
        p = self.params()
        self.assertEqual([(l["price_data"]["unit_amount"], l["quantity"]) for l in p["line_items"]], [(890, 2), (1250, 1)])
        self.assertEqual(p["line_items"][0]["price_data"]["product_data"]["description"], "Rouge · Ø 8 cm")
        self.assertEqual(p["shipping_options"][0]["shipping_rate_data"]["fixed_amount"]["amount"], 490)
        self.assertEqual(p["payment_intent_data"]["shipping"]["address"]["postal_code"], "75011")
        self.assertNotIn("payment_method_types", p)   # moyens de paiement dynamiques (Dashboard)
        self.assertTrue(p["success_url"].startswith("https://www.biboulab.fr/panier.html?paiement=ok&session_id={CHECKOUT_SESSION_ID}"))
        cde = Commande.objects.get()
        self.assertEqual((cde.total, cde.statut, cde.session_stripe), (3520, Commande.CREEE, "cs_test_123"))
        self.assertEqual(self.stripe.v1.checkout.sessions.create.call_args.args[1], {"idempotency_key": f"commande-{cde.ref}"})

    def test_livraison_offerte_au_dela_du_seuil(self):
        self.payer(panier=[{"id": "lampe-lune", "color": "blanc", "size": "Ø 16 cm", "qty": 2}])
        tarif = self.params()["shipping_options"][0]["shipping_rate_data"]
        self.assertEqual(tarif["fixed_amount"]["amount"], 0)
        self.assertIn("offerte", tarif["display_name"])

    def test_catalogue_en_ligne_prioritaire(self):
        (self.site / "assets" / "js" / "catalogue.js").write_text(
            "window.CATALOGUE = " + json.dumps({"categories": [], "products": [
                {"id": "boule-flocon", "name": "Boule", "price": 3, "colors": ["rouge"], "sizes": [{"label": "Ø 8 cm", "extra": 1.5}]}]}) + ";", "utf-8")
        self.payer(panier=[PANIER[0]])
        self.assertEqual(self.params()["line_items"][0]["price_data"]["unit_amount"], 450)

    def test_livraison_reglee_en_ligne_prioritaire(self):
        """Les frais de port modifiés dans l'administration en ligne (contenu.js) font foi pour Stripe."""
        from gestion.boutique import lire_constante
        site = lire_constante((self.site / "assets" / "js" / "data.js").read_text("utf-8"), "SITE")
        site = json.loads(json.dumps(site, default=float))
        site["shipping"]["methods"] = [{"id": "retrait", "label": "Retrait à l'atelier", "price": 0, "delay": "sur rendez-vous"},
                                       {"id": "relais", "label": "Point relais", "price": 5.5, "delay": "3 jours"}]
        (self.site / "assets" / "js" / "contenu.js").write_text("window.CONTENU = " + json.dumps({"site": site}) + ";", "utf-8")
        self.assertEqual(set(boutique.catalogue()["livraison"]), {"retrait", "relais"})
        self.payer()
        self.assertEqual(self.params()["shipping_options"][0]["shipping_rate_data"]["fixed_amount"]["amount"], 550)

    def test_paniers_refuses(self):
        cas = [
            [{"id": "inconnu", "color": None, "size": None, "qty": 1}],
            [{**PANIER[0], "size": "Ø 99 cm"}],
            [{**PANIER[0], "color": "rose"}],
            [{**PANIER[0], "qty": 0}],
            [{**PANIER[0], "qty": 100}],
            [{**PANIER[0], "qty": "2"}],
            [],
        ]
        for panier in cas:
            with self.subTest(panier=panier):
                self.assertEqual(self.payer(panier=panier).status_code, 400)
        self.assertEqual(self.payer(livraison="teleportation").status_code, 400)
        self.assertEqual(self.payer(client={**CLIENT, "cp": "7501"}).status_code, 400)
        self.assertEqual(self.payer(client={**CLIENT, "email": "pas-un-email"}).status_code, 400)
        self.stripe.v1.checkout.sessions.create.assert_not_called()
        self.assertFalse(Commande.objects.exists())

    def test_autre_origine_refusee(self):
        self.assertEqual(self.payer(HTTP_ORIGIN="https://pirate.example").status_code, 403)

    def test_paiement_desactive_sans_cle(self):
        with override_settings(STRIPE_SECRET_KEY=""):
            self.assertEqual(self.payer().status_code, 503)

    def test_stripe_en_panne(self):
        self.stripe.v1.checkout.sessions.create.side_effect = stripe.APIConnectionError("panne")
        self.assertEqual(self.payer().status_code, 502)
        self.assertFalse(Commande.objects.exists())

    # --- Webhook ---
    def test_webhook_signature_obligatoire(self):
        corps = json.dumps({"type": "checkout.session.completed"})
        r = self.c.post("/paiement/webhook/", corps, content_type="application/json",
                        HTTP_STRIPE_SIGNATURE=signe(corps, "whsec_autre"), **HOTE)
        self.assertEqual(r.status_code, 400)

    def test_commande_payee_un_seul_email(self):
        self.payer()
        for _ in range(2):   # Stripe peut renvoyer le même événement
            self.assertEqual(self.webhook("checkout.session.completed", payment_status="paid", status="complete").status_code, 200)
        cde = Commande.objects.get()
        self.assertEqual(cde.statut, Commande.PAYEE)
        self.assertEqual(len(mail.outbox), 2)   # vendeur + client, une seule fois
        vendeur, client = mail.outbox
        self.assertEqual(vendeur.to, [settings.COMMANDES_DESTINATAIRE])
        self.assertIn(cde.ref, vendeur.subject)
        self.assertIn("Boule de Noël Flocon ajouré (Rouge · Ø 8 cm)", vendeur.body)
        self.assertEqual(vendeur.reply_to, ["ada@example.com"])
        self.assertEqual(client.to, ["ada@example.com"])
        self.assertIn(cde.ref, client.subject)
        self.assertIn("Bonjour Ada Lovelace", client.body)
        self.assertIn("Total payé : 35,20 €", client.body)
        self.assertIn("Point relais, 3 à 5 jours ouvrés", client.body)
        self.assertEqual(client.reply_to, [settings.COMMANDES_DESTINATAIRE])

    def test_webhook_retrouve_la_commande_par_sa_reference(self):
        self.payer()
        cde = Commande.objects.get()
        Commande.objects.update(session_stripe=None)   # webhook arrivé avant l'enregistrement de l'identifiant
        corps = json.dumps({"id": "evt_2", "object": "event", "type": "checkout.session.completed", "data": {"object": {
            "id": "cs_test_autre", "object": "checkout.session", "client_reference_id": cde.ref, "payment_status": "paid", "status": "complete"}}})
        self.c.post("/paiement/webhook/", corps, content_type="application/json", HTTP_STRIPE_SIGNATURE=signe(corps), **HOTE)
        self.assertEqual(Commande.objects.get().statut, Commande.PAYEE)

    def test_email_html_avec_bandeau_et_logo_integre(self):
        self.payer()
        self.webhook("checkout.session.completed", payment_status="paid", status="complete")
        client = mail.outbox[1]
        html, type_ = client.alternatives[0]
        self.assertEqual(type_, "text/html")
        self.assertIn('src="cid:logo-biboulab"', html)
        self.assertIn("Bonjour Ada Lovelace,<br>", html)
        self.assertIn("Biboulab\u00a0! Votre paiement", html)                    # pas de « ! » seul en début de ligne
        self.assertIn('<a style="color:#7C3AED;text-decoration:underline;" href="https://www.biboulab.fr">', html)
        self.assertIn("Du fichier à l&#x27;objet, imprimé avec passion", html)   # slogan de data.js
        self.assertEqual(client.mixed_subtype, "related")
        logo = client.attachments[0]
        self.assertEqual(logo["Content-ID"], "<logo-biboulab>")
        self.assertEqual(logo.get_content_type(), "image/png")
        brut = client.message().as_string()
        self.assertIn("multipart/related", brut)
        self.assertIn("multipart/alternative", brut)

    def test_paiement_differe(self):
        self.payer()
        self.webhook("checkout.session.completed", payment_status="unpaid", status="complete")
        self.assertEqual(Commande.objects.get().statut, Commande.ATTENTE)
        self.assertEqual(len(mail.outbox), 0)
        self.webhook("checkout.session.async_payment_succeeded", payment_status="paid", status="complete")
        self.assertEqual(Commande.objects.get().statut, Commande.PAYEE)
        self.assertEqual(len(mail.outbox), 2)

    def test_echec_d_un_email_n_empeche_pas_l_autre(self):
        self.payer()
        with mock.patch("django.core.mail.EmailMessage.send", side_effect=[OSError("sendmail absent"), 1]) as envoi:
            self.assertEqual(self.webhook("checkout.session.completed", payment_status="paid", status="complete").status_code, 200)
        self.assertEqual(envoi.call_count, 2)
        self.assertEqual(Commande.objects.get().statut, Commande.PAYEE)

    def test_modele_casse_n_empeche_pas_la_commande(self):
        self.payer()
        with mock.patch("gestion.emails.rendre", side_effect=[Exception("modèle cassé"), ("Objet", "Message")]):
            self.assertEqual(self.webhook("checkout.session.completed", payment_status="paid", status="complete").status_code, 200)
        self.assertEqual(Commande.objects.get().statut, Commande.PAYEE)
        self.assertEqual(len(mail.outbox), 1)

    def test_email_en_texte_simple_sans_echappement(self):
        self.payer(client={**CLIENT, "nom": "O'Brien & <fils>", "note": ""})
        self.webhook("checkout.session.completed", payment_status="paid", status="complete")
        client = mail.outbox[1]
        self.assertIn("Bonjour Ada O'Brien & <fils>,", client.body)
        self.assertNotIn("Votre précision", client.body)
        self.assertIn("Bonjour Ada O&#x27;Brien &amp; &lt;fils&gt;,", client.alternatives[0][0])   # échappé en HTML
        self.assertEqual(client.subject, f"Votre commande Biboulab {Commande.objects.get().ref} est confirmée")

    def test_apercu_emails(self):
        from io import StringIO
        from django.core.management import call_command
        sortie = StringIO()
        call_command("apercu_emails", stdout=sortie)
        self.assertIn("Objet : Votre commande Biboulab BL-EXEMPLE1 est confirmée", sortie.getvalue())
        self.assertIn("Livraison (Point relais) : offerte", sortie.getvalue())

    def test_session_expiree_efface_les_coordonnees(self):
        self.payer()
        self.webhook("checkout.session.expired", payment_status="unpaid", status="expired")
        self.assertFalse(Commande.objects.exists())

    def test_etat_session(self):
        self.stripe.v1.checkout.sessions.retrieve.return_value = mock.Mock(payment_status="paid", status="complete", client_reference_id="BL-1234ABCD")
        r = self.c.get("/paiement/etat/", {"session_id": "cs_test_123"}, **HOTE)
        self.assertEqual(r.json(), {"ok": True, "ref": "BL-1234ABCD", "statut": "payee"})
        self.assertEqual(self.c.get("/paiement/etat/", {"session_id": "../x"}, **HOTE).status_code, 404)


@override_settings(SECURE_SSL_REDIRECT=False)
class EmailsAdminTests(PaiementTests):
    """Page /emails/ de l'administration : modèles des e-mails de commande."""

    def setUp(self):
        super().setUp()
        self.admin = Client()
        self.admin.force_login(get_user_model().objects.create_user("gerant", password="Un-mot-de-passe-solide-42", is_staff=True))
        session = self.admin.session          # heure de connexion, contrôlée par SecuriteMiddleware
        session["debut"] = _time.time()
        session.save()

    def page(self, **donnees):
        if donnees:
            return self.admin.post("/emails/?modele=" + donnees.get("modele", "client"), donnees, **HOTE)
        return self.admin.get("/emails/", **HOTE)

    def test_reservee_aux_administrateurs(self):
        r = Client().get("/emails/", **HOTE)
        self.assertEqual(r.status_code, 302)
        self.assertIn("/connexion/", r["Location"])

    def test_affiche_le_modele_par_defaut_et_son_apercu(self):
        r = self.page()
        self.assertEqual(r.status_code, 200)
        html = r.content.decode()
        self.assertIn("modèle par défaut", html)
        self.assertIn("Bonjour {{ nom }}", html)                  # le modèle, à modifier
        self.assertIn("Bonjour Ada Lovelace,", html)              # son aperçu
        self.assertIn("Objet : Votre commande Biboulab BL-EXEMPLE1 est confirmée", html)

    def test_apercu_html_et_logo(self):
        html = self.page().content.decode()
        self.assertIn('<img src="/emails/logo.png"', html)
        self.assertIn("Version texte", html)
        r = self.admin.get("/emails/logo.png", **HOTE)
        self.assertEqual((r.status_code, r["Content-Type"]), (200, "image/png"))
        self.assertEqual(Client().get("/emails/logo.png", **HOTE).status_code, 302)   # réservé à l'administration

    def test_modele_casse_refuse_et_texte_conserve(self):
        r = self.page(modele="client", action="enregistrer", objet="Commande {{ ref }}", corps="{% for l in lignes %}oubli du endfor")
        self.assertEqual(r.status_code, 400)
        self.assertIn("Erreur dans le modèle", r.content.decode())
        self.assertIn("oubli du endfor", r.content.decode())
        self.assertFalse(ModeleEmail.objects.exists())

    def test_apercu_sans_enregistrer(self):
        r = self.page(modele="client", action="apercu", objet="Merci {{ nom }}", corps="Coucou {{ nom }}")
        self.assertIn("Coucou Ada Lovelace", r.content.decode())
        self.assertFalse(ModeleEmail.objects.exists())

    def test_modele_enregistre_utilise_pour_les_vraies_commandes(self):
        self.page(modele="client", action="enregistrer", objet="Merci {{ nom }} ({{ ref }})", corps="Total : {{ total }}\r\nÀ bientôt")
        self.assertEqual(ModeleEmail.objects.get(nom="client").corps, "Total : {{ total }}\nÀ bientôt")
        self.payer()
        self.webhook("checkout.session.completed", payment_status="paid", status="complete")
        vendeur, client = mail.outbox
        self.assertEqual(client.subject, f"Merci Ada Lovelace ({Commande.objects.get().ref})")
        self.assertEqual(client.body, "Total : 35,20 €\nÀ bientôt\n")
        self.assertIn("Nouvelle commande payée en ligne", vendeur.body)   # l'autre modèle reste celui par défaut

        self.page(modele="client", action="defaut")
        self.assertFalse(ModeleEmail.objects.exists())

    # Les tests de paiement hérités ne sont pas rejoués ici.
    for _nom in [n for n in dir(PaiementTests) if n.startswith("test_")]:
        locals()[_nom] = None
    del _nom
