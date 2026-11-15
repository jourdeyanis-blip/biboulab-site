/* =====================================================================
   BIBOULAB — FICHIER DE DONNÉES CENTRAL
   ---------------------------------------------------------------------
   Tout ce qui se modifie souvent est ICI : textes, liens, catégories,
   produits, avis, mentions légales. Aucune autre page à toucher pour
   ajouter un produit ou changer un prix.
   Les éléments marqués  ⚠️ À REMPLACER  sont des valeurs d'exemple.
   ===================================================================== */

/* ---------- 1. Identité, liens et réglages généraux ---------- */
const SITE = {
  name: "Biboulab",
  slogan: "Du fichier à l'objet, imprimé avec passion",
  url: "https://www.biboulab.fr",                 // (sert au sitemap et au SEO)
  email: "contact@votre-domaine.fr",              // ⚠️ À REMPLACER
  logo: "",                                       // chemin d'une image de logo (ex. "assets/img/logo.svg"). Vide = logotype texte animé

  /* Boutiques externes — affichées dans le menu, le pied de page,
     l'accueil et chaque fiche produit. */
  stores: [
    { id: "makerworld", name: "MakerWorld", url: "https://makerworld.com/fr/@Honjou",
      color: "#00AE42", mono: "MW", logo: "", tagline: "Mes modèles à imprimer chez vous" },
    { id: "cults3d",    name: "Cults3D",    url: "https://cults3d.com/fr/users/yanou14/creations",
      color: "#A855F7", mono: "C3D", logo: "", tagline: "Mes fichiers STL et créations" }
    /* "logo" : déposez le logo officiel (kit presse de la plateforme) dans assets/img/
       puis indiquez son chemin ici, ex. "assets/img/makerworld.svg". */
  ],

  /* Accueil : les mots entre *étoiles* sont mis en dégradé néon. */
  hero: {
    eyebrow: "Atelier d'impression 3D · Bambu Lab",
    title: "Du fichier à *l'objet*, imprimé avec *passion*",
    lead: "Figurines, déco, pièces utiles et petites folies de saison : chaque objet est modélisé, imprimé couche par couche puis fini à la main dans mon atelier.",
    cta: "Explorer la boutique",
    cta2: "Demander une pièce sur mesure"
  },

  /* Compteurs animés de l'accueil — ⚠️ À REMPLACER par vos vrais chiffres */
  stats: [
    { value: 500, prefix: "+", suffix: "",  label: "pièces imprimées" },
    { value: 32,  prefix: "",  suffix: "",  label: "coloris de filament" },
    { value: 48,  prefix: "",  suffix: " h", label: "pour expédier" }
  ],

  marquee: ["Imprimé en 3D", "PLA", "PETG", "Fait main", "Sur mesure", "Livraison soignée", "Bambu Lab", "Petites séries"],

  /* Livraison */
  shipping: {
    freeFrom: 60, // livraison offerte à partir de ce montant (€)
    methods: [
      { id: "relais",   label: "Point Relais® Mondial Relay", price: 4.9, delay: "3 à 5 jours ouvrés", logo: "assets/img/mondial-relay.png" },
      { id: "domicile", label: "Livraison à domicile",        price: 6.9, delay: "2 à 3 jours ouvrés" }
    ],
    /* Widget Mondial Relay : affiché quand le client choisit le mode "relais".
       brand = votre code enseigne Mondial Relay (8 caractères, espaces compris).
       "BDTEST  " est le code de démonstration : remplacez-le par le vôtre. */
    mondialRelay: { brand: "BDTEST  ", country: "FR", colLivMod: "24R", nbResults: 7 }
  },

  /* Paiement.
     mode "email" : la commande est envoyée par e-mail et vous renvoyez un lien de
     paiement (fonctionne tout de suite, sans abonnement ni serveur).
     Voir LISEZ-MOI.md pour brancher Stripe ou PayPal ensuite. */
  payment: {
    mode: "email",
    methods: [
      { id: "lien",     label: "Lien de paiement sécurisé (carte bancaire)", note: "Envoyé par e-mail après validation de la commande" },
      { id: "paypal",   label: "PayPal",                                    note: "Demande de paiement envoyée par e-mail" },
      { id: "virement", label: "Virement bancaire",                         note: "RIB transmis par e-mail" }
    ]
  },

  /* Formulaire de contact : collez ici l'adresse d'un service de formulaires
     (ex. Formspree). Vide = le message s'ouvre dans la messagerie du visiteur. */
  formEndpoint: "",

  /* true = affiche les petites mentions "contenu d'exemple" (avis, chiffres).
     Passez à false quand vos vrais contenus sont en place. */
  demo: true,

  /* Mentions légales — ⚠️ TOUT EST À REMPLACER */
  legal: {
    owner: "Prénom NOM",
    status: "Entrepreneur individuel (micro-entreprise)",
    siret: "000 000 000 00000",
    address: "Adresse complète, Code postal Ville, France",
    phone: "00 00 00 00 00",
    host: "Nom de l'hébergeur, adresse de l'hébergeur, téléphone",
    mediator: "Nom du médiateur de la consommation — site web du médiateur",
    updated: "14 novembre 2026"
  }
};

