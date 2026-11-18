/* Petit serveur local pour prévisualiser le site ET le gérer :
       node outils/serveur-local.js
   puis ouvrir  http://localhost:4173          (le site)
           ou   http://localhost:4173/admin    (catégories, objets, pages, réglages)

   La page de gestion enregistre directement dans assets/js/data.js
   (et recopie titres et descriptions des pages légales dans leur HTML).
   Elle ne fonctionne que sur cet ordinateur. L'administration du site en
   ligne utilise la même page, servie par l'application Django du dossier
   backend/ (identifiant + mot de passe), qui écrit catalogue.js et contenu.js. */
const http = require("http"), fs = require("fs"), path = require("path"), vm = require("vm");
const { execFile } = require("child_process");
const root = path.join(__dirname, "..");
const port = process.env.PORT || 4173;
const dataFile = path.join(root, "assets/js/data.js");
const backupDir = path.join(__dirname, "sauvegardes");
const suiviFile = path.join(__dirname, "suivi.json"); // tableau « Suivi commande » (noms et adresses : jamais sur GitHub)
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".xml": "application/xml", ".txt": "text/plain; charset=utf-8", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".glb": "model/gltf-binary", ".woff2": "font/woff2", ".woff": "font/woff" };

/* ---------- Écriture de data.js ---------- */
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const isKey = (k) => /^[A-Za-z_$][\w$]*$/.test(k);
const js = (v) => {
  if (Array.isArray(v)) return `[${v.map(js).join(", ")}]`;
  if (v && typeof v === "object") { const e = Object.entries(v); return e.length ? `{ ${e.map(([k, x]) => `${isKey(k) ? k : JSON.stringify(k)}: ${js(x)}`).join(", ")} }` : "{}"; }
  return v === undefined ? "null" : JSON.stringify(v);
};
/* Un objet par bloc, réparti sur quelques lignes lisibles (même présentation qu'à la main) */
function layout(obj, rows) {
  const known = new Set(rows.flat());
  const all = rows.map((r) => r.filter((k) => k in obj));
  all[all.length - 1].push(...Object.keys(obj).filter((k) => !known.has(k)));
  return "  { " + all.filter((r) => r.length).map((r) => r.map((k) => `${k}: ${js(obj[k])}`).join(", ")).join(",\n    ") + " }";
}
const CAT_ROWS = [["slug", "name", "parent", "icon", "color", "color2", "fx"], ["short"], ["description"]];
const PROD_ROWS = [["id", "name", "category", "price", "badge", "popularity", "date"], ["short"], ["description"], ["colors", "sizes"], ["material", "printTime", "dimensions", "weight", "images", "model3d"]];

function check(categories, products) {
  if (!Array.isArray(categories) || !Array.isArray(products)) return "Données incomplètes.";
  if (!categories.length) return "Il faut au moins une catégorie.";
  const slugs = new Set();
  for (const c of categories) {
    if (!c || !ID.test(c.slug || "")) return `Identifiant de catégorie invalide : « ${c && c.slug} » (minuscules, chiffres et tirets).`;
    if (slugs.has(c.slug)) return `Deux catégories portent l'identifiant « ${c.slug} ».`;
    if (!String(c.name || "").trim()) return `La catégorie « ${c.slug} » n'a pas de nom.`;
    slugs.add(c.slug);
  }
  for (const c of categories) { // sous-catégories : la parente doit exister, sans boucle
    if (c.parent === undefined || c.parent === null || c.parent === "") { delete c.parent; continue; }
    if (!slugs.has(c.parent)) return `La catégorie « ${c.name} » est rangée dans une catégorie qui n'existe pas.`;
    const seen = new Set([c.slug]);
    for (let x = c; x && x.parent; x = categories.find((k) => k.slug === x.parent)) {
      if (seen.has(x.parent)) return `La catégorie « ${c.name} » est rangée dans l'une de ses propres sous-catégories.`;
      seen.add(x.parent);
    }
  }
  const ids = new Set();
  for (const p of products) {
    if (!p || !ID.test(p.id || "")) return `Identifiant d'objet invalide : « ${p && p.id} » (minuscules, chiffres et tirets).`;
    if (ids.has(p.id)) return `Deux objets portent l'identifiant « ${p.id} ».`;
    if (!String(p.name || "").trim()) return `L'objet « ${p.id} » n'a pas de nom.`;
    if (!slugs.has(p.category)) return `L'objet « ${p.name} » est rangé dans une catégorie qui n'existe pas.`;
    if (typeof p.price !== "number" || !(p.price >= 0)) return `Le prix de « ${p.name} » n'est pas valide.`;
    if (!Array.isArray(p.colors) || !Array.isArray(p.sizes) || !Array.isArray(p.images)) return `L'objet « ${p.name} » est incomplet.`;
    ids.add(p.id);
  }
  return "";
}

