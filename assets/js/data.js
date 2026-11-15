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
  email: "biboulab@outlook.fr",
  logo: "",                                       // chemin d'une image de logo (ex. "assets/img/logo.svg"). Vide = logotype texte animé

  /* Boutiques externes — affichées dans le menu, le pied de page,
     l'accueil et chaque fiche produit. */
  stores: [
    { id: "makerworld", name: "MakerWorld", url: "https://makerworld.com/fr",
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
      { id: "lettre",    label: "Lettre suivie",          price: 3.9, delay: "2 à 4 jours ouvrés" },
      { id: "relais",    label: "Point relais",           price: 4.9, delay: "3 à 5 jours ouvrés" },
      { id: "colissimo", label: "Colissimo à domicile",   price: 6.9, delay: "2 à 3 jours ouvrés" }
    ]
  },

  /* Paiement.
     mode "stripe" : le client paie en ligne sur la page sécurisée de Stripe (carte,
       Apple Pay, Google Pay… selon les réglages du Dashboard Stripe). Nécessite
       l'administration en ligne (backend/) configurée avec les clés Stripe : voir
       LISEZ-MOI.md, « Paiement en ligne (Stripe) ».
     mode "email"  : la commande est envoyée par e-mail et vous renvoyez un lien de
       paiement (sans serveur). La liste "methods" ne sert que dans ce mode. */
  payment: {
    mode: "stripe",
    endpoint: "/admin/paiement/",   // adresse de l'administration en ligne (Django)
    methods: [
      { id: "lien",     label: "Lien de paiement sécurisé (carte bancaire)", note: "Envoyé par e-mail après validation de la commande" },
      { id: "paypal",   label: "PayPal",                                    note: "Demande de paiement envoyée par e-mail" },
      { id: "virement", label: "Virement bancaire",                         note: "RIB transmis par e-mail" }
    ]
  },

  /* Formulaire de contact : adresse qui reçoit le formulaire et l'envoie par
     e-mail à l'entreprise (administration en ligne Django : /admin/contact/).
     Vide = le message s'ouvre dans la messagerie du visiteur. */
  formEndpoint: "/admin/contact/",

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
    vat: "TVA non applicable, art. 293 B du CGI",
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
  /* ⚠️ À COMPLÉTER : prix, couleurs, tailles, matière, temps, dimensions et poids sont
     provisoires (la page MakerWorld n'a pas pu être lue). Vérifiez-les sur le modèle réel. */
  { id: "bol-bonhomme-de-neige", name: "Bol Bonhomme de neige", category: "noel", price: 12.9, badge: "new", popularity: 70, date: "2026-11-15",
    short: "Un bol en forme de bonhomme de neige, pour grignoter en mode hiver.",
    description: "Un bol imprimé en 3D sur le thème du bonhomme de neige : sourire, nez carotte et petit air de fête. Parfait pour servir des bonbons, des chocolats ou des mandarines sur la table de Noël, ou comme vide-poche déco. Modèle conçu pour une impression nette et facile à nettoyer à la main. Non adapté au lave-vaisselle, au micro-ondes ni au contact alimentaire direct : utilisez un papier ou un sachet pour les aliments non emballés.",
    colors: ["blanc", "rouge", "bleu"], sizes: [],
    material: "PLA", printTime: "À confirmer", dimensions: "À confirmer", weight: "À confirmer", images: [], model3d: "",
    makerworld: "https://makerworld.com/fr/models/1963222-snowman-bowl" },

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
  kicker: "À propos",
  title: "Un atelier, une imprimante, beaucoup de bobines",
  cta: "Parler de votre projet",
  photosKicker: "L'atelier en images",
  photosTitle: "Ma Bambu Lab et ses bobines",
  processKicker: "Le process",
  processTitle: "Du modèle 3D à *la finition*",   // les mots entre *étoiles* sont en dégradé
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

