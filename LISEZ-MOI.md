# Biboulab — site vitrine e-commerce

Site statique (HTML + CSS + JavaScript, sans installation ni compilation).
Tous les contenus modifiables sont regroupés dans **un seul fichier : `assets/js/data.js`**,
et se modifient sans toucher au code depuis la **page d'administration** (voir plus bas).

## Voir le site en local

```bash
node outils/serveur-local.js
```

Puis ouvrir http://localhost:4173. (Un double-clic sur `index.html` fonctionne aussi.)

## Administrer le site (page d'administration)

En ligne sur **/admin/** (voir « Administration en ligne » plus bas), ou en local avec `node outils/serveur-local.js` puis **http://localhost:4173/admin**. Quatre onglets :

- **Catalogue** : catégories et objets (détail ci-dessous).
- **Pages** : textes de la page À propos (histoire, photos de l'atelier, frise du process) et des quatre pages légales (mentions légales, CGV, confidentialité, rétractation). Chaque page se découpe en sections : intertitre, texte, encadré ou non ; ajoutez, réordonnez ou supprimez-les. Un aperçu se met à jour à côté pendant la saisie. Titre et description pour Google se règlent aussi ici.
- **Réglages** : identité et contact (nom, slogan, e-mail, adresse du site, logo), **informations légales** (exploitant, SIRET, adresse, hébergeur, médiateur, mention TVA), **page d'accueil** (textes et photos de chaque section, voir ci-dessous), livraison, moyens de paiement, boutiques externes, couleurs de filament et avis clients.
- **Suivi commande** : votre tableau personnel façon Trello (détail ci-dessous). Le bouton **« Commandes »**, lui, reste la liste des vraies commandes payées sur le site.

**Page d'accueil** (Réglages › Page d'accueil) : chaque section se règle de haut en bas.
- Bandeau principal : surtitre, titre, texte, boutons, et une **photo** à droite du titre (vide : l'imprimante 3D animée).
- Chiffres animés et bandeau défilant.
- « Les univers », « Tout juste sortis du plateau », « L'atelier », « Avis clients », « Retrouvez-moi aussi sur » : surtitre, titre, bouton. Les mots du titre entre `*étoiles*` passent en dégradé.
- **Galerie « Tout juste sortis du plateau »** : les photos forment une liste repliée (vignette, nom, petit texte) ; « Modifier » déplie une photo pour changer sa photo de couverture et ses textes, les flèches changent l'ordre. « Ajouter une photo » pour composer le mur à faire glisser avec vos propres images. Chaque photo peut avoir un titre, un petit texte à droite (prix, année…), une description (tapée à la machine à l'ouverture) et un lien avec son bouton (page du site comme `produit.html?id=…`, ou adresse en https://). Sans aucune photo, la galerie montre automatiquement les 8 dernières créations du catalogue.
- « L'atelier » : points forts (un par ligne) et **photo** (vide : 1re photo de la page À propos, sinon l'imprimante animée).
- Le bloc « Retrouvez-moi aussi sur » apparaît aussi en bas des autres pages.
- **Cartes « Les univers »** (« Huit catégories, mille idées ») : la section affiche la liste des cartes, avec leur vignette actuelle ; « Modifier » déplie une carte pour choisir sa **photo fixe** et changer le nom de l'univers. La même photo se règle aussi dans le Catalogue, sur la fiche de la catégorie. Vide : le visuel d'illustration aux couleurs de la catégorie (les photos des objets ne sont pas utilisées).

Dans les textes des pages : ligne vide = nouveau paragraphe, `- ` en début de ligne = puce, `**gras**`, `[lien](cgv.html)`, `### intertitre`. Les variables comme `{owner}`, `{siret}`, `{address}`, `{email}` sont remplacées par les informations légales des Réglages : changez votre SIRET une fois, toutes les pages suivent. Modifier une page légale met automatiquement à jour sa date « Dernière mise à jour ».

### Catalogue

```bash
node outils/serveur-local.js
```

- **Arborescence** (colonne de gauche) : chaque catégorie se déplie pour montrer ses objets. Glissez une catégorie pour changer l'ordre du menu, glissez un objet vers une autre catégorie pour le déplacer.
- **Sous-catégories** : bouton « Sous-catégorie » d'une catégorie, ou glissez une catégorie au milieu d'une autre. Autant de niveaux que vous voulez. Sur le site, le menu et l'accueil montrent les catégories principales ; la page d'une catégorie affiche ses sous-catégories en filtres et inclut leurs objets.
- **Objets** : le « + » d'une catégorie y ajoute un objet ; remplissez nom, catégorie, prix, description, couleurs, tailles, puis ajoutez vos photos (elles sont réduites, converties en WebP et rangées dans `assets/img/produits/`).
- **Catégories** : « Nouvelle catégorie », choisissez un nom, une icône, deux couleurs et un effet d'ambiance. Les boutons Monter et Descendre règlent l'ordre du menu et de l'accueil.
- **Enregistrer** (ou Cmd/Ctrl + S) enregistre les trois onglets d'un coup : écrit dans `assets/js/data.js`, recopie titres et descriptions des pages légales dans leur fichier HTML et met à jour le sitemap. Une copie de l'ancien `data.js` est gardée dans `outils/sauvegardes/` à chaque enregistrement.
- Pour publier : envoyez vos modifications sur la branche `main` du dépôt GitHub (le site est alors redéployé automatiquement sur O2switch), ou renvoyez chez votre hébergeur `assets/js/data.js`, les pages `.html` modifiées, `sitemap.xml` et les nouvelles images de `assets/img/`.

Cette version locale enregistre dans `data.js` sur votre ordinateur. Pour gérer catalogue, pages et réglages directement sur le site en ligne, voir la section suivante.

### Suivi commande

Un tableau à trois colonnes, **Commande**, **En cours d'impression**, **À livrer**, où vous créez vous-même vos tickets pour savoir où en est chaque commande. Il est indépendant des commandes payées du site (bouton « Commandes ») : rien n'y arrive tout seul, et rien de ce que vous y faites n'est envoyé aux clients.

- **Créer un ticket** : « + Ajouter une commande » en bas d'une colonne. La fiche s'ouvre : nom du client, e-mail, adresse, référence (par exemple le numéro de la commande du site), note.
- **Objets** : la barre « Rechercher un objet du site » retrouve un produit du catalogue par son nom ou sa catégorie et l'ajoute avec sa photo et son nom (flèches puis Entrée, ou clic). Couleur, taille, quantité et prix se règlent ensuite ; le prix suit la taille choisie. Les photos des objets s'affichent en haut du ticket.
- **Objet hors catalogue** : tapez simplement son nom dans la même barre, puis choisissez « Ajouter « … » » en bas de la liste. L'objet est ajouté sans être référencé sur le site ; son nom reste modifiable, et vous saisissez son prix, sa quantité et ses options (couleur, taille…) à la main.
- **Livraison offerte** : la case du bloc Livraison met les frais à 0 € et les bloque, même si vous changez de mode ; décochée, le tarif du mode choisi revient. Le ticket porte alors l'étiquette « Livraison offerte ».
- **Montant par colonne** : la bulle en haut de chaque colonne (et de la vue « Livrées ») additionne le total des commandes affichées, livraison comprise. Avec une recherche ou un filtre d'étiquette, elle ne compte que les tickets qui restent visibles.
- **Bilan** : l'onglet « Bilan » au bord droit du tableau s'ouvre et se referme d'un clic. Il affiche le nombre de commandes en attente (colonne Commande), en cours (en impression + à livrer) et livrées, puis le total en euros de toutes les commandes, livraison comprise. Il compte tout le tableau, sans tenir compte de la recherche. Ouvert ou fermé, il reste comme vous l'avez laissé sur cet ordinateur (fermé par défaut sur téléphone). Un clic sur « Commandes livrées » déplie l'historique des commandes livrées : les plus récentes d'abord, regroupées par mois avec le nombre et le montant du mois ; un clic sur une commande ouvre sa fiche.
- **Avancer** : glissez le ticket dans la colonne suivante, ou utilisez son bouton (« Lancer l'impression », « Imprimée », « Livrée »). Les tickets livrés quittent le tableau et restent consultables avec le bouton « Livrées ».
- **Vos étiquettes** : dans la fiche, section « Étiquettes », tapez un nom (ex. Urgent, Cadeau, Personnalisé), choisissez une couleur et cliquez sur « Créer » (ou Entrée) : l'étiquette est posée sur le ticket et reste disponible pour tous les autres. Un clic sur une étiquette la pose ou la retire. « Renommer, recolorer ou supprimer » les modifie pour tout le tableau (une étiquette supprimée est retirée de tous les tickets, après confirmation).
- **Étiquettes automatiques** : « Payée » (quand la case « Paiement reçu » de la fiche est cochée), « Note », « Suivi ».
- **Retrouver un ticket** : la recherche en haut filtre par client, référence, objet ou nom d'étiquette ; le menu « Toutes les étiquettes » n'affiche que les tickets portant l'étiquette choisie.
- **Enregistrement automatique**, sans bouton : en ligne dans la base de l'administration Django, en local dans `outils/suivi.json` (sur votre ordinateur uniquement, jamais envoyé sur GitHub). Les deux tableaux sont séparés. Si le tableau a été modifié dans un autre onglet ou sur un autre appareil, un message demande de recharger la page plutôt que d'écraser les changements.

## Administration en ligne (Django)

La même page de gestion est disponible sur **https://www.biboulab.fr/admin/** (et https://pprod.biboulab.fr/admin/). Elle est servie par une petite application Django (dossier `backend/`) qui tourne chez O2switch, à côté du site.

**Sécurité de la connexion**
- Connexion par identifiant et mot de passe (12 caractères minimum, haché en Argon2id). Choisissez un mot de passe long et unique, utilisé nulle part ailleurs.
- **Blocage 15 minutes après 5 échecs** (par adresse IP), même avec le bon mot de passe ensuite.
- Session : HTTPS obligatoire, cookie `__Host-` (Secure, HttpOnly, SameSite=Strict), déconnexion après 1 h sans action et au plus 8 h après la connexion.
- Protection CSRF sur chaque enregistrement, politique de sécurité du contenu (CSP) stricte, page non indexable, interdite dans une iframe.
- Les photos envoyées sont vérifiées (contenu réel d'image, nom contrôlé) et le dossier `assets/img/produits/` n'exécute jamais de code.

**Ce que l'administration écrit sur le serveur** : `assets/js/catalogue.js` (catégories et objets), `assets/js/contenu.js` (onglets Pages et Réglages : textes des pages, informations légales, livraison, paiement, couleurs, avis), `sitemap.xml` et les images de `assets/img/produits/` et `assets/img/atelier/`. Le déploiement GitHub n'écrase jamais ces fichiers. Tant que `catalogue.js` et `contenu.js` valent `null`, le site utilise `data.js` ; dès le premier enregistrement en ligne, ce sont eux qui font foi (modifier ces contenus dans `data.js` n'a alors plus d'effet en ligne). Les 30 versions précédentes de chacun sont gardées dans `backend/sauvegardes/`.

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

**Mise à jour automatique de l'administration** (à faire une fois par clone : production et préproduction)

Le déploiement GitHub n'envoie que le site public. Pour l'administration, c'est le serveur qui vérifie GitHub toutes les 5 minutes et se met à jour tout seul : `backend/deployer.sh` ne fait rien tant que la branche n'a pas bougé ; sinon il récupère le code, installe les dépendances si `requirements.txt` a changé, applique les migrations, vérifie la configuration et redémarre l'application. Aucun accès SSH depuis GitHub n'est nécessaire (O2switch filtre le SSH par adresse IP, et celles de GitHub changent sans cesse).

1. **Accès du serveur au dépôt** (dépôt privé uniquement) : cPanel › **Accès SSH** › *Gérer les clés SSH* › *Générer une nouvelle clé* (nom `github_biboulab`, sans mot de passe), puis copiez la **clé publique** dans GitHub › dépôt › Settings › **Deploy keys** › *Add deploy key* (lecture seule, sans cocher « Allow write access »). Dans le Terminal cPanel :

   ```bash
   printf 'Host github.com\n  IdentityFile ~/.ssh/github_biboulab\n  IdentitiesOnly yes\n' >> ~/.ssh/config
   cd ~/biboulab && git remote set-url origin git@github.com:jourdeyanis-blip/biboulab-site.git && git fetch
   ```

   La dernière commande doit répondre sans erreur (acceptez l'empreinte de GitHub la première fois).
2. **Chemin du Python de l'application** : en haut de la page de l'application dans cPanel › Setup Python App, la commande d'activation ressemble à `source /home/<compte>/virtualenv/biboulab/backend/3.11/bin/activate`. Le Python est le même chemin avec `python` au lieu de `activate`.
3. **Premier passage à la main** dans le Terminal, pour vérifier :

   ```bash
   ~/biboulab/backend/deployer.sh /home/<compte>/virtualenv/biboulab/backend/3.11/bin/python --forcer
   ```

   Il doit finir par « OK : … en ligne ».
4. **Tâche cron** : cPanel › **Tâches Cron** › *Ajouter une nouvelle tâche Cron*, « Une fois toutes les cinq minutes » (`*/5 * * * *`), commande :

   ```bash
   ~/biboulab/backend/deployer.sh /home/<compte>/virtualenv/biboulab/backend/3.11/bin/python >> ~/biboulab/backend/deploiement.log 2>&1
   ```

   Pour la préproduction, une seconde tâche identique avec `~/biboulab-pprod` et le Python de l'application de préproduction.

Ensuite, chaque fusion sur `main` (ou `preprod`) met l'administration à jour dans les 5 minutes qui suivent. Le journal `backend/deploiement.log` garde la trace de chaque mise à jour. Si un fichier a été modifié à la main sur le serveur, la mise à jour s'arrête au lieu de l'écraser (« ÉCHEC » dans le journal) : `git status` montre lequel, `git checkout -- <fichier>` annule la modification, et le passage suivant reprend.

**Mettre à jour à la main** (sans attendre, ou sans tâche cron) :

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
1. Le panier envoie à `/admin/paiement/session/` les **identifiants** des articles (objet, couleur, taille, quantité), le mode de livraison et l'adresse. Aucun prix : le serveur relit les prix dans `catalogue.js` (ou `data.js` tant que le catalogue en ligne n'a jamais été enregistré) et les frais de port dans `contenu.js` (ou `data.js` tant que les réglages n'ont jamais été enregistrés en ligne), puis crée la commande et la session Stripe.
2. Le client paie chez Stripe, puis revient sur `panier.html` : panier vidé et message de confirmation. S'il annule, il retrouve son panier et son adresse.
3. Stripe prévient le serveur par un **webhook** signé (`/admin/paiement/webhook/`) : c'est la seule preuve de paiement. La commande passe alors à « payée » et deux e-mails partent :
   - **pour vous** (adresse `COMMANDES_DESTINATAIRE`) : articles, couleurs, tailles, adresse de livraison et précision du client. Répondre à cet e-mail écrit directement au client ;
   - **pour le client** : confirmation de la commande et du paiement, avec le récapitulatif. S'il y répond, sa réponse arrive sur `COMMANDES_DESTINATAIRE`.

   Chaque envoi est noté dans le journal de l'application (« Commande BL-… : e-mail envoyé au client »), ou l'erreur s'il a échoué.

   Le texte de ces deux e-mails se modifie dans l'administration : voir « Modèles des e-mails de commande » ci-dessous.

Les commandes sont enregistrées dans la base de l'administration (`backend/db.sqlite3`). Les coordonnées d'un client qui abandonne le paiement sont effacées à l'expiration de la session (1 h).

**Modèles des e-mails de commande**

Dans l'administration, bouton **« E-mails de commande »** en haut du panneau (https://pprod.biboulab.fr/admin/emails/) :
- un onglet par e-mail : *Confirmation envoyée au client*, *Nouvelle commande, envoyée à vous* et *Colis expédié, envoyé au client* ;
- modifiez l'objet et le message, cliquez sur **Voir l'aperçu** (commande d'exemple, rien n'est envoyé), puis sur **Enregistrer**. Le nouveau texte sert dès la prochaine commande payée ;
- **Rétablir le modèle par défaut** efface votre version.

Le message est en texte simple. Les valeurs de la commande s'insèrent avec des variables entre doubles accolades, listées sous l'éditeur : `{{ nom }}`, `{{ ref }}`, `{{ total }}`, `{{ livraison.label }}`… Les articles se parcourent avec `{% for l in lignes %}- {{ l.quantite }} × {{ l.nom }} : {{ l.total }}{% endfor %}`, et un passage facultatif s'écrit `{% if note %}…{% endif %}`. Un modèle qui contient une erreur (balise non fermée, par exemple) est refusé à l'enregistrement, et votre texte est conservé pour que vous puissiez le corriger.

**Bandeau et logo** : chaque e-mail part en deux versions. La version HTML habille votre texte avec un bandeau sombre (logo Biboulab et slogan de `data.js`), un liseré aux couleurs du site et un pied de page. La version texte simple sert aux messageries qui n'affichent pas le HTML. Le logo est intégré à l'e-mail : il s'affiche sans que la messagerie ait à le télécharger depuis le site.
- Changer le logo : remplacez `backend/gestion/modeles_emails/logo-email.png` (PNG à fond transparent, environ 540 × 140 px, affiché sur 180 px de large).
- Changer la mise en page du bandeau ou du pied de page : `backend/gestion/modeles_emails/cadre.html` (styles écrits dans les balises, seule façon fiable pour Gmail et Outlook).

Les modèles modifiés sont enregistrés dans la base de l'administration (`backend/db.sqlite3`) : une mise à jour du site (`git pull`) ne les écrase jamais. Les modèles par défaut sont dans `backend/gestion/modeles_emails/`. En ligne de commande, `python manage.py apercu_emails` affiche les deux e-mails tels qu'ils partiraient.

**Livraison et expédition des commandes**

Deux modes de livraison sont proposés au client (Réglages › Livraison : nom, prix, délai, transporteur, liens) :
- **Mondial Relay en point relais** : le client choisit son Point Relais sur la carte du widget officiel Mondial Relay, directement dans le panier ; le point choisi (nom, numéro, adresse) est enregistré avec la commande (obligatoire, vérifié par le serveur). Le widget demande un code enseigne Mondial Relay (Réglages › Livraison). Sans code enseigne, ou si le widget ne se charge pas, le client ouvre l'outil de recherche du transporteur et recopie le nom et l'adresse du point dans le champ « Point de retrait choisi » ;
- **Colissimo à domicile**.

À chaque commande payée :
1. l'e-mail « Nouvelle commande » contient un bloc **« Pour l'étiquette »** : prénom, nom, adresse, code postal, ville, pays et e-mail séparés, à recopier champ par champ, plus le point de retrait choisi ;
2. achetez l'étiquette sur Colissimo en ligne (professionnels) ou sur l'espace pro Mondial Relay, puis déposez le colis (bureau de poste, consigne Pickup, Point Relais…) ;
3. dans l'administration, bouton **« Commandes »** (https://pprod.biboulab.fr/admin/commandes/) : chaque commande « À expédier » affiche ces coordonnées avec des boutons **Copier**. Collez le **numéro de suivi** et cliquez sur **Marquer comme expédiée et prévenir le client** : la commande passe dans « Expédiées » et le client reçoit l'e-mail « Colis expédié » avec le lien de suivi. Une faute de frappe se corrige avec **Corriger et renvoyer l'e-mail**.

Le lien de suivi vient du champ « Adresse de suivi du colis » du mode de livraison (`{numero}` y est remplacé par le numéro). **Vérifiez une fois** ces adresses et celles des pages de recherche de points (Réglages › Livraison) : ouvrez-les avec un vrai numéro de suivi, et corrigez-les si le transporteur a changé son site. Si vous aviez déjà personnalisé l'e-mail « Nouvelle commande », le bloc « Pour l'étiquette » n'y apparaît pas : cliquez sur **Rétablir le modèle par défaut**, ou ajoutez `{{ prenom }}`, `{{ nom_famille }}`, `{{ point_retrait }}` à votre version.

**Activer le paiement (à faire d'abord en préproduction, en mode test)**
1. Dashboard Stripe › **Développeurs › Clés API** : copiez la clé secrète (`sk_test_…` pour les essais). Possible aussi : une **clé restreinte** (`rk_…`) limitée à *Checkout Sessions : Écriture*, à essayer d'abord en préproduction.
2. Dashboard Stripe › **Workbench › onglet Webhooks** (lien direct : https://dashboard.stripe.com/webhooks) › **Créer une destination d'événement** :
   - source : **votre compte** ;
   - format des événements : **Snapshot** (et non « Thin ») : le site lit le contenu complet de l'événement ;
   - événements : `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired` ;
   - type de destination : **Endpoint de webhook**, URL : `https://pprod.biboulab.fr/admin/paiement/webhook/` (en production : `https://www.biboulab.fr/admin/paiement/webhook/`) ;
   - sur la page du webhook créé, cliquez sur **Révéler** pour copier le **secret de signature** (`whsec_…`).
