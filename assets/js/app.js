/* =====================================================================
   BIBOULAB — MOTEUR COMMUN À TOUTES LES PAGES
   En-tête, pied de page, thème, panier, curseur, préloader, transitions,
   révélations au défilement, bandeau cookies.
   Les contenus viennent de data.js ; le rendu propre à chaque page est
   dans pages.js.
   ===================================================================== */
(() => {
  "use strict";
  const { SITE, CATEGORIES, PRODUCTS, FILAMENTS } = window.SHOP;

  /* ---------- Outils ---------- */
  const html = document.documentElement;
  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;      // mouvement réduit demandé ?
  const FINE = matchMedia("(hover: hover) and (pointer: fine)").matches;  // souris (pas tactile) ?
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const euro = (n) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
  const cat = (slug) => CATEGORIES.find((c) => c.slug === slug);
  /* Sous-catégories : une catégorie peut indiquer  parent: "slug-de-la-catégorie-parente" */
  const parentOf = (c) => (c && c.parent ? cat(c.parent) : null);
  const roots = () => CATEGORIES.filter((c) => !parentOf(c));               // catégories principales
  const subcats = (slug) => CATEGORIES.filter((c) => c.parent === slug);    // sous-catégories directes
  const catFamily = (slug) => { const out = [slug]; for (const s of out) subcats(s).forEach((k) => out.includes(k.slug) || out.push(k.slug)); return out; }; // elle-même + toutes ses sous-catégories
  const lineage = (c) => { const out = []; for (let x = c; x && !out.includes(x); x = parentOf(x)) out.unshift(x); return out; };                           // ses parentes, puis elle-même
  const product = (id) => PRODUCTS.find((p) => p.id === id);
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* stockage indisponible */ } } };

  /* ---------- Icônes : définies dans icons.js ---------- */
  const ICONS = window.SHOP_ICONS;
  const icon = (n, cls = "") => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICONS[n] || ""}</svg>`;

  /* ---------- Visuels produits ----------
     Si le produit a des photos (images: [...]) on les affiche en <img> lazy.
     Sinon on génère un visuel d'illustration aux couleurs de la catégorie. */
  function art(p, v = 0) {
    const c = cat(p.category) || CATEGORIES[0];
    const id = `g-${p.id}-${v}`;
    const shift = [0, 46, -46][v % 3];
    return `<svg viewBox="0 0 400 400" role="img" aria-label="${esc(p.name)} — visuel d'illustration ${v + 1}" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="${id}" gradientTransform="rotate(${50 + shift})"><stop stop-color="${c.color}"/><stop offset="1" stop-color="${c.color2}"/></linearGradient>
        <pattern id="${id}-l" width="400" height="8" patternUnits="userSpaceOnUse"><rect width="400" height="1.2" fill="#fff" opacity=".13"/></pattern>
      </defs>
      <rect width="400" height="400" fill="#14141c"/><rect width="400" height="400" fill="url(#${id})" opacity=".22"/>
      <circle cx="${200 + shift}" cy="${205 - Math.abs(shift) / 3}" r="${132 - v * 16}" fill="url(#${id})" opacity=".92"/>
      <rect width="400" height="400" fill="url(#${id}-l)"/>
      <g transform="translate(${200 + shift - 72} ${133 - Math.abs(shift) / 3}) scale(6)" fill="none" stroke="#fff" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${ICONS[c.icon]}</g>
    </svg>`;
  }
  function media(p, v = 0, eager = false) {
    const src = p.images && p.images[v];
    return src
      ? `<img src="${esc(src)}" alt="${esc(p.name)}${v ? ` — vue ${v + 1}` : ""}" width="800" height="800" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`
      : art(p, v);
  }
  const storeLogo = (s) => s.logo
    ? `<img class="store-logo" style="background:none" src="${esc(s.logo)}" alt="" width="26" height="26" loading="lazy">`
    : `<span class="store-logo" aria-hidden="true">${esc(s.mono)}</span>`;
  const extAttrs = 'target="_blank" rel="noopener noreferrer"';

  /* ---------- Panier (stocké dans le navigateur du visiteur) ---------- */
  const Cart = {
    key: "gforge-panier",
    read() { try { return JSON.parse(localStorage.getItem(this.key)) || []; } catch { return []; } },
    write(items) { store.set(this.key, JSON.stringify(items)); this.sync(); },
    add(id, { color = null, size = null } = {}, qty = 1) {
      const items = this.read();
      const found = items.find((i) => i.id === id && i.color === color && i.size === size);
      if (found) found.qty = Math.min(99, found.qty + qty); else items.push({ id, color, size, qty });
      this.write(items);
    },
    /* Position et quantité d'une variante (produit + couleur + taille) dans le panier */
    find(id, { color = null, size = null } = {}) { return this.read().findIndex((i) => i.id === id && i.color === color && i.size === size); },
    qtyOf(id, opts) { const i = this.read()[this.find(id, opts)]; return i ? i.qty : 0; },
    setQty(index, qty) { const items = this.read(); if (!items[index]) return; if (qty < 1) items.splice(index, 1); else items[index].qty = Math.min(99, qty); this.write(items); },
    clear() { this.write([]); },
    /* Lignes enrichies : produit, prix unitaire (taille comprise), total */
    lines() {
      return this.read().map((i, index) => {
        const p = product(i.id); if (!p) return null;
        const extra = (p.sizes.find((s) => s.label === i.size) || {}).extra || 0;
        const unit = p.price + extra;
        return { ...i, index, p, unit, total: unit * i.qty };
      }).filter(Boolean);
    },
    count() { return this.read().reduce((n, i) => n + i.qty, 0); },
    subtotal() { return this.lines().reduce((n, l) => n + l.total, 0); },
    sync() {
      const n = this.count(), el = $(".cart-count");
      if (el) { el.textContent = n; el.classList.toggle("on", n > 0); el.parentElement.setAttribute("aria-label", `Panier (${n} article${n > 1 ? "s" : ""})`); }
      document.dispatchEvent(new CustomEvent("cart:change"));
    }
  };
  function bumpCart() { const b = $(".cart-btn"); if (!b) return; b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump"); }
  /* Petite bille qui vole du bouton vers l'icône panier */
  function flyToCart(from) {
    const target = $(".cart-btn"); if (RM || !target || !from) return;
    const a = from.getBoundingClientRect(), b = target.getBoundingClientRect();
    const dot = document.createElement("i"); dot.className = "fly";
    dot.style.left = a.left + a.width / 2 + "px"; dot.style.top = a.top + a.height / 2 + "px";
    document.body.append(dot);
    requestAnimationFrame(() => { dot.style.transform = `translate(${b.left + b.width / 2 - a.left - a.width / 2}px, ${b.top + b.height / 2 - a.top - a.height / 2}px) scale(.4)`; dot.style.opacity = ".3"; });
    setTimeout(() => { dot.remove(); bumpCart(); }, 760);
  }

  /* ---------- Notifications ---------- */
  function toast(msg) {
    let box = $(".toasts");
    if (!box) { box = document.createElement("div"); box.className = "toasts"; box.setAttribute("role", "status"); box.setAttribute("aria-live", "polite"); document.body.append(box); }
    const t = document.createElement("div"); t.className = "toast"; t.innerHTML = icon("check") + `<span>${msg}</span>`;
    box.append(t);
    setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 400); }, 3200);
  }

  /* ---------- Confirmation avant de retirer un article ---------- */
  function confirmRemove(name) {
    return new Promise((resolve) => {
      const prev = document.activeElement;
      const m = document.createElement("div"); m.className = "modal";
      m.innerHTML = `<div class="modal-box" role="alertdialog" aria-modal="true" aria-labelledby="modal-t" aria-describedby="modal-d">
        <h2 id="modal-t">Retirer cet article ?</h2>
        <p id="modal-d"><b>${esc(name)}</b> va être retiré de votre panier.</p>
        <div class="modal-actions"><button class="btn btn-ghost" type="button" data-ok="0">Annuler</button><button class="btn btn-primary" type="button" data-ok="1">Retirer du panier</button></div>
      </div>`;
      document.body.append(m);
      const btns = $$("button", m);
      const close = (ok) => { document.removeEventListener("keydown", onKey, true); m.remove(); if (prev && prev.isConnected) prev.focus(); resolve(ok); };
      const onKey = (e) => {
        if (e.key === "Escape") { e.preventDefault(); close(false); }
        else if (e.key === "Tab") { e.preventDefault(); btns[(btns.indexOf(document.activeElement) + (e.shiftKey ? -1 : 1) + btns.length) % btns.length].focus(); }
      };
      document.addEventListener("keydown", onKey, true);
      m.addEventListener("click", (e) => { const b = e.target.closest("[data-ok]"); if (b) close(b.dataset.ok === "1"); else if (e.target === m) close(false); });
      btns[1].focus();
    });
  }
  /* Modifie la quantité d'une variante déjà au panier ; arrivé à 0, on demande confirmation avant de la retirer */
  async function stepQty(p, opts, delta) {
    const line = Cart.read()[Cart.find(p.id, opts)]; if (!line) return;
    const q = line.qty + delta;
    if (q < 1 && !(await confirmRemove(p.name))) return;
    Cart.setQty(Cart.find(p.id, opts), q);
    if (q < 1) toast(`${esc(p.name)} retiré du panier`);
  }
  const qtyHTML = (n, label) => `<div class="qty" role="group" aria-label="${label}">
    <button type="button" data-step="-1" aria-label="Diminuer la quantité">${icon("minus")}</button>
    <output>${n}</output>
    <button type="button" data-step="1" aria-label="Augmenter la quantité">${icon("plus")}</button></div>`;

  /* ---------- Carte produit ---------- */
  const defOpts = (p) => ({ color: p.colors[0] || null, size: p.sizes[0] ? p.sizes[0].label : null });
  /* Bouton « + » tant que l'article n'est pas au panier, sinon sélecteur − quantité + */
  function cardCtl(p) {
    const n = Cart.qtyOf(p.id, defOpts(p));
    return n ? qtyHTML(n, `Quantité de ${esc(p.name)} dans le panier`)
      : `<button class="card-add" type="button" data-add="${p.id}" aria-label="Ajouter ${esc(p.name)} au panier">${icon("plus")}</button>`;
  }
  function card(p, i = 0) {
    const c = cat(p.category);
    const badge = p.badge === "new" ? '<span class="badge new">Nouveau</span>' : p.badge === "best" ? '<span class="badge best">Best-seller</span>' : "";
    return `<div class="cell" data-reveal style="--i:${i % 4}">
      <article class="card" data-tilt style="--c:${c.color}">
        <a class="card-link" href="produit.html?id=${p.id}" data-cursor="Voir">
          <div class="card-media">${media(p)}${badge}</div>
          <div class="card-body">
            <p class="card-cat">${esc(c.name)}</p>
            <h3>${esc(p.name)}</h3>
            <p class="card-price">${p.sizes.length ? "<small>dès </small>" : ""}${euro(p.price)}</p>
          </div>
        </a>
        <div class="card-ctl" data-ctl="${p.id}">${cardCtl(p)}</div>
        <span class="glare" aria-hidden="true"></span>
      </article>
    </div>`;
  }
  /* Ajout rapide depuis une carte (options par défaut) */
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-add]");
    if (b) {
      const p = product(b.dataset.add); if (!p) return;
      flyToCart(b); Cart.add(p.id, defOpts(p));
      toast(`${esc(p.name)} ajouté · <a href="panier.html">Voir le panier</a>`);
      return;
    }
    const s = e.target.closest(".card-ctl [data-step]"); if (!s) return;
    const p = product(s.closest("[data-ctl]").dataset.ctl); if (p) stepQty(p, defOpts(p), +s.dataset.step);
  });
  /* Les cartes suivent le panier : quantité à jour, retour au bouton « + » une fois l'article retiré */
  document.addEventListener("cart:change", () => $$("[data-ctl]").forEach((el) => {
    const p = product(el.dataset.ctl); if (!p) return;
    const n = Cart.qtyOf(p.id, defOpts(p)), out = $("output", el);
    if (n && out) { out.textContent = n; return; }
    if (!n && !out) return;
    const focused = el.contains(document.activeElement);
    el.innerHTML = cardCtl(p);
    if (focused) $('[data-step="1"], [data-add]', el).focus();
  }));

  /* ---------- En-tête & pied de page ---------- */
  function logoHTML() {
    if (SITE.logo) return `<img src="${esc(SITE.logo)}" alt="${esc(SITE.name)}">`;
    const [a, ...rest] = SITE.name.split(".");
    return rest.length
      ? `<span class="logo-a">${esc(a)}</span><span class="logo-dot" aria-hidden="true"></span><span>${esc(rest.join("."))}</span>`
      : `<span class="logo-a">${esc(SITE.name)}</span>`;
  }
  function renderChrome() {
    const page = document.body.dataset.page;
    const cur = (p) => (p === page ? ' aria-current="page"' : "");
    const header = document.createElement("div");
    header.innerHTML = `
      <a class="skip" href="#main">Aller au contenu</a>
      <div class="progress" aria-hidden="true"></div>
      <header class="hdr">
        <a class="logo" href="index.html" aria-label="${esc(SITE.name)} — retour à l'accueil">${logoHTML()}</a>
        <nav class="nav" id="nav" aria-label="Navigation principale">
          <a href="index.html" style="--i:0"${cur("home")}>Accueil</a>
          <a href="boutique.html" style="--i:1"${cur("shop")}>Boutique</a>
          <div class="dd">
            <button type="button" style="--i:2" aria-expanded="false" aria-controls="dd-cats">Catégories ${icon("chevron")}</button>
            <div class="dd-menu" id="dd-cats">
              ${roots().map((c) => `<a href="categorie.html?c=${c.slug}" style="--c:${c.color}"><span class="dd-ic">${icon(c.icon)}</span>${esc(c.name)}</a>`).join("")}
            </div>
          </div>
          <a href="a-propos.html" style="--i:3"${cur("about")}>À propos</a>
          <a href="contact.html" style="--i:4"${cur("contact")}>Contact</a>
          <span class="nav-sep" aria-hidden="true"></span>
          ${SITE.stores.map((s, i) => `<a class="ext" href="${esc(s.url)}" ${extAttrs} style="--sc:${s.color};--i:${5 + i}">${storeLogo(s)}${esc(s.name)}<span class="sr"> (nouvel onglet)</span></a>`).join("")}
        </nav>
        <div class="hdr-actions">
          <button class="icon-btn theme-btn" type="button" aria-label="Changer de thème (clair / sombre)"></button>
          <a class="icon-btn cart-btn" href="panier.html" aria-label="Panier">${icon("cart")}<span class="cart-count" aria-hidden="true">0</span></a>
          <button class="icon-btn burger" type="button" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="nav"><span></span><span></span><span></span></button>
        </div>
      </header>`;
    document.body.prepend(...header.childNodes);

    const footer = document.createElement("footer");
    footer.className = "ftr";
    footer.innerHTML = `
      <div class="wrap ftr-grid">
        <div>
          <a class="logo" href="index.html" aria-label="${esc(SITE.name)} — accueil">${logoHTML()}</a>
          <p class="muted" style="margin-top:14px;max-width:32ch">${esc(SITE.slogan)}.</p>
          <p><a href="mailto:${esc(SITE.email)}" style="text-decoration:underline">${esc(SITE.email)}</a></p>
        </div>
        <nav aria-label="Catégories"><h2>Boutique</h2><ul>
          <li><a href="boutique.html">Toute la boutique</a></li>
          ${roots().map((c) => `<li><a href="categorie.html?c=${c.slug}">${esc(c.name)}</a></li>`).join("")}
        </ul></nav>
        <nav aria-label="Informations"><h2>Informations</h2><ul>
          <li><a href="a-propos.html">À propos</a></li>
          <li><a href="contact.html">Contact &amp; sur-mesure</a></li>
          ${Object.entries(window.SHOP.PAGES || {}).map(([k, d]) => `<li><a href="${k}.html">${esc(d.menu || d.title)}</a></li>`).join("")}
          <li><button type="button" data-cookies style="color:var(--muted);font-size:.9375rem">Gérer les cookies</button></li>
        </ul></nav>
        <div><h2>Retrouvez-moi aussi sur</h2>
          ${SITE.stores.map((s) => `<a class="store-btn" href="${esc(s.url)}" ${extAttrs} style="--sc:${s.color}">${storeLogo(s)}<span><b>${esc(s.name)}</b><small>${esc(s.tagline)}</small></span>${icon("ext")}<span class="sr">(nouvel onglet)</span></a>`).join("")}
        </div>
      </div>
      <div class="wrap ftr-bottom">
        <span>© ${new Date().getFullYear()} ${esc(SITE.name)} — ${esc(SITE.legal.owner)}, ${esc(SITE.legal.status)} · SIRET ${esc(SITE.legal.siret)}</span>
        ${SITE.legal.vat ? `<span>${esc(SITE.legal.vat)}</span>` : ""}
      </div>
      <div class="ftr-big" aria-hidden="true">${esc(SITE.name)}</div>`;
    document.body.append(footer);

    /* Titre d'onglet : "Page | Marque" (la marque vient de data.js) */
    document.title = document.title.split(" | ")[0] + " | " + SITE.name;

    /* Menu mobile */
    const burger = $(".burger");
    const setNav = (open) => { document.body.classList.toggle("nav-open", open); burger.setAttribute("aria-expanded", open); burger.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu"); };
    burger.addEventListener("click", () => setNav(!document.body.classList.contains("nav-open")));
    /* Menu déroulant Catégories (clic + clavier ; le survol est géré en CSS) */
    const dd = $(".dd"), ddBtn = $("button", dd);
    const setDd = (open) => { dd.classList.toggle("open", open); ddBtn.setAttribute("aria-expanded", open); };
    ddBtn.addEventListener("click", () => setDd(!dd.classList.contains("open")));
    document.addEventListener("click", (e) => { if (!dd.contains(e.target)) setDd(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") { setDd(false); setNav(false); } });

    /* En-tête qui se cache en descendant + barre de progression de lecture */
    let lastY = 0;
    const hdr = $(".hdr"), bar = $(".progress");
    const onScroll = () => {
      const y = scrollY, max = html.scrollHeight - innerHeight;
      bar.style.setProperty("--p", max > 0 ? Math.min(1, y / max) : 0);
      hdr.classList.toggle("hide", y > 300 && y > lastY && !document.body.classList.contains("nav-open"));
      lastY = y;
    };
    addEventListener("scroll", onScroll, { passive: true }); onScroll();
  }

  /* ---------- Thème clair / sombre ---------- */
  function initTheme() {
    const btn = $(".theme-btn");
    const paint = () => { btn.innerHTML = icon(html.dataset.theme === "dark" ? "sun" : "moon"); const m = $('meta[name="theme-color"]'); if (m) m.content = html.dataset.theme === "dark" ? "#0E0F13" : "#F5F6F9"; };
    paint();
    btn.addEventListener("click", () => {
      const apply = () => { html.dataset.theme = html.dataset.theme === "dark" ? "light" : "dark"; store.set("theme", html.dataset.theme); paint(); };
      if (!document.startViewTransition || RM) return apply();
      const r = btn.getBoundingClientRect(); // la révélation circulaire part du bouton
      html.style.setProperty("--tx", r.left + r.width / 2 + "px");
      html.style.setProperty("--ty", r.top + r.height / 2 + "px");
      document.startViewTransition(apply);
    });
  }

  /* ---------- Préloader (1re visite de la session) & transitions de page ---------- */
  function initEntrance() {
    const curtain = document.createElement("div"); curtain.className = "curtain"; curtain.setAttribute("aria-hidden", "true");
    document.body.append(curtain);
    let first = false;
    try { first = !sessionStorage.getItem("gforge-vu"); sessionStorage.setItem("gforge-vu", "1"); } catch { /* ignore */ }
    if (first && !RM) {
      html.style.setProperty("--t0", "1.55s"); // retarde les animations du hero pendant le préloader
      const pre = document.createElement("div"); pre.className = "preloader"; pre.setAttribute("role", "status");
      pre.innerHTML = `<div><div class="pre-box"><div class="pre-name">${esc(SITE.name)}</div><div class="pre-nozzle"></div></div><p class="pre-txt">Préchauffage de la buse…</p></div>`;
      document.body.append(pre);
      setTimeout(() => { pre.classList.add("done"); setTimeout(() => pre.remove(), 500); }, 1450);
    } else if (!RM) {
      document.body.classList.add("is-entering");
    }
    /* Rideau de sortie sur les liens internes */
    document.addEventListener("click", (e) => {
      const a = e.target.closest("a[href]");
      if (!a || RM || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const href = a.getAttribute("href");
      if (a.target === "_blank" || a.hasAttribute("download") || /^(#|mailto:|tel:|https?:)/.test(href)) return;
      e.preventDefault();
      document.body.classList.remove("is-entering", "nav-open");
      document.body.classList.add("is-leaving");
      setTimeout(() => { location.href = a.href; }, 300);
    });
    addEventListener("pageshow", (e) => { if (e.persisted) document.body.classList.remove("is-leaving"); });
  }

  /* ---------- Curseur personnalisé ---------- */
  function initCursor() {
    if (!FINE || RM) return;
    const dot = document.createElement("div"), ring = document.createElement("div");
    dot.className = "cur-dot"; ring.className = "cur-ring"; dot.setAttribute("aria-hidden", "true"); ring.setAttribute("aria-hidden", "true");
    document.body.append(dot, ring);
    let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y, started = false;
    addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      x = e.clientX; y = e.clientY;
      if (!started) { started = true; rx = x; ry = y; html.classList.add("has-cursor"); }
      dot.style.transform = `translate(${x}px, ${y}px)`;
    }, { passive: true });
    (function loop() { rx += (x - rx) * 0.2; ry += (y - ry) * 0.2; ring.style.transform = `translate(${rx}px, ${ry}px)`; requestAnimationFrame(loop); })();
    /* Le curseur change de forme selon l'élément survolé */
    document.addEventListener("mouseover", (e) => {
      const t = e.target;
      const label = t.closest("[data-cursor]");
      const text = t.closest("input:not([type=radio]):not([type=checkbox]):not([type=range]), textarea");
      const link = t.closest("a, button, label, select, summary, .zoom");
      ring.classList.toggle("is-label", !!label);
      ring.classList.toggle("is-text", !label && !!text);
      ring.classList.toggle("is-link", !label && !text && !!link);
      ring.textContent = label ? label.dataset.cursor : "";
    });
    addEventListener("pointerdown", () => ring.classList.add("is-down"));
    addEventListener("pointerup", () => ring.classList.remove("is-down"));
    document.addEventListener("mouseleave", () => html.classList.remove("has-cursor"));
    document.addEventListener("mouseenter", () => started && html.classList.add("has-cursor"));
  }

  /* ---------- Effets au défilement et au survol ----------
     enhance(racine) est rappelé après chaque rendu dynamique. */
  const revealIO = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); revealIO.unobserve(en.target); } }), { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  const countIO = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return; countIO.unobserve(en.target);
    const el = en.target, end = +el.dataset.count, pre = el.dataset.prefix || "", suf = el.dataset.suffix || "";
    if (RM) { el.textContent = pre + end + suf; return; }
    const t0 = performance.now(), dur = 1600;
    (function tick(t) { const k = Math.min(1, (t - t0) / dur), v = Math.round(end * (1 - Math.pow(1 - k, 4))); el.textContent = pre + v + suf; if (k < 1) requestAnimationFrame(tick); })(t0);
  }), { threshold: 0.6 });
  const parallaxEls = new Set();
  function tilt(el) { // inclinaison 3D suivant la souris
    el.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      el.classList.add("tilting");
      el.style.setProperty("--ry", (px - 0.5) * 4 + "deg"); el.style.setProperty("--rx", (0.5 - py) * 4 + "deg");
      el.style.setProperty("--mx", px * 100 + "%"); el.style.setProperty("--my", py * 100 + "%");
    });
    el.addEventListener("pointerleave", () => { el.classList.remove("tilting"); el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); });
  }
  function magnetic(el) { // bouton attiré par le curseur
    el.addEventListener("pointermove", (e) => { const r = el.getBoundingClientRect(); el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.1}px, ${(e.clientY - r.top - r.height / 2) * 0.14}px)`; });
    el.addEventListener("pointerleave", () => { el.style.transform = ""; });
  }
  function enhance(root = document) {
    $$("[data-reveal]:not(.in)", root).forEach((el) => revealIO.observe(el));
    $$("[data-count]", root).forEach((el) => countIO.observe(el));
    $$("[data-parallax]", root).forEach((el) => parallaxEls.add(el));
    if (FINE && !RM) {
      $$("[data-tilt]", root).forEach((el) => { if (!el._fx) { el._fx = 1; tilt(el); } });
      $$("[data-magnetic]", root).forEach((el) => { if (!el._fx) { el._fx = 1; magnetic(el); } });
    }
  }
  if (!RM) {
    let ticking = false;
    const run = () => { ticking = false; parallaxEls.forEach((el) => { const r = el.parentElement.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return; const k = (r.top + r.height / 2 - innerHeight / 2) / innerHeight; el.style.transform = `translateY(${k * +el.dataset.parallax * -100}px)`; }); };
    addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(run); } }, { passive: true });
  }

  /* ---------- Bandeau cookies (RGPD) ----------
     Le site n'utilise que du stockage strictement nécessaire (panier, thème).
     Si vous ajoutez un outil de mesure d'audience, ne le chargez que lorsque
     UI.consent() === "accept" (voir LISEZ-MOI.md). */
  function initCookies() {
    const show = () => {
      if ($(".cookie")) return;
      const b = document.createElement("aside"); b.className = "cookie"; b.setAttribute("aria-label", "Cookies");
      b.innerHTML = `<p><b>Cookies</b> Ce site n'utilise que le stockage nécessaire au panier et au thème. Aucun traceur publicitaire. <a href="confidentialite.html">En savoir plus</a></p>
        <div><button class="btn" type="button" data-c="refuse">Tout refuser</button><button class="btn" type="button" data-c="accept">Accepter</button></div>`;
      document.body.append(b);
      requestAnimationFrame(() => requestAnimationFrame(() => b.classList.add("on")));
      b.addEventListener("click", (e) => { const c = e.target.closest("[data-c]"); if (!c) return; store.set("gforge-cookies", c.dataset.c); b.classList.remove("on"); setTimeout(() => b.remove(), 600); document.dispatchEvent(new CustomEvent("consent:change", { detail: c.dataset.c })); });
    };
    if (!store.get("gforge-cookies")) setTimeout(show, 2600);
    document.addEventListener("click", (e) => { if (e.target.closest("[data-cookies]")) show(); });
  }

  /* ---------- Données structurées (SEO) ---------- */
  function jsonLd(data) { const s = document.createElement("script"); s.type = "application/ld+json"; s.textContent = JSON.stringify(data); document.head.append(s); }
  function setMeta(title, description) {
    document.title = `${title} | ${SITE.name}`;
    const m = $('meta[name="description"]'); if (m && description) m.content = description;
  }

  /* ---------- API partagée avec pages.js ---------- */
  window.UI = { $, $$, esc, euro, cat, roots, subcats, catFamily, lineage, product, icon, art, media, card, storeLogo, extAttrs, Cart, toast, confirmRemove, stepQty, qtyHTML, flyToCart, enhance, jsonLd, setMeta, RM, FINE, consent: () => store.get("gforge-cookies") };

  /* ---------- Démarrage ---------- */
  initEntrance();
  renderChrome();
  initTheme();
  initCursor();
  initCookies();
  Cart.sync();
  document.addEventListener("DOMContentLoaded", () => enhance());
})();
