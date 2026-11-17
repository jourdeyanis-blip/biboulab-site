/* Petit serveur local pour prévisualiser le site ET le gérer :
       node outils/serveur-local.js
   puis ouvrir  http://localhost:4173          (le site)
           ou   http://localhost:4173/admin    (catalogue et suivi des commandes)

   La page de gestion enregistre directement dans assets/js/data.js, et le
   suivi des commandes dans outils/commandes.json (données clients : ce
   fichier n'est jamais mis en ligne ni envoyé sur GitHub).
   Elle ne fonctionne que sur cet ordinateur : rien de tout cela n'existe
   sur le site en ligne.                                                  */
const http = require("http"), fs = require("fs"), path = require("path"), vm = require("vm");
const { execFile } = require("child_process");
const crypto = require("crypto");
const root = path.join(__dirname, "..");
const port = process.env.PORT || 4173;
const dataFile = path.join(root, "assets/js/data.js");
const backupDir = path.join(__dirname, "sauvegardes");
const photoDir = path.join(root, "assets/img/produits");
const ordersFile = path.join(__dirname, "commandes.json");
const siteFile = path.join(__dirname, "site.json"); // adresse du site en ligne + clé secrète (jamais sur GitHub)
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

function save(categories, products) {
  const problem = check(categories, products);
  if (problem) throw new Error(problem);
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
  const reC = /const CATEGORIES = \[[\s\S]*?\n\];/, reP = /const PRODUCTS = \[[\s\S]*?\n\];/;
  if (!reC.test(before) || !reP.test(before)) throw new Error("data.js n'a plus la forme attendue : les blocs CATEGORIES et PRODUCTS sont introuvables.");
  const after = before.replace(reC, () => catsJs).replace(reP, () => prodsJs);

  /* On vérifie que le nouveau fichier se lit correctement avant de remplacer l'ancien */
  const box = { module: { exports: null } };
  vm.runInNewContext(after, box);
  const out = box.module.exports;
  if (!out || out.PRODUCTS.length !== products.length || out.CATEGORIES.length !== categories.length) throw new Error("Le fichier généré est incohérent, rien n'a été modifié.");

  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
  fs.writeFileSync(path.join(backupDir, `data-${stamp}.js`), before);
  const old = fs.readdirSync(backupDir).filter((f) => /^data-.*\.js$/.test(f)).sort();
  old.slice(0, Math.max(0, old.length - 30)).forEach((f) => fs.unlinkSync(path.join(backupDir, f))); // on garde les 30 dernières
  fs.writeFileSync(dataFile, after);
  execFile(process.execPath, [path.join(__dirname, "generer-sitemap.js")], () => {}); // sitemap à jour
}

/* ---------- Suivi des commandes : outils/commandes.json ---------- */
const STEPS = ["commande", "impression", "livrer", "livree"];
function loadOrders() {
  try { return JSON.parse(fs.readFileSync(ordersFile, "utf8")); }
  catch (e) { if (e.code === "ENOENT") return []; throw new Error("commandes.json est illisible : corrigez-le ou reprenez une copie dans outils/sauvegardes/."); }
}
function saveOrders(orders) {
  if (!Array.isArray(orders)) throw new Error("Liste de commandes invalide.");
  const ids = new Set();
  for (const o of orders) {
    if (!o || typeof o.id !== "string" || !o.id || ids.has(o.id)) throw new Error("Une commande n'a pas d'identifiant unique.");
    if (!STEPS.includes(o.status)) throw new Error(`Étape inconnue pour la commande « ${o.ref || o.id} ».`);
    if (!Array.isArray(o.items)) throw new Error(`La commande « ${o.ref || o.id} » est incomplète.`);
    ids.add(o.id);
  }
  /* Une copie par jour de l'état précédent, les 30 derniers jours */
  if (fs.existsSync(ordersFile)) {
    fs.mkdirSync(backupDir, { recursive: true });
    const daily = path.join(backupDir, `commandes-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.json`);
    if (!fs.existsSync(daily)) fs.copyFileSync(ordersFile, daily);
    const old = fs.readdirSync(backupDir).filter((f) => /^commandes-.*\.json$/.test(f)).sort();
    old.slice(0, Math.max(0, old.length - 30)).forEach((f) => fs.unlinkSync(path.join(backupDir, f)));
  }
  const tmp = ordersFile + ".tmp"; // écrit à côté puis renommé : jamais de fichier à moitié écrit
  fs.writeFileSync(tmp, JSON.stringify(orders, null, 2) + "\n");
  fs.renameSync(tmp, ordersFile);
}