3. cPanel › **Setup Python App** › votre application › *Environment variables* :
   - `STRIPE_SECRET_KEY` : la clé de l'étape 1 ;
   - `STRIPE_WEBHOOK_SECRET` : le secret de l'étape 2 ;
   - facultatif : `COMMANDES_DESTINATAIRE` (par défaut biboulab@outlook.fr), `CONTACT_DESTINATAIRE` (formulaire de contact, par défaut la même adresse) et `COMMANDES_EXPEDITEUR` (par défaut no-reply@biboulab.fr, à garder sur le domaine du site).
4. Mettez à jour l'administration (commande `git pull … migrate …` ci-dessus : elle installe la bibliothèque Stripe et crée la table des commandes), puis **Restart**.
5. Faites une commande sur la préproduction avec la carte de test `4242 4242 4242 4242` (date future, n'importe quel code). Vérifiez : retour sur le site avec « paiement confirmé », e-mail de commande reçu, paiement visible dans le Dashboard (Transactions).

**Réglages dans le Dashboard Stripe**
- *Paramètres › Moyens de paiement* : choisissez ce que vous proposez (carte, Apple Pay, Google Pay, Link…). Le site n'en impose aucun.
- *Paramètres › E-mails clients* : facultatif, « Paiements réussis » ajoute le reçu officiel de Stripe à la confirmation envoyée par le site (Stripe n'envoie jamais ce reçu en mode test).
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
| `assets/js/data.js` | **Le fichier des contenus** (modifiable depuis l'administration) : marque, slogan, liens, catégories, produits, avis, textes « À propos », livraison, informations légales et textes des pages légales (`PAGES`) |
| `assets/js/rich.js` | Mise en forme des textes des pages légales (paragraphes, puces, gras, liens, `{variables}`) |
| `assets/css/style.css` | Design et animations. Couleurs et polices en haut du fichier (section 1) |
| `assets/js/icons.js` | Icônes du site (catégories, boutons). Une ligne par icône |
| `outils/admin.html` | Page d'administration : catalogue, pages, réglages et suivi des commandes (voir ci-dessus) |
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
| `assets/js/contenu.js` | Pages et réglages écrits par l'administration en ligne (`null` = ceux de `data.js`) |

## À remplacer avant la mise en ligne

Tout se fait depuis l'administration (ou dans `data.js`) :

1. **Liens MakerWorld et Cults3D** : `SITE.stores` → remplacez `VOTRE_PSEUDO` dans les deux adresses.
2. **E-mail et nom de domaine** : `SITE.email`, `SITE.url`.
3. **Mentions légales** : Réglages › Informations légales (nom, SIRET, adresse, hébergeur, médiateur). Tant que le mode démonstration est actif, ces valeurs sont surlignées en orange sur les pages légales.
4. **Produits** : les 28 produits sont des exemples (noms, prix, descriptions).
5. **Avis clients** : `REVIEWS` contient des avis fictifs. Publier de faux avis est interdit : remplacez-les par de vrais retours, ou videz la liste.
6. **Chiffres de l'accueil** : `SITE.stats`.
7. Décochez ensuite **Réglages › Identité et contact › Mode démonstration** pour masquer les mentions « contenu d'exemple ».
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

**Lien direct vers un modèle** — ajoutez au produit `makerworld: "https://…"` et/ou `cults3d: "https://…"` ; sinon le bouton mène à votre profil.

**Logos officiels MakerWorld / Cults3D** — les pastilles « MW » et « C3D » sont des substituts. Téléchargez les logos officiels depuis les kits presse des plateformes, déposez-les dans `assets/img/` et renseignez `logo: "assets/img/makerworld.svg"` dans `SITE.stores`.

**Logo de la marque** — `SITE.logo: "assets/img/logo.svg"` remplace le logotype texte animé.

**Photos de l'atelier** — `ABOUT.photos[].src`.

**Catégories** — `CATEGORIES` : nom, couleurs, description, effet (`snow`, `fog`, `grid`, `glow`).

## Paiement et formulaires

- **Commande** : avec `payment.mode: "stripe"`, le client paie en ligne par Stripe Checkout (voir « Paiement en ligne (Stripe) »). Avec `payment.mode: "email"`, valider la commande ouvre la messagerie du client avec le récapitulatif et vous lui renvoyez un moyen de paiement ; aucun paiement n'est alors encaissé sur le site.
- **Contact** : le formulaire envoie directement un e-mail à la boîte de l'entreprise, sans ouvrir la messagerie du visiteur. Il passe par l'administration en ligne (adresse `/admin/contact/`, réglée dans Réglages › Identité et contact ou `SITE.formEndpoint`), qui envoie l'e-mail comme ceux des commandes : champs obligatoires, e-mail valide, champ piège anti-robots et 5 messages par heure et par visiteur au maximum. La boîte qui reçoit les messages est `CONTACT_DESTINATAIRE` (par défaut la même que `COMMANDES_DESTINATAIRE`) ; répondre au message écrit directement au visiteur. Avec le serveur local `node outils/serveur-local.js`, le formulaire affichera une erreur : l'envoi n'existe qu'en ligne.

## Animations et design : où régler quoi

| Effet | Où | Réglage |
|---|---|---|
| Palette, polices, arrondis | `style.css` section 1 | variables `--violet`, `--cyan`, `--orange`, `--bg`, `--font-d`, `--font-b`, `--r` |
| Préloader (logo « imprimé » couche par couche, 1,5 s, une fois par session) | `app.js` `initEntrance`, `style.css` section 4 | durée : `1450` (JS) et `1.15s` (CSS) |
| Hero : vase imprimé en temps réel, particules, sol en perspective | `pages.js` `heroCanvas` | `cycle` (durée), `N` (nombre de couches), `profile` (forme) |
| Titre mot par mot, mots en dégradé | `data.js` `hero.title` | entourez les mots d'`*étoiles*` |
| Bouton magnétique | attribut `data-magnetic` | force : `0.3` / `0.4` dans `magnetic()` |
| Cartes des univers (accueil) : au survol, les autres se floutent et le nom apparaît | `pages.js` `focusCard`, `style.css` section 8 ter | visuel : photo fixe `image` de la catégorie, sinon illustration |
| « Tout juste sortis du plateau » (accueil) : mur infini des 8 dernières créations à faire glisser, carte mise en avant au clic | `pages.js` `phantomGallery` | objet `CFG` (taille des cases, courbure, inertie) |
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
- **Point Relais Mondial Relay** : à l'étape « Livraison » du panier, le mode Mondial Relay en point relais affiche le widget officiel (carte OpenStreetMap) ; le point choisi est enregistré avec la commande. Renseignez votre code enseigne dans l'administration › Réglages › Livraison (`SITE.shipping.mondialRelayBrand`) : `BDTEST` est le code de démonstration et affiche un avertissement. Si le widget ne se charge pas, le client recopie le point à la main. Le widget n'est chargé (depuis `widget.mondialrelay.com`) que si le client choisit ce mode ; pensez à le mentionner dans la politique de confidentialité.
- **Polices** : chargées depuis Google Fonts (mentionné dans la politique de confidentialité). Pour une conformité RGPD plus stricte, hébergez-les vous-même dans `assets/`.
- **Référencement** : chaque page a son titre et sa description ; les fiches produits publient des données structurées `Product`. Le contenu étant généré en JavaScript, Google l'indexe, mais plus lentement qu'un site entièrement statique.
- **Mise en ligne** : déposez tout le dossier chez un hébergeur de sites statiques (Netlify, OVH, GitHub Pages, o2switch…). Les dossiers `outils/`, `backend/` et `.claude/` ne vont pas dans le dossier public (`backend/` s'installe à part, voir « Administration en ligne »).
