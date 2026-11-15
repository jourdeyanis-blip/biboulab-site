/* Petit serveur local pour prévisualiser le site ET le gérer :
       node outils/serveur-local.js
   puis ouvrir  http://localhost:4173          (le site)
           ou   http://localhost:4173/admin    (ajouter catégories et objets)

   La page de gestion enregistre directement dans assets/js/data.js.
   Elle ne fonctionne que sur cet ordinateur. L'administration du site en
   ligne utilise la même page, servie par l'application Django du dossier
   backend/ (mot de passe + code à usage unique).                    */
const http = require("http"), fs = require("fs"), path = require("path"), vm = require("vm");
const { execFile } = require("child_process");
const root = path.join(__dirname, "..");
const port = process.env.PORT || 4173;
const dataFile = path.join(root, "assets/js/data.js");
const backupDir = path.join(__dirname, "sauvegardes");
const photoDir = path.join(root, "assets/img/produits");
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
  if (req.method !== "POST" || !trusted(req)) return send(res, 403, { erreur: "Action réservée à la page de gestion locale." });
  try {
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
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("Page introuvable"); }
    res.writeHead(200, { "Content-Type": types[path.extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(data);
  });
}).listen(port, () => console.log(`Site :    http://localhost:${port}\nGestion : http://localhost:${port}/admin`));