/* Écriture lisible d'une valeur : sur une ligne si elle est courte, sinon dépliée */
function pretty(v, ind = "") {
  const flat = js(v);
  if (!v || typeof v !== "object" || ind.length + flat.length <= 110) return flat;
  const ni = ind + "  ";
  if (Array.isArray(v)) return `[\n${v.map((x) => ni + pretty(x, ni)).join(",\n")}\n${ind}]`;
  return `{\n${Object.entries(v).map(([k, x]) => `${ni}${isKey(k) ? k : JSON.stringify(k)}: ${pretty(x, ni)}`).join(",\n")}\n${ind}}`;
}

/* Contrôle des réglages, pages, couleurs et avis envoyés par la page de gestion */
const str = (v) => typeof v === "string";
function checkContent({ site, filaments, reviews, about, pages }, products) {
  if (!site || !str(site.name) || !site.name.trim()) return "Le nom de la boutique est obligatoire.";
  if (!str(site.email) || !str(site.url) || !site.legal || typeof site.legal !== "object") return "Réglages incomplets.";
  for (const k of ["stores", "stats", "marquee"]) if (!Array.isArray(site[k])) return "Réglages incomplets.";
  if (!site.hero || !site.shipping || !Array.isArray(site.shipping.methods) || !site.payment || !Array.isArray(site.payment.methods)) return "Réglages incomplets.";
  if (!site.shipping.methods.length) return "Il faut au moins un mode de livraison.";
  if (!site.payment.methods.length) return "Il faut au moins un moyen de paiement.";
  for (const list of [site.shipping.methods, site.payment.methods, site.stores]) {
    const seen = new Set();
    for (const m of list) {
      if (!m || !ID.test(m.id || "")) return `Identifiant invalide : « ${m && m.id} » (minuscules, chiffres et tirets).`;
      if (seen.has(m.id)) return `Deux éléments portent l'identifiant « ${m.id} ».`;
      seen.add(m.id);
    }
  }
  if (!filaments || typeof filaments !== "object" || !Object.keys(filaments).length) return "Il faut au moins une couleur de filament.";
  for (const [k, f] of Object.entries(filaments)) if (!/^[a-z0-9]+$/.test(k) || !f || !str(f.name) || !str(f.hex)) return `Couleur de filament invalide : « ${k} ».`;
  for (const p of products) for (const c of p.colors) if (!(c in filaments)) return `L'objet « ${p.name} » utilise la couleur « ${c} », qui n'existe plus.`;
  if (!Array.isArray(reviews)) return "Avis incomplets.";
  for (const r of reviews) if (!r || !str(r.name) || !(r.stars >= 1 && r.stars <= 5)) return "Un avis client est incomplet (nom et note de 1 à 5).";
  if (!about || !str(about.title) || !Array.isArray(about.story) || !Array.isArray(about.photos) || !about.photos.length || !Array.isArray(about.process)) return "Page « À propos » incomplète.";
  if (!pages || typeof pages !== "object") return "Pages incomplètes.";
  for (const [k, d] of Object.entries(pages)) {
    if (!LEGAL_FILES.includes(k)) return `Page inconnue : « ${k} ».`;
    if (!d || !str(d.title) || !d.title.trim() || !Array.isArray(d.sections)) return `La page « ${k} » est incomplète.`;
  }
  return "";
}
const LEGAL_FILES = ["mentions-legales", "cgv", "confidentialite", "retractation"];

