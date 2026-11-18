/* =====================================================================
   Mise en forme des textes des pages (mentions légales, CGV…)
   Utilisée par le site ET par la page d'administration.

   Syntaxe, volontairement simple :
     - une ligne vide           → nouveau paragraphe
     - un retour à la ligne     → retour à la ligne dans le paragraphe
     - « - » en début de ligne  → liste à puces
     - « ### Titre »            → petit intertitre
     - **texte**                → gras
     - [texte](adresse)         → lien (ex. [CGV](cgv.html))
     - {owner}, {siret}…        → remplacé par la valeur des réglages
   ===================================================================== */
(() => {
  "use strict";
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const euro = (n) => (+n || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
  const safeUrl = (u) => /^(https?:\/\/|mailto:|tel:|#|[\w-]+\.html(?:[?#].*)?$)/i.test(u);

  /* Les {variables} disponibles dans les textes, avec leur description (affichée dans l'admin) */
  const VARS = {
    name: "Nom de la boutique", owner: "Nom de l'exploitant", status: "Statut juridique", siret: "SIRET",
    address: "Adresse", phone: "Téléphone", email: "E-mail (lien cliquable)", host: "Hébergeur",
    mediator: "Médiateur de la consommation", vat: "Mention TVA", updated: "Date de mise à jour",
    url: "Adresse du site", freeFrom: "Seuil de livraison offerte", methods: "Modes de livraison et tarifs"
  };

  function values(SITE) {
    const L = SITE.legal || {}, S = SITE.shipping || { methods: [] };
    return { ...L, name: SITE.name, email: SITE.email, url: SITE.url, freeFrom: euro(S.freeFrom),
      methods: (S.methods || []).map((m) => `${m.label} (${euro(m.price)}, ${m.delay})`).join(" ; ") };
  }

  /* demo : surligne les valeurs légales encore à remplacer */
  function render(text, SITE) {
    const v = values(SITE), L = SITE.legal || {};
    const fill = (k) => {
      if (!(k in v)) return null;
      if (k === "email") return `<a href="mailto:${esc(v.email)}">${esc(v.email)}</a>`;
      const todo = SITE.demo && k in L && k !== "updated" && k !== "status";
      return todo ? `<span class="todo" title="Valeur d'exemple à remplacer dans l'administration (Réglages › Informations légales)">${esc(v[k])}</span>` : esc(v[k]);
    };
    const inline = (s) => esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => {
        const raw = u.replace(/&amp;/g, "&");
        return safeUrl(raw) ? `<a href="${u}"${/^https?:/i.test(raw) ? ' target="_blank" rel="noopener"' : ""}>${t}</a>` : m;
      })
      .replace(/\{(\w+)\}/g, (m, k) => fill(k) ?? m);
    return String(text || "").replace(/\r/g, "").split(/\n\s*\n/).map((block) => {
      const lines = block.split("\n").filter((l) => l.trim());
      if (!lines.length) return "";
      if (lines.every((l) => /^\s*-\s+/.test(l))) return `<ul>${lines.map((l) => `<li>${inline(l.replace(/^\s*-\s+/, ""))}</li>`).join("")}</ul>`;
      if (lines.length === 1 && /^###\s+/.test(lines[0])) return `<h3>${inline(lines[0].replace(/^###\s+/, ""))}</h3>`;
      return `<p>${lines.map(inline).join("<br>")}</p>`;
    }).join("");
  }

  /* Une page complète : intertitres + texte, encadrés si demandé */
  function page(doc, SITE) {
    return (doc.sections || []).map((s) => {
      const body = render(s.text, SITE);
      return `${s.title ? `<h2>${esc(s.title)}</h2>` : ""}${s.box ? `<div class="box">${body}</div>` : body}`;
    }).join("");
  }

  window.SHOP_RICH = { render, page, values, VARS };
})();
