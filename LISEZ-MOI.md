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

La page de gestion ne fonctionne que sur votre ordinateur. Le dossier `outils/` n'a pas besoin d'être mis en ligne.

## Suivre les commandes (onglet « Commandes »)

Dans la page d'administration, l'onglet **Commandes** (ou directement http://localhost:4173/admin#commandes) présente vos commandes en tickets, façon Trello, sur trois colonnes : **Commande**, **En cours d'impression**, **À livrer**.

- **Ajouter une commande** : le bouton « Coller un e-mail de commande » lit l'e-mail reçu depuis le site (« Commande GF-… ») et crée le ticket tout seul : objets avec leur photo, couleur et taille, client, adresse, livraison, paiement souhaité. Le « + Ajouter une commande » en bas d'une colonne crée un ticket vide.
- **Objets du site** : dans la fiche d'une commande, la barre « Rechercher un objet du site » retrouve un produit par son nom ou sa catégorie et l'ajoute avec sa photo et son nom (flèches puis Entrée, ou clic). Couleur, taille, quantité et prix se règlent ensuite ; le prix suit la taille choisie.
- **Avancer une commande** : glissez le ticket dans la colonne suivante, ou utilisez son bouton (« Lancer l'impression », « Imprimée », « Livrée »). Les commandes livrées quittent le tableau et restent consultables avec le bouton « Livrées ».
- **Fiche** : un clic sur un ticket l'ouvre : client, adresse, paiement reçu ou non, mode et frais de livraison, numéro de suivi, note. L'étiquette « À encaisser » / « Payée » apparaît sur le ticket.
- **Enregistrement** : automatique, dans `outils/commandes.json`, avec une copie par jour dans `outils/sauvegardes/` (30 jours). Ce fichier contient des données personnelles de vos clients : il n'est ni mis en ligne, ni envoyé sur GitHub (exclu dans `.gitignore`), et le serveur local refuse de le servir. Pensez à le sauvegarder avec vos autres fichiers.

## Fichiers

| Fichier | Rôle |
|---|---|
| `assets/js/data.js` | **Le fichier à modifier** : marque, slogan, liens, catégories, produits, avis, textes « À propos », livraison, mentions légales |
| `assets/css/style.css` | Design et animations. Couleurs et polices en haut du fichier (section 1) |
| `assets/js/icons.js` | Icônes du site (catégories, boutons). Une ligne par icône |
| `outils/admin.html` | Page de gestion : catalogue (catégories, objets) et suivi des commandes (voir ci-dessus) |
| `outils/commandes.json` | Vos commandes, créé par l'onglet « Commandes ». Local uniquement, jamais mis en ligne |
| `assets/js/app.js` | Moteur commun : menu, pied de page, thème, panier, curseur, préloader, transitions, cookies |
| `assets/js/pages.js` | Contenu de chaque page (accueil, boutique, fiche produit, panier, contact…) |
| `index.html` | Accueil |
| `boutique.html` | Tous les produits, filtres et tri |
| `categorie.html` | Page d'une catégorie (`categorie.html?c=noel`) |
| `produit.html` | Fiche produit (`produit.html?id=dragon-articule`) |
| `a-propos.html`, `contact.html`, `panier.html` | À propos, contact, panier + commande en 3 étapes |
| `mentions-legales.html`, `cgv.html`, `confidentialite.html`, `retractation.html` | Pages légales |
| `sitemap.xml`, `robots.txt` | Référencement (générés par `outils/generer-sitemap.js`) |
| `assets/img/` | Favicon ; déposez ici photos et logos |
| `outils/` | Serveur local et générateur de sitemap |

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

- **Commande** : par défaut (`payment.mode: "email"`), valider la commande ouvre la messagerie du client avec le récapitulatif ; vous lui renvoyez un lien de paiement (Stripe Payment Links, PayPal, SumUp…). Aucun paiement n'est encaissé sur le site. Pour un paiement en ligne intégré, il faut un service marchand (Stripe Checkout, Shopify Buy Button, Snipcart…) : c'est une étape à part.
- **Contact** : même principe (messagerie du visiteur). Pour recevoir les messages directement, créez un formulaire sur un service comme Formspree et collez son adresse dans `SITE.formEndpoint`.

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
- **Mise en ligne** : déposez tout le dossier chez un hébergeur de sites statiques (Netlify, OVH, GitHub Pages, o2switch…). Les dossiers `outils/` et `.claude/` ne sont pas nécessaires en ligne.