/* ---------- 7. Pages légales ----------
   Modifiables depuis l'administration (onglet « Pages »).
   Dans les textes : ligne vide = paragraphe, « - » = puce, **gras**, [lien](page.html),
   et {owner}, {siret}, {address}, {email}… = valeurs des réglages (voir assets/js/rich.js). */
const PAGES = {
  "mentions-legales": {
    menu: "Mentions légales",
    kicker: "Informations légales",
    title: "Mentions légales",
    description: "Mentions légales du site Biboulab : éditeur, SIRET, hébergeur et propriété intellectuelle.",
    sections: [
      { title: "Éditeur du site", box: true, text: "**{name}** — {owner}, {status}\nSIRET : {siret}\nAdresse : {address}\nTéléphone : {phone}\nE-mail : {email}\nTVA non applicable, article 293 B du Code général des impôts.\n\nDirecteur de la publication : {owner}." },
      { title: "Hébergeur", box: false, text: "{host}" },
      { title: "Propriété intellectuelle", box: false, text: "Les textes, photographies, visuels et modèles 3D présentés sur ce site sont, sauf mention contraire, la propriété de {owner}. Toute reproduction ou réutilisation sans autorisation écrite préalable est interdite." },
      { title: "Liens externes", box: false, text: "Ce site contient des liens vers des plateformes tierces (MakerWorld, Cults3D). Ces sites disposent de leurs propres conditions d'utilisation et politiques de confidentialité, sur lesquelles {name} n'exerce aucun contrôle." },
      { title: "Médiation de la consommation", box: false, text: "Conformément à l'article L612-1 du Code de la consommation, tout consommateur peut recourir gratuitement à un médiateur en cas de litige non résolu à l'amiable : {mediator}." },
      { title: "Contact", box: false, text: "Pour toute question : {email} ou via la [page de contact](contact.html)." }
    ]
  },
  cgv: {
    menu: "Conditions générales de vente",
    kicker: "Informations légales",
    title: "Conditions générales de vente",
    description: "Conditions générales de vente Biboulab : commande, prix, paiement, livraison, droit de rétractation et garanties légales.",
    sections: [
      { title: "1. Objet", box: false, text: "Les présentes conditions régissent les ventes conclues entre {name} ({owner}, {status}, SIRET {siret}, {address}), ci-après « le vendeur », et toute personne effectuant un achat sur ce site, ci-après « le client ». Toute commande implique l'acceptation sans réserve des présentes conditions." },
      { title: "2. Produits", box: false, text: "Les produits sont des objets fabriqués par impression 3D, en petites séries ou à la commande. Ce procédé artisanal peut laisser apparaître de fines lignes de couches et de légères variations de teinte ou d'aspect par rapport aux visuels du site, qui ne constituent pas des défauts.\n\nSauf mention contraire sur la fiche produit, les objets ne sont pas destinés au contact alimentaire, ne sont pas des jouets pour enfants de moins de 3 ans et ne doivent pas être exposés à une forte chaleur (au-delà de 50 °C environ pour le PLA)." },
      { title: "3. Prix", box: false, text: "Les prix sont indiqués en euros. TVA non applicable, article 293 B du Code général des impôts. Les frais de livraison sont indiqués avant la validation de la commande. Le vendeur peut modifier ses prix à tout moment ; le prix applicable est celui affiché lors de la validation de la commande." },
      { title: "4. Commande", box: false, text: "Le client sélectionne ses articles, renseigne ses coordonnées de livraison, choisit un mode de livraison et de paiement, puis valide sa commande après avoir accepté les présentes conditions. La vente est conclue à la confirmation de la commande par le vendeur, envoyée par e-mail." },
      { title: "5. Paiement", box: false, text: "Le paiement est exigible à la commande, par l'un des moyens proposés lors de la validation. La fabrication débute à réception du paiement. Les produits restent la propriété du vendeur jusqu'au paiement complet." },
      { title: "6. Fabrication et livraison", box: false, text: "Les produits étant fabriqués à la commande, un délai de fabrication s'ajoute au délai de transport ; il est indiqué sur chaque fiche produit. Modes de livraison proposés en France métropolitaine : {methods}. La livraison est offerte à partir de {freeFrom} d'achat. À défaut de délai indiqué, la livraison intervient au plus tard 30 jours après la commande.\n\nEn cas de colis endommagé, le client est invité à émettre des réserves auprès du transporteur et à prévenir le vendeur sous 3 jours, photos à l'appui." },
      { title: "7. Droit de rétractation", box: false, text: "Le client consommateur dispose de 14 jours à compter de la réception pour se rétracter, sans avoir à motiver sa décision. Ce droit ne s'applique pas aux biens confectionnés selon les spécifications du client ou nettement personnalisés (article L221-28, 3° du Code de la consommation). Les modalités et le formulaire figurent sur la page [Droit de rétractation](retractation.html)." },
      { title: "8. Garanties légales", box: false, text: "Le client bénéficie de la garantie légale de conformité (articles L217-3 et suivants du Code de la consommation), pendant deux ans à compter de la délivrance du bien, et de la garantie des vices cachés (articles 1641 à 1649 du Code civil). Pour les mettre en œuvre, contactez le vendeur à l'adresse {email}." },
      { title: "9. Responsabilité", box: false, text: "Le vendeur ne saurait être tenu responsable d'un usage du produit non conforme à sa destination ou aux précautions indiquées sur la fiche produit. Pour les pièces de réparation, il appartient au client de vérifier la compatibilité avec son appareil avant l'installation." },
      { title: "10. Données personnelles", box: false, text: "Les données collectées sont nécessaires au traitement des commandes. Voir la [politique de confidentialité](confidentialite.html)." },
      { title: "11. Litiges et médiation", box: false, text: "Les présentes conditions sont soumises au droit français. En cas de litige, le client s'adresse d'abord au vendeur pour rechercher une solution amiable. À défaut, il peut saisir gratuitement le médiateur de la consommation : {mediator}." }
    ]
  },
  confidentialite: {
    menu: "Confidentialité & cookies",
    kicker: "Informations légales",
    title: "Confidentialité et cookies",
    description: "Politique de confidentialité et de cookies Biboulab : données collectées, finalités, durées de conservation et droits RGPD.",
    sections: [
      { title: "Responsable du traitement", box: false, text: "{owner} — {name}, {address}. Contact : {email}." },
      { title: "Données collectées et finalités", box: false, text: "- **Formulaire de contact** : nom, e-mail, contenu du message — pour répondre à votre demande (base légale : votre consentement).\n- **Commande** : nom, prénom, adresse postale, e-mail, détail de la commande — pour préparer, expédier et facturer votre commande (base légale : exécution du contrat et obligations comptables).\n\nAucune donnée n'est vendue ni utilisée à des fins publicitaires." },
      { title: "Destinataires", box: false, text: "Vos données sont traitées par {owner} uniquement, et transmises aux seuls prestataires nécessaires : transporteur, prestataire de paiement, hébergeur du site et service de messagerie." },
      { title: "Durées de conservation", box: false, text: "- Demandes de contact : 3 ans maximum après le dernier échange.\n- Commandes et factures : 10 ans (obligation comptable)." },
      { title: "Vos droits", box: false, text: "Conformément au RGPD et à la loi Informatique et Libertés, vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité de vos données. Pour l'exercer, écrivez à {email}. Vous pouvez également introduire une réclamation auprès de la CNIL (www.cnil.fr)." },
      { title: "Cookies et stockage local", box: false, text: "Ce site ne dépose **aucun cookie publicitaire ni traceur de mesure d'audience**. Il utilise uniquement le stockage local de votre navigateur, strictement nécessaire au fonctionnement :\n\n- le contenu de votre panier ;\n- votre préférence de thème (clair ou sombre) ;\n- votre choix concernant les cookies.\n\nCes informations restent sur votre appareil et ne nous sont pas transmises. Vous pouvez les effacer à tout moment depuis les réglages de votre navigateur, et revoir votre choix via le lien « Gérer les cookies » en bas de page." },
      { title: "Services tiers", box: false, text: "Les polices de caractères sont chargées depuis Google Fonts : votre adresse IP est techniquement transmise à Google lors de ce chargement. Les liens vers MakerWorld et Cults3D mènent vers des sites tiers qui appliquent leurs propres politiques." }
    ]
  },
  retractation: {
    menu: "Droit de rétractation",
    kicker: "Informations légales",
    title: "Droit de rétractation",
    description: "Droit de rétractation Biboulab : délai de 14 jours, modalités de retour, exceptions pour les produits personnalisés et modèle de formulaire.",
    sections: [
      { title: "Votre droit", box: false, text: "Vous avez le droit de vous rétracter de votre commande, sans donner de motif, dans un délai de **14 jours** à compter du jour où vous (ou un tiers désigné par vous, autre que le transporteur) prenez physiquement possession du bien." },
      { title: "Comment l'exercer", box: false, text: "Informez-nous de votre décision par une déclaration dénuée d'ambiguïté, par e-mail à {email} ou par courrier à : {owner}, {address}. Vous pouvez utiliser le modèle de formulaire ci-dessous, sans obligation." },
      { title: "Retour et remboursement", box: false, text: "- Renvoyez le bien, dans son état d'origine, au plus tard 14 jours après nous avoir communiqué votre décision.\n- Les frais directs de renvoi sont à votre charge.\n- Nous vous remboursons l'ensemble des sommes versées, y compris les frais de livraison standard, au plus tard 14 jours après avoir été informés de votre décision. Le remboursement peut être différé jusqu'à réception du bien ou d'une preuve d'expédition.\n- Le remboursement utilise le même moyen de paiement que celui de la commande, sauf accord différent de votre part." },
      { title: "Exceptions", box: false, text: "Conformément à l'article L221-28, 3° du Code de la consommation, le droit de rétractation ne s'applique pas aux biens **confectionnés selon vos spécifications ou nettement personnalisés** : pièces sur mesure, modélisations à la demande, gravures et personnalisations." },
      { title: "Modèle de formulaire de rétractation", box: true, text: "À l'attention de {owner} — {name}, {address} — {email}\n\nJe vous notifie par la présente ma rétractation du contrat portant sur la vente du bien ci-dessous :\n\nCommandé le : ……………… / reçu le : ………………\nNuméro de commande : ………………\nNom du client : ………………\nAdresse du client : ………………\n\nDate : ………………\nSignature (uniquement en cas de notification sur papier) :" }
    ]
  }
};

/* ---------- Export (ne pas modifier) ---------- */
/* Si l'administration en ligne a enregistré un catalogue (assets/js/catalogue.js) ou des
   contenus (assets/js/contenu.js : réglages, pages, couleurs, avis), ils remplacent ceux-ci. */
const LIVE = typeof window !== "undefined" && window.CATALOGUE && window.CATALOGUE.categories && window.CATALOGUE.products ? window.CATALOGUE : null;
const LIVE_C = typeof window !== "undefined" && window.CONTENU && typeof window.CONTENU === "object" ? window.CONTENU : {};
const SHOP = {
  SITE: LIVE_C.site || SITE, FILAMENTS: LIVE_C.filaments || FILAMENTS,
  CATEGORIES: LIVE ? LIVE.categories : CATEGORIES, PRODUCTS: LIVE ? LIVE.products : PRODUCTS,
  REVIEWS: LIVE_C.reviews || REVIEWS, ABOUT: LIVE_C.about || ABOUT, PAGES: LIVE_C.pages || PAGES
};
if (typeof window !== "undefined") window.SHOP = SHOP;
if (typeof module !== "undefined") module.exports = SHOP;
