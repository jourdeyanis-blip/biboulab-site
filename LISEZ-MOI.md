# Biboulab — site vitrine e-commerce

Site statique (HTML + CSS + JavaScript, sans installation ni compilation).
Tous les contenus modifiables sont regroupés dans **un seul fichier : `assets/js/data.js`**.

## Voir le site en local

```bash
node outils/serveur-local.js
```

Puis ouvrir http://localhost:4173. (Un double-clic sur `index.html` fonctionne aussi.)

## Ajouter des catégories et des objets (page d'administration)

Lancez le serveur local, puis ouvrez **http://localhost:4173/admin** :

```bash
node outils/serveur-local.js
```

- **Arborescence** (colonne de gauche) : chaque catégorie se déplie pour montrer ses objets. Glissez une catégorie pour changer l'ordre du menu, glissez un objet vers une autre catégorie pour le déplacer.
- **Sous-catégories** : bouton « Sous-catégorie » d'une catégorie, ou glissez une catégorie au milieu d'une autre. Autant de niveaux que vous voulez. Sur le site, le menu et l'accueil montrent les catégories principales ; la page d'une catégorie affiche ses sous-catégories en filtres et inclut leurs objets.
- **Objets** : le « + » d'une catégorie y ajoute un objet ; remplissez nom, catégorie, prix, description, couleurs, tailles, puis ajoutez vos photos (elles sont réduites, converties en WebP et rangées dans `assets/img/produits/`).
- **Catégories** : « Nouvelle catégorie », choisissez un nom, une icône, deux couleurs et un effet d'ambiance. Les boutons Monter et Descendre règlent l'ordre du menu et de l'accueil.
- **Enregistrer** (ou Cmd/Ctrl + S) écrit dans `assets/js/data.js` et met à jour le sitemap. Une copie de l'ancien `data.js` est gardée dans `outils/sauvegardes/` à chaque enregistrement.
- Pour publier : renvoyez chez votre hébergeur `assets/js/data.js`, `sitemap.xml` et les nouvelles photos de `assets/img/produits/`.

Cette version locale enregistre dans `data.js` sur votre ordinateur. Pour gérer le catalogue directement sur le site en ligne, voir la section suivante.

## Administration en ligne (Django)

La même page de gestion est disponible sur **https://www.biboulab.fr/admin/** (et https://pprod.biboulab.fr/admin/). Elle est servie par une petite application Django (dossier `backend/`) qui tourne chez O2switch, à côté du site.

**Sécurité de la connexion**
- Connexion par identifiant et mot de passe (12 caractères minimum, haché en Argon2id). Choisissez un mot de passe long et unique, utilisé nulle part ailleurs.
- **Blocage 15 minutes après 5 échecs** (par adresse IP), même avec le bon mot de passe ensuite.
- Session : HTTPS obligatoire, cookie `__Host-` (Secure, HttpOnly, SameSite=Strict), déconnexion après 1 h sans action et au plus 8 h après la connexion.
- Protection CSRF sur chaque enregistrement, politique de sécurité du contenu (CSP) stricte, page non indexable, interdite dans une iframe.
- Les photos envoyées sont vérifiées (contenu réel d'image, nom contrôlé) et le dossier `assets/img/produits/` n'exécute jamais de code.

**Ce que l'administration écrit sur le serveur** : `assets/js/catalogue.js` (catégories et objets), `sitemap.xml` et les photos de `assets/img/produits/`. Le déploiement GitHub n'écrase jamais ces fichiers. Tant que `catalogue.js` vaut `null`, le site utilise le catalogue de `data.js` ; dès le premier enregistrement en ligne, c'est le catalogue en ligne qui fait foi (modifier les produits dans `data.js` n'a alors plus d'effet en ligne). Les 30 versions précédentes de `catalogue.js` sont gardées dans `backend/sauvegardes/`.

**Installation chez O2switch (une seule fois par site)**

1. Dans cPanel › **Terminal**, récupérez le dépôt dans votre dossier personnel (hors `public_html`) :

   ```bash
   git clone https://github.com/jourdeyanis-blip/biboulab-site.git ~/biboulab
   ```

   (Dépôt privé : créez une clé de déploiement en lecture seule dans GitHub › Settings › Deploy keys, ou utilisez cPanel › Git Version Control.) Pour la préproduction, faites un second clone sur la branche `preprod` : `git clone -b preprod … ~/biboulab-pprod`.

2. cPanel › **Setup Python App** › *Create Application* :
   - Python : 3.11 ou plus récent
   - Application root : `biboulab/backend`
   - Application URL : `www.biboulab.fr` / `admin`
   - Application startup file : `passenger_wsgi.py`, entry point : `application`
   - Variables d'environnement :
     - `DJANGO_SECRET_KEY` : une longue valeur aléatoire (générez-la avec `python3 -c "import secrets; print(secrets.token_urlsafe(50))"`), différente pour la préproduction
     - `SITE_ROOT` : `/home/<compte>/public_html` (préproduction : `/home/<compte>/pprod.biboulab.fr/public_html`)
     - `DJANGO_ALLOWED_HOSTS` : `www.biboulab.fr,biboulab.fr` (préproduction : `pprod.biboulab.fr`)

3. Dans le Terminal, activez l'environnement Python (la commande exacte est affichée en haut de la page de l'application dans cPanel), puis :

   ```bash
   cd ~/biboulab/backend
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py creer_admin
   ```

   `creer_admin` demande l'identifiant et le mot de passe du compte.