/* ---------- 2. Couleurs de filament proposées ---------- */
const FILAMENTS = {
  noir: { name: "Noir", hex: "#1B1B22" }, blanc: { name: "Blanc", hex: "#F2F2F2" },
  rouge: { name: "Rouge", hex: "#E5383B" }, vert: { name: "Vert sapin", hex: "#2D9C5B" },
  or: { name: "Or soie", hex: "#D4AF37" }, violet: { name: "Violet", hex: "#8B5CF6" },
  cyan: { name: "Cyan", hex: "#22D3EE" }, orange: { name: "Orange", hex: "#FF7A1A" },
  gris: { name: "Gris", hex: "#8D99AE" }, bleu: { name: "Bleu", hex: "#3B82F6" },
  jaune: { name: "Jaune", hex: "#FACC15" }, neon: { name: "Vert néon", hex: "#39FF14" },
  arcenciel: { name: "Arc-en-ciel", hex: "linear-gradient(135deg,#ef4444,#f59e0b,#22c55e,#3b82f6,#a855f7)" }
};

/* ---------- 3. Catégories ----------
   slug : identifiant dans l'adresse (categorie.html?c=slug)
   icon : noel | figurine | deco | halloween | architecture | bureau | cuisine | reparation
   fx   : effet du bandeau — snow (flocons) | fog (brouillard) | grid (plan) | glow */
const CATEGORIES = [
  { slug: "noel", name: "Noël", icon: "noel", color: "#EF4444", color2: "#22C55E", fx: "snow",
    short: "Décorations, figurines et ornements de fêtes",
    description: "Boules ajourées, étoiles, petits villages lumineux… De quoi mettre un peu de magie imprimée dans le sapin et sur la table." },
  { slug: "figurine", name: "Figurine", icon: "figurine", color: "#8B5CF6", color2: "#C084FC", fx: "glow",
    short: "Personnages, figurines articulées, collection",
    description: "Créatures articulées imprimées d'une seule pièce, personnages et miniatures de collection. Ça bouge, ça clique, ça trône sur une étagère." },
  { slug: "decoration", name: "Décoration", icon: "deco", color: "#22D3EE", color2: "#38BDF8", fx: "glow",
    short: "Vases, lampes, supports, objets d'intérieur",
    description: "Vases torsadés, lampes diffusantes, cache-pots et objets d'intérieur aux géométries impossibles à fabriquer autrement." },
  { slug: "halloween", name: "Halloween", icon: "halloween", color: "#FF7A1A", color2: "#7C2D12", fx: "fog",
    short: "Objets effrayants et déco spooky",
    description: "Citrouilles grimaçantes, fantômes phosphorescents et araignées articulées. Frissons garantis, bonbons non fournis." },
  { slug: "architecture", name: "Architecture & Maquette", icon: "architecture", color: "#94A3B8", color2: "#3B82F6", fx: "grid",
    short: "Maquettes de bâtiments, décors, dioramas",
    description: "Maquettes de bâtiments, décors modulaires et éléments de diorama, imprimés en couche fine pour garder chaque détail." },
  { slug: "bureau", name: "Objet de bureau", icon: "bureau", color: "#3B82F6", color2: "#E0E7FF", fx: "glow",
    short: "Organisateurs, supports, accessoires de travail",
    description: "Supports de casque, organisateurs de câbles, pots à crayons : un setup rangé, c'est déjà 10 % de productivité en plus (source : moi)." },
  { slug: "cuisine", name: "Objet de cuisine", icon: "cuisine", color: "#FACC15", color2: "#FB923C", fx: "glow",
    short: "Ustensiles, supports, déco de cuisine",
    description: "Supports, pinces, range-épices et petites astuces du quotidien pour une cuisine mieux organisée." },
  { slug: "reparation", name: "Pièce de réparation", icon: "reparation", color: "#39FF14", color2: "#16A34A", fx: "grid",
    short: "Pièces détachées, clips, supports de remplacement",
    description: "Un clip cassé, une molette introuvable ? On répare au lieu de jeter. Pièces standard en stock et refabrication sur mesure." }
];