/* ---------- Commandes passées sur le site en ligne (api/commandes.php) ---------- */
function siteConf() {
  let conf = {};
  try { conf = JSON.parse(fs.readFileSync(siteFile, "utf8")); } catch (e) { /* pas encore relié */ }
  if (!conf.url) { // par défaut : SITE.url de data.js
    try { const box = { module: { exports: null } }; vm.runInNewContext(fs.readFileSync(dataFile, "utf8"), box); conf.url = box.module.exports.SITE.url; } catch (e) { conf.url = ""; }
  }
  return { url: conf.url || "", cle: conf.cle || "" };
}
async function remote(method, query, body) {
  const conf = siteConf();
  if (!conf.url || !conf.cle) throw new Error("Reliez d'abord le site à la page de gestion (bouton « Relier au site »).");
  if (typeof fetch !== "function") throw new Error("Node.js 18 ou plus récent est nécessaire pour récupérer les commandes du site.");
  const url = conf.url.replace(/\/+$/, "") + "/api/commandes.php" + query;
  let r;
  try {
    r = await fetch(url, { method, headers: { "X-Cle": conf.cle, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000) });
  } catch (e) { throw new Error(`Le site ${conf.url} ne répond pas. Vérifiez la connexion internet et l'adresse du site.`); }
  const out = await r.json().catch(() => null);
  if (r.status === 401) throw new Error("Le site refuse la clé. Vérifiez le secret CLE_COMMANDES sur GitHub, puis republiez le site.");
  if (!out) throw new Error(r.status === 503 ? "Le site est en construction ou indisponible (erreur 503)."
    : r.status === 404 ? "Le site ne reçoit pas encore les commandes : publiez la dernière version (dossier api/)."
    : `Réponse inattendue du site (erreur ${r.status}).`);
  if (!r.ok) throw new Error(out.erreur || `Erreur ${r.status} du site.`);
  return out;
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

async function api(req, res, url) {
  if (url.pathname === "/api/etat" && req.method === "GET") return send(res, 200, { ok: true });
  if (!trusted(req)) return send(res, 403, { erreur: "Action réservée à la page de gestion locale." });
  if (url.pathname === "/api/commandes" && req.method === "GET") {
    try { return send(res, 200, { commandes: loadOrders() }); } catch (e) { return send(res, 500, { erreur: e.message }); }
  }
  if (url.pathname === "/api/site" && req.method === "GET") return send(res, 200, siteConf());
  if (url.pathname === "/api/site/commandes" && req.method === "GET") {
    try { return send(res, 200, await remote("GET", "")); } catch (e) { return send(res, 502, { erreur: e.message }); }
  }
  if (req.method !== "POST") return send(res, 405, { erreur: "Action inconnue." });
  try {
    if (url.pathname === "/api/site") { // enregistre l'adresse du site ; « nouvelle » crée une clé
      const d = JSON.parse((await read(req, 1e4)).toString("utf8"));
      const conf = siteConf(), adresse = String(d.url || "").trim().replace(/\/+$/, "");
      if (!/^https?:\/\/[^\s/]+(\/[^\s]*)?$/.test(adresse)) return send(res, 400, { erreur: "Adresse du site invalide (ex. https://www.biboulab.fr)." });
      const next = { url: adresse, cle: d.nouvelle || !conf.cle ? crypto.randomBytes(32).toString("base64url") : conf.cle };
      fs.writeFileSync(siteFile, JSON.stringify(next, null, 2) + "\n", { mode: 0o600 });
      return send(res, 200, next);
    }
    if (url.pathname === "/api/site/accuse") {
      const { refs } = JSON.parse((await read(req, 1e5)).toString("utf8"));
      try { return send(res, 200, await remote("POST", "?action=accuse", { refs })); } catch (e) { return send(res, 502, { erreur: e.message }); }
    }
    if (url.pathname === "/api/commandes") {
      const { commandes } = JSON.parse((await read(req, 8e6)).toString("utf8"));
      saveOrders(commandes);
      return send(res, 200, { ok: true });
    }
    if (url.pathname === "/api/sauver") {
      const { categories, products } = JSON.parse((await read(req, 5e6)).toString("utf8"));
      save(categories, products);
      return send(res, 200, { ok: true });
    }
    if (url.pathname === "/api/photo") {
      const name = path.basename(url.searchParams.get("nom") || "");
      if (!/^[a-z0-9][a-z0-9-]*\.(webp|png|jpe?g)$/.test(name)) return send(res, 400, { erreur: "Nom de photo invalide." });
      const data = await read(req, 12e6);
      fs.mkdirSync(photoDir, { recursive: true });
      fs.writeFileSync(path.join(photoDir, name), data);
      return send(res, 200, { ok: true, chemin: `assets/img/produits/${name}` });
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
  /* Dans outils/, seule la page de gestion est servie : commandes.json et les
     sauvegardes contiennent des données clients (comparaison sans casse pour macOS/Windows) */
  const low = file.toLowerCase(), tools = __dirname.toLowerCase() + path.sep;
  if (low.startsWith(tools) && low !== path.join(__dirname, "admin.html").toLowerCase()) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("Page introuvable"); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("Page introuvable"); }
    res.writeHead(200, { "Content-Type": types[path.extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(data);
  });
}).listen(port, () => console.log(`Site :    http://localhost:${port}\nGestion : http://localhost:${port}/admin  (onglet Commandes : http://localhost:${port}/admin#commandes)`));