4. Cliquez sur **Restart** dans Setup Python App, puis ouvrez https://www.biboulab.fr/admin/.

**Mettre à jour l'administration** (après une modification de `backend/` ou de `outils/admin.html`) :

```bash
cd ~/biboulab && git pull && cd backend && pip install -r requirements.txt && python manage.py migrate && touch tmp/restart.txt
```

**En cas de problème**
- Mot de passe oublié, ou à changer : relancez `python manage.py creer_admin` avec le même identifiant.
- Compte bloqué après des erreurs : attendez 15 minutes, ou `python manage.py axes_reset`.
- Boucle de redirection à l'ouverture de `/admin/` : ajoutez la variable `DJANGO_SSL_REDIRECT=0` (Apache impose déjà le HTTPS).
- Tests automatiques : `DJANGO_SECRET_KEY=test python manage.py test`.
- Essai sur votre ordinateur : `DJANGO_DEBUG=1 python manage.py runserver`, puis http://localhost:8000/.

## Paiement en ligne (Stripe)

Avec `payment.mode: "stripe"` (dans `data.js`), le bouton **« Commander et payer »** du panier envoie le client sur la page de paiement sécurisée de Stripe (Stripe Checkout). Les coordonnées bancaires ne passent jamais par le site. C'est l'administration Django qui parle à Stripe : elle doit donc être installée (voir ci-dessus).

**Comment ça marche**
1. Le panier envoie à `/admin/paiement/session/` les **identifiants** des articles (objet, couleur, taille, quantité), le mode de livraison et l'adresse. Aucun prix : le serveur relit les prix dans `catalogue.js` (ou `data.js` tant que le catalogue en ligne n'a jamais été enregistré) et les frais de port dans `data.js`, puis crée la commande et la session Stripe.
2. Le client paie chez Stripe, puis revient sur `panier.html` : panier vidé et message de confirmation. S'il annule, il retrouve son panier et son adresse.
3. Stripe prévient le serveur par un **webhook** signé (`/admin/paiement/webhook/`) : c'est la seule preuve de paiement. La commande passe alors à « payée » et vous recevez **un e-mail** (adresse `COMMANDES_DESTINATAIRE`) avec les articles, couleurs, tailles, l'adresse de livraison et la précision du client. Répondre à cet e-mail écrit directement au client.

Les commandes sont enregistrées dans la base de l'administration (`backend/db.sqlite3`). Les coordonnées d'un client qui abandonne le paiement sont effacées à l'expiration de la session (1 h).