/* ---------- 4. Produits ----------
   Pour AJOUTER un produit : copiez un bloc { ... }, changez "id" (unique, sans espace ni accent).
   - category  : slug d'une catégorie ci-dessus
   - badge     : "new" (Nouveau), "best" (Best-seller) ou null
   - popularity: 0 à 100 (sert au tri "Popularité")
   - date      : date de mise en ligne AAAA-MM-JJ (sert au tri "Nouveautés")
   - colors    : clés de FILAMENTS
   - sizes     : [] si taille unique, sinon [{ label, extra }] (extra = supplément en €)
   - images    : chemins de vos photos (WebP conseillé). Vide = visuel d'illustration généré
   - model3d   : chemin d'un fichier .glb pour la visionneuse 3D (facultatif)
   - makerworld / cults3d : lien direct vers le modèle sur la plateforme (facultatif)
   ⚠️ Tous les produits ci-dessous sont des EXEMPLES à remplacer. */
const PRODUCTS = [
  /* ----- Noël ----- */
  { id: "boule-flocon", name: "Boule de Noël Flocon ajouré", category: "noel", price: 6.9, badge: "best", popularity: 96, date: "2026-10-20",
    short: "Une boule légère comme un flocon, à suspendre au sapin.",
    description: "Structure ajourée inspirée des cristaux de neige, imprimée sans support pour une surface nette. Livrée avec son ruban. Résiste aux chutes de sapin et aux chats curieux.",
    colors: ["blanc", "rouge", "or", "vert"], sizes: [{ label: "Ø 6 cm", extra: 0 }, { label: "Ø 8 cm", extra: 2 }],
    material: "PLA", printTime: "2 h 30", dimensions: "Ø 6 ou 8 cm", weight: "14 g", images: [], model3d: "" },
  { id: "sapin-spirale", name: "Sapin spirale de table", category: "noel", price: 14.9, badge: "new", popularity: 78, date: "2026-11-05",
    short: "Un sapin torsadé qui tient sur un coin de bureau.",
    description: "Imprimé en mode vase d'un seul filament continu, ce sapin capte la lumière sur chacune de ses couches. Glissez une bougie LED dessous pour l'effet lanterne.",
    colors: ["vert", "blanc", "or"], sizes: [{ label: "15 cm", extra: 0 }, { label: "22 cm", extra: 6 }],
    material: "PLA soie", printTime: "4 h", dimensions: "15 × 9 cm", weight: "48 g", images: [], model3d: "" },
  { id: "renne-articule", name: "Renne articulé", category: "noel", price: 12.5, badge: null, popularity: 84, date: "2026-10-28",
    short: "Un renne qui remue, imprimé d'une seule pièce.",
    description: "Pattes, cou et queue articulés, sans aucun assemblage. Parfait en cadeau d'assiette ou en compagnon de calendrier de l'Avent.",
    colors: ["rouge", "blanc", "or"], sizes: [],
    material: "PLA", printTime: "3 h 15", dimensions: "11 × 5 × 8 cm", weight: "32 g", images: [], model3d: "" },
  { id: "etoile-cime", name: "Étoile de cime géométrique", category: "noel", price: 9.9, badge: null, popularity: 61, date: "2026-10-12",
    short: "L'étoile low-poly qui coiffe le sapin.",
    description: "Facettes nettes, base conique qui s'adapte à toutes les cimes. Compatible avec une petite guirlande LED glissée à l'intérieur.",
    colors: ["or", "blanc", "rouge"], sizes: [],
    material: "PLA soie", printTime: "3 h", dimensions: "16 × 16 × 5 cm", weight: "38 g", images: [], model3d: "" },

  /* ----- Figurine ----- */
  { id: "dragon-articule", name: "Dragon articulé", category: "figurine", price: 18.9, badge: "best", popularity: 99, date: "2026-08-14",
    short: "Quarante segments mobiles, zéro assemblage.",
    description: "Le grand classique de l'atelier : un dragon entièrement articulé, imprimé en une seule fois. Il ondule, s'enroule autour d'un écran et fait un excellent anti-stress.",
    colors: ["arcenciel", "violet", "noir", "rouge"], sizes: [{ label: "30 cm", extra: 0 }, { label: "45 cm", extra: 9 }],
    material: "PLA soie", printTime: "7 h", dimensions: "30 × 6 × 5 cm", weight: "85 g", images: [], model3d: "" },
  { id: "axolotl-flexi", name: "Axolotl flexi", category: "figurine", price: 11.9, badge: "new", popularity: 88, date: "2026-11-02",
    short: "Mignon, souple et un peu trop souriant.",
    description: "Petit axolotl articulé aux branchies détaillées. Il tient dans une poche et se tortille dès qu'on le touche.",
    colors: ["violet", "cyan", "blanc", "orange"], sizes: [],
    material: "PLA", printTime: "2 h 45", dimensions: "13 × 6 × 3 cm", weight: "26 g", images: [], model3d: "" },
  { id: "robot-bolt", name: "Robot Bolt à poser", category: "figurine", price: 15.9, badge: null, popularity: 72, date: "2026-09-18",
    short: "Un petit robot posable, bras et tête mobiles.",
    description: "Bolt est né un soir d'insomnie. Rotules clipsées, antenne souple, regard perplexe : il garde vos post-it et juge vos commits.",
    colors: ["gris", "orange", "cyan"], sizes: [],
    material: "PLA", printTime: "5 h", dimensions: "9 × 7 × 12 cm", weight: "54 g", images: [], model3d: "" },
  { id: "chevalier-mini", name: "Chevalier miniature 54 mm", category: "figurine", price: 8.5, badge: null, popularity: 58, date: "2026-07-30",
    short: "Miniature à peindre, détails en couche de 0,08 mm.",
    description: "Figurine imprimée en couche extra-fine, livrée non peinte avec son socle. Idéale pour le jeu de rôle, le diorama ou l'initiation à la peinture.",
    colors: ["gris", "blanc"], sizes: [],
    material: "PLA", printTime: "3 h 30", dimensions: "54 mm de haut", weight: "9 g", images: [], model3d: "" },

  /* ----- Décoration ----- */
  { id: "vase-torsade", name: "Vase torsadé Hélix", category: "decoration", price: 22.0, badge: "best", popularity: 93, date: "2026-09-02",
    short: "Une torsade continue qui joue avec la lumière.",
    description: "Imprimé en mode spirale, sans couture visible. Pour fleurs séchées, ou fleurs fraîches avec un tube en verre glissé à l'intérieur.",
    colors: ["blanc", "cyan", "violet", "or"], sizes: [{ label: "18 cm", extra: 0 }, { label: "25 cm", extra: 8 }],
    material: "PETG", printTime: "5 h 30", dimensions: "18 × 10 cm", weight: "110 g", images: [], model3d: "" },
  { id: "lampe-lune", name: "Lampe Lune lithophane", category: "decoration", price: 34.9, badge: "new", popularity: 86, date: "2026-11-08",
    short: "La Lune, cratères compris, sur votre table de chevet.",
    description: "Le relief lunaire apparaît par transparence quand la lampe s'allume. Livrée avec socle et module LED USB à lumière chaude.",
    colors: ["blanc"], sizes: [{ label: "Ø 12 cm", extra: 0 }, { label: "Ø 16 cm", extra: 12 }],
    material: "PLA blanc", printTime: "14 h", dimensions: "Ø 12 cm + socle", weight: "190 g", images: [], model3d: "" },
  { id: "cache-pot-voronoi", name: "Cache-pot Voronoï", category: "decoration", price: 16.5, badge: null, popularity: 67, date: "2026-08-22",
    short: "Un motif cellulaire pour vos plantes grasses.",
    description: "Motif organique généré par algorithme, différent sur chaque face. Fond plein avec coupelle intégrée.",
    colors: ["blanc", "noir", "vert", "cyan"], sizes: [],
    material: "PETG", printTime: "6 h", dimensions: "11 × 11 × 10 cm", weight: "95 g", images: [], model3d: "" },

  /* ----- Halloween ----- */
  { id: "citrouille-grimace", name: "Citrouille Grimace", category: "halloween", price: 13.9, badge: "best", popularity: 90, date: "2026-09-25",
    short: "Lanterne citrouille au sourire douteux.",
    description: "Visage découpé et parois fines pour laisser passer la lumière d'une bougie LED (fournie). Ne pourrit pas le 2 novembre.",
    colors: ["orange", "noir", "violet"], sizes: [],
    material: "PLA", printTime: "5 h", dimensions: "11 × 11 × 10 cm", weight: "78 g", images: [], model3d: "" },
  { id: "fantome-phospho", name: "Fantôme phosphorescent", category: "halloween", price: 7.9, badge: "new", popularity: 82, date: "2026-10-01",
    short: "Il brille dans le noir. Vraiment.",
    description: "Imprimé en filament phosphorescent : rechargez-le à la lumière, éteignez, sursautez. Vendu à l'unité ou en bande de trois.",
    colors: ["blanc"], sizes: [{ label: "À l'unité", extra: 0 }, { label: "Lot de 3", extra: 12 }],
    material: "PLA phosphorescent", printTime: "1 h 45", dimensions: "6 × 5 × 8 cm", weight: "18 g", images: [], model3d: "" },
  { id: "araignee-articulee", name: "Araignée articulée XL", category: "halloween", price: 10.9, badge: null, popularity: 74, date: "2026-09-12",
    short: "Huit pattes mobiles, effet garanti sur la porte.",
    description: "Pattes articulées imprimées en place, abdomen texturé. Assez légère pour tenir avec un morceau d'adhésif.",
    colors: ["noir", "orange", "violet"], sizes: [],
    material: "PLA", printTime: "3 h", dimensions: "18 × 18 × 3 cm", weight: "35 g", images: [], model3d: "" },
  { id: "crane-bougeoir", name: "Bougeoir Crâne", category: "halloween", price: 12.0, badge: null, popularity: 55, date: "2026-08-30",
    short: "Un crâne low-poly pour bougie chauffe-plat LED.",
    description: "Facettes anguleuses et orbites ajourées. À utiliser uniquement avec une bougie LED : le PLA et les flammes ne sont pas amis.",
    colors: ["noir", "blanc", "gris"], sizes: [],
    material: "PLA", printTime: "4 h", dimensions: "9 × 11 × 9 cm", weight: "70 g", images: [], model3d: "" },

  /* ----- Architecture & Maquette ----- */
  { id: "maison-colombages", name: "Maison à colombages 1:87", category: "architecture", price: 29.9, badge: "best", popularity: 77, date: "2026-07-18",
    short: "Décor HO détaillé, toit amovible.",
    description: "Maison à pans de bois à l'échelle HO, imprimée en couche de 0,12 mm. Toit amovible pour installer un éclairage. Livrée non peinte.",
    colors: ["gris", "blanc"], sizes: [],
    material: "PLA", printTime: "11 h", dimensions: "10 × 8 × 12 cm", weight: "120 g", images: [], model3d: "" },
  { id: "ruines-modulaires", name: "Ruines modulaires (lot de 6)", category: "architecture", price: 24.5, badge: null, popularity: 69, date: "2026-08-05",
    short: "Murs et arches emboîtables pour vos dioramas.",
    description: "Six éléments de ruines compatibles entre eux : murs, angle, arche et colonnes brisées. Parfaits pour le jeu de figurines 28 mm.",
    colors: ["gris"], sizes: [],
    material: "PLA", printTime: "9 h", dimensions: "Éléments de 5 à 12 cm", weight: "160 g", images: [], model3d: "" },
  { id: "tour-skyline", name: "Skyline de ville personnalisable", category: "architecture", price: 39.0, badge: "new", popularity: 64, date: "2026-10-30",
    short: "La silhouette de votre ville, en relief.",
    description: "Indiquez votre ville à la commande : je modélise sa ligne d'horizon et l'imprime sur socle gravé. Délai de création d'environ une semaine.",
    colors: ["noir", "blanc", "gris", "bleu"], sizes: [{ label: "20 cm", extra: 0 }, { label: "30 cm", extra: 15 }],
    material: "PLA mat", printTime: "8 h", dimensions: "20 × 4 × 9 cm", weight: "130 g", images: [], model3d: "" },

  /* ----- Objet de bureau ----- */
  { id: "support-casque", name: "Support de casque Arc", category: "bureau", price: 19.9, badge: "best", popularity: 91, date: "2026-08-10",
    short: "Votre casque mérite mieux que le coin de l'écran.",
    description: "Arche large qui ne marque pas l'arceau, base lestée et passe-câble intégré. Stable même avec un casque de 400 g.",
    colors: ["noir", "blanc", "bleu", "violet"], sizes: [],
    material: "PETG", printTime: "8 h", dimensions: "12 × 12 × 26 cm", weight: "210 g", images: [], model3d: "" },
  { id: "organiseur-hexa", name: "Organiseur Hexa modulable", category: "bureau", price: 17.5, badge: null, popularity: 80, date: "2026-09-08",
    short: "Des alvéoles qui s'emboîtent à l'infini.",
    description: "Lot de quatre modules hexagonaux aimantés : crayons, clés USB, trombones. Ajoutez des modules quand le bazar gagne du terrain.",
    colors: ["blanc", "bleu", "noir", "cyan"], sizes: [{ label: "4 modules", extra: 0 }, { label: "7 modules", extra: 10 }],
    material: "PLA", printTime: "6 h", dimensions: "Module : 7 × 8 × 9 cm", weight: "150 g", images: [], model3d: "" },
  { id: "clips-cables", name: "Clips passe-câbles (lot de 5)", category: "bureau", price: 6.5, badge: null, popularity: 73, date: "2026-07-25",
    short: "Fini les câbles qui tombent derrière le bureau.",
    description: "Clips adhésifs à fente souple pour câbles USB et de charge. Adhésif double face fourni.",
    colors: ["noir", "blanc", "gris"], sizes: [],
    material: "PETG", printTime: "1 h 30", dimensions: "3 × 2 × 1,5 cm", weight: "15 g", images: [], model3d: "" },
  { id: "dock-telephone", name: "Dock téléphone incliné", category: "bureau", price: 11.0, badge: "new", popularity: 68, date: "2026-11-01",
    short: "L'angle parfait pour les visios.",
    description: "Inclinaison à 65°, passage du câble de charge par l'arrière, patins antidérapants. Compatible avec la plupart des coques.",
    colors: ["noir", "blanc", "orange", "bleu"], sizes: [],
    material: "PLA", printTime: "3 h", dimensions: "8 × 9 × 10 cm", weight: "60 g", images: [], model3d: "" },

  /* ----- Objet de cuisine ----- */
  { id: "range-epices", name: "Range-épices à gradins", category: "cuisine", price: 21.0, badge: "best", popularity: 79, date: "2026-08-18",
    short: "Trois niveaux pour enfin voir le paprika.",
    description: "Présentoir en gradins pour douze pots standards. S'installe dans un placard ou sur le plan de travail.",
    colors: ["blanc", "noir", "jaune"], sizes: [],
    material: "PETG", printTime: "9 h", dimensions: "30 × 15 × 9 cm", weight: "230 g", images: [], model3d: "" },
  { id: "pince-sachet", name: "Pinces à sachets (lot de 4)", category: "cuisine", price: 7.5, badge: null, popularity: 71, date: "2026-09-15",
    short: "Le ressort est imprimé dedans. Oui, dedans.",
    description: "Pinces à charnière souple imprimées d'une pièce : aucun ressort métallique à perdre. Quatre couleurs assorties.",
    colors: ["jaune", "orange", "blanc", "rouge"], sizes: [],
    material: "PETG", printTime: "2 h", dimensions: "9 × 2 × 2 cm", weight: "28 g", images: [], model3d: "" },
  { id: "support-eponge", name: "Support éponge drainant", category: "cuisine", price: 9.0, badge: "new", popularity: 62, date: "2026-10-22",
    short: "L'éponge sèche, l'évier respire.",
    description: "Grille inclinée et bac récupérateur amovible. Se nettoie d'un coup d'eau tiède (pas de lave-vaisselle).",
    colors: ["blanc", "gris", "jaune"], sizes: [],
    material: "PETG", printTime: "3 h 30", dimensions: "12 × 8 × 5 cm", weight: "55 g", images: [], model3d: "" },

  /* ----- Pièce de réparation ----- */
  { id: "clip-lave-vaisselle", name: "Roulette de panier lave-vaisselle", category: "reparation", price: 5.9, badge: "best", popularity: 83, date: "2026-07-12",
    short: "La roulette qui casse toujours, en mieux.",
    description: "Roulette de remplacement avec axe renforcé. Indiquez la marque et la référence de votre appareil à la commande pour vérifier la compatibilité.",
    colors: ["gris", "blanc"], sizes: [{ label: "À l'unité", extra: 0 }, { label: "Lot de 4", extra: 10 }],
    material: "PETG", printTime: "45 min", dimensions: "Ø 4 cm", weight: "8 g", images: [], model3d: "" },
  { id: "molette-four", name: "Bouton de réglage universel", category: "reparation", price: 6.9, badge: null, popularity: 66, date: "2026-08-01",
    short: "Pour four, plaque ou gazinière orpheline.",
    description: "Bouton à axe en D de 6 mm, adaptable sur demande. Imprimé en PETG pour mieux tenir la chaleur ambiante d'une façade.",
    colors: ["noir", "blanc", "gris"], sizes: [],
    material: "PETG", printTime: "1 h", dimensions: "Ø 4 × 3 cm", weight: "12 g", images: [], model3d: "" },
  { id: "piece-sur-mesure", name: "Pièce de rechange sur mesure", category: "reparation", price: 15.0, badge: "new", popularity: 87, date: "2026-11-10",
    short: "Envoyez une photo, je refabrique la pièce.",
    description: "Clip, cache, patte de fixation, engrenage… Envoyez-moi photos et cotes via le formulaire de contact : je modélise la pièce et vous l'imprime. Prix de départ, devis gratuit selon la complexité.",
    colors: ["noir", "blanc", "gris", "neon"], sizes: [],
    material: "PETG ou PLA selon l'usage", printTime: "Sur devis", dimensions: "Sur mesure", weight: "Variable", images: [], model3d: "" }
];

