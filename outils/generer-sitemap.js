/* Régénère sitemap.xml et robots.txt à partir de data.js.
   À relancer après avoir ajouté des produits ou changé SITE.url :
       node outils/generer-sitemap.js                                   */
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
const { SITE, CATEGORIES, PRODUCTS } = require(path.join(root, "assets/js/data.js"));

const base = SITE.url.replace(/\/$/, "");
const today = new Date().toISOString().slice(0, 10);
const urls = [
  ["", 1.0], ["boutique.html", 0.9],
  ...CATEGORIES.map((c) => [`categorie.html?c=${c.slug}`, 0.8]),
  ...PRODUCTS.map((p) => [`produit.html?id=${p.id}`, 0.7]),
  ["a-propos.html", 0.5], ["contact.html", 0.5],
  ["mentions-legales.html", 0.2], ["cgv.html", 0.2], ["confidentialite.html", 0.2], ["retractation.html", 0.2]
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([u, pr]) => `  <url><loc>${base}/${u.replace(/&/g, "&amp;")}</loc><lastmod>${today}</lastmod><priority>${pr.toFixed(1)}</priority></url>`).join("\n")}
</urlset>
`;
fs.writeFileSync(path.join(root, "sitemap.xml"), xml);
fs.writeFileSync(path.join(root, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /panier.html\nDisallow: /outils/\nDisallow: /api/\n\nSitemap: ${base}/sitemap.xml\n`);
console.log(`sitemap.xml : ${urls.length} adresses (${base})`);