/* Titre et description des pages légales : on les recopie dans l'en-tête HTML (référencement) */
const attr = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function syncHeads(pages, siteName) {
  for (const [k, d] of Object.entries(pages)) {
    const file = path.join(root, k + ".html");
    if (!fs.existsSync(file)) continue;
    const before = fs.readFileSync(file, "utf8"), title = attr(`${d.title} | ${siteName}`), desc = attr(d.description || "");
    const after = before
      .replace(/<title>[^<]*<\/title>/, () => `<title>${title}</title>`)
      .replace(/(<meta name="description" content=")[^"]*(")/, (m, a, b) => a + desc + b)
      .replace(/(<meta property="og:title" content=")[^"]*(")/, (m, a, b) => a + title + b)
      .replace(/(<meta property="og:description" content=")[^"]*(")/, (m, a, b) => a + desc + b);
    if (after !== before) fs.writeFileSync(file, after);
  }
}

function save(payload) {
  const { categories, products } = payload;
  const problem = check(categories, products) || checkContent(payload, products);
  if (problem) throw new Error(problem);
  const { site, filaments, reviews, about, pages } = payload;
  const before = fs.readFileSync(dataFile, "utf8");
  const catsJs = `const CATEGORIES = [\n${categories.map((c) => layout(c, CAT_ROWS)).join(",\n")}\n];`;
  const names = Object.fromEntries(categories.map((c) => [c.slug, c.name]));
  const order = categories.map((c) => c.slug);
  const sorted = [...products].sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category));
  let last = null;
  const prodsJs = `const PRODUCTS = [\n${sorted.map((p, i) => {
    const head = p.category !== last ? `${i ? "\n" : ""}  /* ----- ${names[p.category]} ----- */\n` : "";
    last = p.category;
    return head + layout(p, PROD_ROWS);
  }).join(",\n")}\n];`;
  const blocks = [
    [/const SITE = \{[\s\S]*?\n\};/, `const SITE = ${pretty(site)};`],
    [/const FILAMENTS = \{[\s\S]*?\n\};/, `const FILAMENTS = {\n${Object.entries(filaments).map(([k, f]) => `  ${k}: ${js(f)}`).join(",\n")}\n};`],
    [/const CATEGORIES = \[[\s\S]*?\n\];/, catsJs],
    [/const PRODUCTS = \[[\s\S]*?\n\];/, prodsJs],
    [/const REVIEWS = (?:\[\]|\[[\s\S]*?\n\]);/, `const REVIEWS = ${reviews.length ? `[\n${reviews.map((r) => "  " + js(r)).join(",\n")}\n]` : "[]"};`],
    [/const ABOUT = \{[\s\S]*?\n\};/, `const ABOUT = ${pretty(about)};`],
    [/const PAGES = \{[\s\S]*?\n\};/, `const PAGES = ${pretty(pages)};`]
  ];
  let after = before;
  for (const [re, txt] of blocks) {
    if (!re.test(after)) throw new Error(`data.js n'a plus la forme attendue : le bloc ${txt.slice(6, txt.indexOf(" ="))} est introuvable.`);
    after = after.replace(re, () => txt);
  }

  /* On vérifie que le nouveau fichier se lit correctement avant de remplacer l'ancien */
  const box = { module: { exports: null } };
  vm.runInNewContext(after, box);
  const out = box.module.exports;
  if (!out || out.PRODUCTS.length !== products.length || out.CATEGORIES.length !== categories.length
    || JSON.stringify(out.SITE) !== JSON.stringify(site) || JSON.stringify(out.PAGES) !== JSON.stringify(pages) || JSON.stringify(out.ABOUT) !== JSON.stringify(about))
    throw new Error("Le fichier généré est incohérent, rien n'a été modifié.");

  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
  fs.writeFileSync(path.join(backupDir, `data-${stamp}.js`), before);
  const old = fs.readdirSync(backupDir).filter((f) => /^data-.*\.js$/.test(f)).sort();
  old.slice(0, Math.max(0, old.length - 30)).forEach((f) => fs.unlinkSync(path.join(backupDir, f))); // on garde les 30 dernières
  fs.writeFileSync(dataFile, after);
  syncHeads(pages, site.name);
  execFile(process.execPath, [path.join(__dirname, "generer-sitemap.js")], () => {}); // sitemap à jour
}

/* ---------- Requêtes de la page de gestion ---------- */
const send = (res, code, obj) => { res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); res.end(JSON.stringify(obj)); };
const read = (req, max) => new Promise((ok, ko) => {
  const parts = []; let size = 0;
  req.on("data", (d) => { size += d.length; if (size > max) { ko(new Error("Fichier trop lourd.")); req.destroy(); } else parts.push(d); });
  req.on("end", () => ok(Buffer.concat(parts))); req.on("error", ko);
});
/* Seule la page de gestion ouverte sur cet ordinateur peut écrire */
const trusted = (req) => ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress)
  && /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(req.headers.host || "")
  && req.headers["x-biboulab-admin"] === "1";

/* ---------- Tableau « Suivi commande » ---------- */
const ETAPES = ["commande", "impression", "livrer", "livree"];
const COULEURS = ["vert", "jaune", "orange", "rouge", "rose", "violet", "bleu", "cyan", "gris"];
async function suivi(req, res) {
  if (!trusted(req)) return send(res, 403, { erreur: "Action réservée à la page de gestion locale." });
  let cur = { tickets: [], etiquettes: [], version: 0 };
  try { cur = JSON.parse(fs.readFileSync(suiviFile, "utf8")); }
  catch (e) { if (e.code !== "ENOENT") return send(res, 500, { erreur: "outils/suivi.json est illisible." }); }
  if (req.method === "GET") return send(res, 200, cur);
  if (req.method !== "POST") return send(res, 405, { erreur: "Action inconnue." });
  try {
    const { tickets, etiquettes, version } = JSON.parse((await read(req, 4e6)).toString("utf8"));
    const ids = new Set(), tags = new Set();
    const ok = Array.isArray(tickets) && tickets.every((t) => t && typeof t.id === "string" && t.id && !ids.has(t.id) && ids.add(t.id) && ETAPES.includes(t.status) && Array.isArray(t.items)
      && (t.labels === undefined || (Array.isArray(t.labels) && t.labels.every((x) => typeof x === "string"))));
    const okTags = etiquettes === undefined || (Array.isArray(etiquettes) && etiquettes.length <= 200 && etiquettes.every((e) => e && typeof e.id === "string" && e.id && !tags.has(e.id)
      && tags.add(e.id) && typeof e.name === "string" && e.name.length <= 40 && COULEURS.includes(e.color)));
    if (!ok || !okTags) return send(res, 400, { erreur: "Tableau invalide." });
    if (version !== cur.version) return send(res, 409, { erreur: "Le tableau a été modifié dans un autre onglet. Rechargez la page pour retrouver la dernière version.", version: cur.version });
    const next = { tickets, etiquettes: etiquettes === undefined ? cur.etiquettes || [] : etiquettes, version: cur.version + 1 };
    fs.writeFileSync(suiviFile + ".tmp", JSON.stringify(next, null, 2) + "\n");
    fs.renameSync(suiviFile + ".tmp", suiviFile); // jamais de fichier à moitié écrit
    send(res, 200, { ok: true, version: next.version });
  } catch (e) { send(res, 400, { erreur: e.message || "Enregistrement impossible." }); }
}

async function api(req, res, url) {
  if (url.pathname === "/api/etat" && req.method === "GET") return send(res, 200, { ok: true });
  if (url.pathname === "/api/suivi") return suivi(req, res);
  if (req.method !== "POST" || !trusted(req)) return send(res, 403, { erreur: "Action réservée à la page de gestion locale." });
  try {
    if (url.pathname === "/api/sauver") {
      save(JSON.parse((await read(req, 8e6)).toString("utf8")));
      return send(res, 200, { ok: true });
    }
    if (url.pathname === "/api/photo") {
      const name = path.basename(url.searchParams.get("nom") || "");
      if (!/^[a-z0-9][a-z0-9-]*\.(webp|png|jpe?g)$/.test(name)) return send(res, 400, { erreur: "Nom de photo invalide." });
      const folder = url.searchParams.get("dossier") === "atelier" ? "atelier" : "produits"; // photos d'objets ou de l'atelier
      const data = await read(req, 12e6);
      fs.mkdirSync(path.join(root, "assets/img", folder), { recursive: true });
      fs.writeFileSync(path.join(root, "assets/img", folder, name), data);
      return send(res, 200, { ok: true, chemin: `assets/img/${folder}/${name}` });
    }
    send(res, 404, { erreur: "Action inconnue." });
  } catch (e) { send(res, 400, { erreur: e.message || "Enregistrement impossible." }); }
}

http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname.startsWith("/api/")) return api(req, res, url);
  if (url.pathname === "/admin" || url.pathname === "/admin/") { res.writeHead(302, { Location: "/outils/admin.html" }); return res.end(); }
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith("/")) rel += "index.html";
  const file = path.join(root, path.normalize(rel));
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  /* Dans outils/, seule la page de gestion est servie (suivi.json contient des noms et adresses) */
  const low = file.toLowerCase();
  if (low.startsWith(__dirname.toLowerCase() + path.sep) && low !== path.join(__dirname, "admin.html").toLowerCase()) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("Page introuvable"); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("Page introuvable"); }
    res.writeHead(200, { "Content-Type": types[path.extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(data);
  });
}).listen(port, () => console.log(`Site :    http://localhost:${port}\nGestion : http://localhost:${port}/admin`));