**Activer le paiement (à faire d'abord en préproduction, en mode test)**
1. Dashboard Stripe › **Développeurs › Clés API** : copiez la clé secrète (`sk_test_…` pour les essais). Possible aussi : une **clé restreinte** (`rk_…`) limitée à *Checkout Sessions : Écriture*, à essayer d'abord en préproduction.
2. Dashboard Stripe › **Développeurs › Webhooks › Ajouter une destination** :
   - URL : `https://pprod.biboulab.fr/admin/paiement/webhook/` (en production : `https://www.biboulab.fr/admin/paiement/webhook/`) ;
   - événements : `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired` ;
   - copiez le **secret de signature** (`whsec_…`).
3. cPanel › **Setup Python App** › votre application › *Environment variables* :
   - `STRIPE_SECRET_KEY` : la clé de l'étape 1 ;
   - `STRIPE_WEBHOOK_SECRET` : le secret de l'étape 2 ;
   - facultatif : `COMMANDES_DESTINATAIRE` (par défaut biboulab@outlook.fr) et `COMMANDES_EXPEDITEUR` (par défaut no-reply@biboulab.fr, à garder sur le domaine du site).
4. Mettez à jour l'administration (commande `git pull … migrate …` ci-dessus : elle installe la bibliothèque Stripe et crée la table des commandes), puis **Restart**.
5. Faites une commande sur la préproduction avec la carte de test `4242 4242 4242 4242` (date future, n'importe quel code). Vérifiez : retour sur le site avec « paiement confirmé », e-mail de commande reçu, paiement visible dans le Dashboard (Transactions).

**Réglages dans le Dashboard Stripe**
- *Paramètres › Moyens de paiement* : choisissez ce que vous proposez (carte, Apple Pay, Google Pay, Link…). Le site n'en impose aucun.
- *Paramètres › E-mails clients* : activez « Paiements réussis » pour que le client reçoive un reçu (aucun e-mail n'est envoyé en mode test).
- *Paramètres › Image de marque* : logo et couleurs de la page de paiement.

**Passer en production** : remplacez dans cPanel la clé de test par la clé **live** (`sk_live_…` ou `rk_live_…`), créez le webhook live (même URL sur `www.biboulab.fr`, mêmes événements) et mettez son `whsec_…`. Sans clé, le site affiche « Le paiement en ligne n'est pas encore activé » au moment de payer : remettez `payment.mode: "email"` si vous préférez l'ancien fonctionnement d'ici là.

## Site en construction

Tant que le bloc « CONSTRUCTION » du fichier `.htaccess` est présent, les visiteurs de `biboulab.fr` voient `construction.html` à la place du site. Le blocage ne vaut que pour ce domaine : en local, ou sur une autre adresse (par exemple une préproduction `preprod.biboulab.fr`), le site complet s'affiche.

- **Voir la page en local** : http://localhost:4173/construction.html
- **Modifier son texte** : directement dans `construction.html` (page autonome, sans `data.js`).
- **Ouvrir le site** : supprimez dans `.htaccess` tout le bloc compris entre « DÉBUT CONSTRUCTION » et « FIN CONSTRUCTION », puis publiez.

## Fichiers

| Fichier | Rôle |
|---|---|
| `assets/js/data.js` | **Le fichier à modifier** : marque, slogan, liens, catégories, produits, avis, textes « À propos », livraison, mentions légales |
| `assets/css/style.css` | Design et animations. Couleurs et polices en haut du fichier (section 1) |
| `assets/js/icons.js` | Icônes du site (catégories, boutons). Une ligne par icône |
| `outils/admin.html` | Page de gestion des catégories et des objets (voir ci-dessus) |
| `assets/js/app.js` | Moteur commun : menu, pied de page, thème, panier, curseur, préloader, transitions, cookies |
| `assets/js/pages.js` | Contenu de chaque page (accueil, boutique, fiche produit, panier, contact…) |
| `index.html` | Accueil |
| `construction.html`, `.htaccess` | Page « site en construction » et son activation (voir ci-dessus) |
| `boutique.html` | Tous les produits, filtres et tri |
| `categorie.html` | Page d'une catégorie (`categorie.html?c=noel`) |
| `produit.html` | Fiche produit (`produit.html?id=dragon-articule`) |
| `a-propos.html`, `contact.html`, `panier.html` | À propos, contact, panier + commande en 3 étapes |
| `mentions-legales.html`, `cgv.html`, `confidentialite.html`, `retractation.html` | Pages légales |
| `sitemap.xml`, `robots.txt` | Référencement (générés par `outils/generer-sitemap.js`) |
| `assets/img/` | Favicon ; déposez ici photos et logos |
| `outils/` | Serveur local, page de gestion (`admin.html`) et générateur de sitemap |
| `backend/` | Administration en ligne (Django) : jamais copiée dans `public_html` |
| `assets/js/catalogue.js` | Catalogue écrit par l'administration en ligne (`null` = celui de `data.js`) |

## À remplacer avant la mise en ligne

Dans `data.js`, cherchez **`⚠️ À REMPLACER`** :

1. **Liens MakerWorld et Cults3D** : `SITE.stores` → remplacez `VOTRE_PSEUDO` dans les deux adresses.
2. **E-mail et nom de domaine** : `SITE.email`, `SITE.url`.
3. **Mentions légales** : `SITE.legal` (nom, SIRET, adresse, hébergeur, médiateur). Tant que `demo: true`, ces valeurs sont surlignées en orange sur les pages légales.
4. **Produits** : les 28 produits sont des exemples (noms, prix, descriptions).
5. **Avis clients** : `REVIEWS` contient des avis fictifs. Publier de faux avis est interdit : remplacez-les par de vrais retours, ou videz la liste.
6. **Chiffres de l'accueil** : `SITE.stats`.
7. Passez ensuite **`demo: false`** pour masquer les mentions « contenu d'exemple ».
8. Relancez `node outils/generer-sitemap.js` (met à jour le sitemap avec votre domaine et vos produits).

Les textes des pages légales sont des modèles adaptés à une micro-entreprise : faites-les relire avant publication (désignation d'un médiateur de la consommation obligatoire).

## Modifier les contenus

**Ajouter un produit** — le plus simple est la page de gestion (voir plus haut). À la main : dans `PRODUCTS`, copiez un bloc `{ ... }` et changez :
`id` (unique, sans espace ni accent), `name`, `category`, `price`, `short`, `description`, `colors`, `sizes`, `material`, `printTime`, `dimensions`, `weight`, `badge` (`"new"`, `"best"` ou `null`).

**Mettre de vraies photos** — déposez-les dans `assets/img/produits/` (format WebP, carré, environ 1000 px) puis :

```js
images: ["assets/img/produits/dragon-1.webp", "assets/img/produits/dragon-2.webp"],
```

Sans photo, un visuel d'illustration aux couleurs de la catégorie est généré automatiquement.

**Visionneuse 3D** — déposez un fichier `.glb` et indiquez `model3d: "assets/modeles/dragon.glb"` : un bouton « 3D » apparaît dans la galerie.

**Lien direct vers un modèle** — ajoutez au produit `makerworld: "https://…"` et/ou `cults3d: "https://…"` ; sinon le bouton mène à votre profil.

**Logos officiels MakerWorld / Cults3D** — les pastilles « MW » et « C3D » sont des substituts. Téléchargez les logos officiels depuis les kits presse des plateformes, déposez-les dans `assets/img/` et renseignez `logo: "assets/img/makerworld.svg"` dans `SITE.stores`.

**Logo de la marque** — `SITE.logo: "assets/img/logo.svg"` remplace le logotype texte animé.

**Photos de l'atelier** — `ABOUT.photos[].src`.

**Catégories** — `CATEGORIES` : nom, couleurs, description, effet (`snow`, `fog`, `grid`, `glow`).

## Paiement et formulaires

- **Commande** : avec `payment.mode: "stripe"`, le client paie en ligne par Stripe Checkout (voir « Paiement en ligne (Stripe) »). Avec `payment.mode: "email"`, valider la commande ouvre la messagerie du client avec le récapitulatif et vous lui renvoyez un moyen de paiement ; aucun paiement n'est alors encaissé sur le site.
- **Contact** : le formulaire envoie directement un e-mail à la boîte de l'entreprise, sans ouvrir la messagerie du visiteur. Il passe par `envoyer-contact.php` (réglé dans `SITE.formEndpoint`) ; l'adresse destinataire et l'adresse d'expédition se changent en haut de ce fichier (`DESTINATAIRE`, `EXPEDITEUR`). Cela ne fonctionne que sur l'hébergement (PHP) : en local, le formulaire affichera une erreur.

## Animations et design : où régler quoi

| Effet | Où | Réglage |
|---|---|---|
| Palette, polices, arrondis | `style.css` section 1 | variables `--violet`, `--cyan`, `--orange`, `--bg`, `--font-d`, `--font-b`, `--r` |
| Préloader (logo « imprimé » couche par couche, 1,5 s, une fois par session) | `app.js` `initEntrance`, `style.css` section 4 | durée : `1450` (JS) et `1.15s` (CSS) |
| Hero : vase imprimé en temps réel, particules, sol en perspective | `pages.js` `heroCanvas` | `cycle` (durée), `N` (nombre de couches), `profile` (forme) |
| Titre mot par mot, mots en dégradé | `data.js` `hero.title` | entourez les mots d'`*étoiles*` |
| Bouton magnétique | attribut `data-magnetic` | force : `0.3` / `0.4` dans `magnetic()` |
| Cartes inclinées en 3D + reflet | attribut `data-tilt` | amplitude : `12` (degrés) dans `tilt()` |
| Révélations au défilement | attribut `data-reveal` (`left`, `right`, `scale`) | `style.css` section 15 |
| Parallaxe | attribut `data-parallax="0.25"` | la valeur règle l'intensité |
| Compteurs animés | `data.js` `stats` | durée `1600` ms dans `app.js` |
| Bandeau défilant | `data.js` `marquee` | vitesse : `28s` dans `.marquee-track` |
| Curseur personnalisé (anneau, libellé « Voir » sur les produits) | `app.js` `initCursor` | désactivé sur tactile |
| Transition entre pages (rideau dégradé) | `app.js` `initEntrance` | `300` ms |
| Thème clair/sombre (révélation circulaire) | `app.js` `initTheme` | couleurs claires : `[data-theme="light"]` |
| Flocons (Noël), brouillard (Halloween), plan (maquette) | `style.css` section 8 | classes `fx-snow`, `fx-fog`, `fx-grid` |
| Frise « process » qui se remplit | `pages.js` `about` | — |
| Confirmation d'ajout au panier (bouton, bille volante, notification) | `app.js` `flyToCart`, `toast` | — |

Les visiteurs qui ont activé « réduire les animations » obtiennent une version calme : pas de préloader, de curseur, de rideau ni de parallaxe, et un hero fixe.

## Bon à savoir

- **Cookies** : le site ne stocke que le panier, le thème et le choix cookies dans le navigateur. Si vous ajoutez une mesure d'audience, ne la chargez que si `UI.consent() === "accept"`.
- **Polices** : chargées depuis Google Fonts (mentionné dans la politique de confidentialité). Pour une conformité RGPD plus stricte, hébergez-les vous-même dans `assets/`.
- **Référencement** : chaque page a son titre et sa description ; les fiches produits publient des données structurées `Product`. Le contenu étant généré en JavaScript, Google l'indexe, mais plus lentement qu'un site entièrement statique.
- **Mise en ligne** : déposez tout le dossier chez un hébergeur de sites statiques (Netlify, OVH, GitHub Pages, o2switch…). Les dossiers `outils/`, `backend/` et `.claude/` ne vont pas dans le dossier public (`backend/` s'installe à part, voir « Administration en ligne »).