/* ---------- 5. Avis clients ----------
   ⚠️ AVIS D'EXEMPLE : la loi interdit de publier de faux avis.
   Liste vidée : la section « Avis clients » n'est pas affichée tant que la liste est vide.
   Ajoutez-y de vrais retours clients ({ name, product, stars, text }) quand vous en avez. */
const REVIEWS = [];

/* ---------- 6. Page « À propos » ---------- */
const ABOUT = {
  title: "Un atelier, une imprimante, beaucoup de bobines",
  story: [
    "Tout a commencé avec une pièce cassée et l'envie têtue de la refaire moi-même. Une imprimante plus tard, je ne réparais plus seulement : j'inventais, je testais, j'offrais.",
    "Aujourd'hui, Biboulab est une micro-entreprise où chaque objet passe entre mes mains : je modélise, je règle, j'imprime sur ma Bambu Lab, puis je contrôle et je finis chaque pièce avant de l'emballer.",
    "Pas de stock dormant ni de production à la chaîne : de petites séries, des couleurs choisies, et du sur-mesure dès que vous avez une idée."
  ],
  /* Photos de l'atelier : indiquez vos fichiers dans "src". Vide = visuel d'illustration. */
  photos: [
    { src: "", alt: "Mon imprimante Bambu Lab en cours d'impression", caption: "La Bambu Lab au travail" },
    { src: "", alt: "Le mur de bobines de filament de l'atelier", caption: "Le mur de bobines" },
    { src: "", alt: "Finition à la main d'une pièce imprimée", caption: "Finition à la main" }
  ],
  /* Frise animée : du modèle 3D à la finition */
  process: [
    { title: "L'idée", text: "Un besoin, une envie, un croquis sur un coin de carnet — ou votre demande de personnalisation." },
    { title: "La modélisation 3D", text: "Je dessine la pièce en volume, je prévois les tolérances, les articulations et le sens d'impression." },
    { title: "Le tranchage", text: "Le modèle est découpé en centaines de couches. Je choisis matière, remplissage et hauteur de couche selon l'usage." },
    { title: "L'impression", text: "La Bambu Lab dépose le filament fondu couche après couche. De 45 minutes à plus de 14 heures selon la pièce." },
    { title: "La finition", text: "Retrait des supports, ébavurage, contrôle des articulations. Chaque pièce est vérifiée à la main." },
    { title: "L'expédition", text: "Emballage protecteur, petit mot dans le colis, et c'est parti vers votre boîte aux lettres." }
  ]
};

/* ---------- Export (ne pas modifier) ---------- */
const SHOP = { SITE, FILAMENTS, CATEGORIES, PRODUCTS, REVIEWS, ABOUT };
if (typeof window !== "undefined") window.SHOP = SHOP;
if (typeof module !== "undefined") module.exports = SHOP;
