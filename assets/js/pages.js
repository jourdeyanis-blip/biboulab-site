/* =====================================================================
   BIBOULAB — RENDU DES PAGES
   Chaque page HTML porte un attribut <body data-page="..."> ; la fonction
   correspondante ci-dessous construit son contenu à partir de data.js.
   ===================================================================== */
(() => {
  "use strict";
  const { SITE, FILAMENTS, CATEGORIES, PRODUCTS, REVIEWS, ABOUT, PAGES = {} } = window.SHOP;
  const { $, $$, esc, euro, cat, roots, subcats, catFamily, lineage, product, icon, art, media, card, storeLogo, extAttrs, Cart, toast, confirmRemove, stepQty, qtyHTML, flyToCart, enhance, jsonLd, setMeta, RM, FINE } = window.UI;
  const main = $("#main");
  const params = new URLSearchParams(location.search);

  /* ================= Blocs réutilisables ================= */

  /* Bloc « Retrouvez-moi aussi sur » (MakerWorld / Cults3D) */
  const extBlock = () => `
    <section class="section" aria-labelledby="ext-t"><div class="wrap">
      <div class="ext-block" data-reveal="scale">
        <div>
          <p class="kicker">Ailleurs sur le web</p>
          <h2 id="ext-t">Retrouvez-moi aussi sur</h2>
          <p class="muted" style="margin:14px 0 0;max-width:42ch">Vous avez une imprimante ? Mes modèles sont aussi disponibles en téléchargement, à imprimer chez vous.</p>
        </div>
        <div class="ext-btns">
          ${SITE.stores.map((s) => `<a class="store-btn" href="${esc(s.url)}" ${extAttrs} style="--sc:${s.color}" data-magnetic>${storeLogo(s)}<span><b>${esc(s.name)}</b><small>${esc(s.tagline)}</small></span>${icon("ext")}<span class="sr">(nouvel onglet)</span></a>`).join("")}
        </div>
      </div>
    </div></section>`;

  /* Illustration animée d'imprimante (remplacée par vos photos dès qu'elles sont renseignées) */
  const printer = (uid = "p") => `<svg class="printer" viewBox="0 0 400 340" role="img" aria-label="Illustration : une imprimante 3D imprime un vase couche par couche" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="${uid}g" x1="0" y1="1" x2="0" y2="0"><stop stop-color="#8B5CF6"/><stop offset=".6" stop-color="#22D3EE"/><stop offset="1" stop-color="#FF7A1A"/></linearGradient>
      <pattern id="${uid}l" width="400" height="6" patternUnits="userSpaceOnUse"><rect width="400" height="1.2" fill="#14141c" opacity=".5"/></pattern>
    </defs>
    <rect width="400" height="340" fill="#14141c"/>
    <rect x="70" y="36" width="260" height="256" rx="16" fill="#191923" stroke="#3a3a4d" stroke-width="6"/>
    <rect x="86" y="70" width="228" height="5" rx="2" fill="#55556a"/>
    <g class="obj"><path d="M170 268c-14-30-22-60 0-90 8-12 6-30 4-44h52c-2 14-4 32 4 44 22 30 14 60 0 90z" fill="url(#${uid}g)"/><path d="M170 268c-14-30-22-60 0-90 8-12 6-30 4-44h52c-2 14-4 32 4 44 22 30 14 60 0 90z" fill="url(#${uid}l)"/></g>
    <g class="head"><rect x="184" y="56" width="32" height="32" rx="6" fill="#d8d8e6"/><path d="M193 88h14l-7 11z" fill="#FF7A1A"/></g>
    <rect x="108" y="268" width="184" height="8" rx="3" fill="#55556a"/>
    <circle cx="300" cy="54" r="4" fill="#39FF14"/>
  </svg>`;

  const spool = `<svg class="spool" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4" aria-hidden="true"><circle cx="50" cy="50" r="44"/><circle cx="50" cy="50" r="30" stroke-dasharray="6 6"/><circle cx="50" cy="50" r="9"/><path d="M50 6v14M50 80v14M6 50h14M80 50h14"/></svg>`;
  const tick = `<svg class="tick" viewBox="0 0 100 100" fill="none" stroke="#22C55E" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="50" cy="50" r="45"/><path d="M30 52l14 14 27-30"/></svg>`;

  function confetti() {
    if (RM) return;
    const colors = ["#8B5CF6", "#22D3EE", "#FF7A1A", "#39FF14", "#FACC15"];
    for (let i = 0; i < 46; i++) {
      const c = document.createElement("i"); c.className = "confetti";
      c.style.cssText = `left:${Math.random() * 100}vw;background:${colors[i % 5]};--dx:${(Math.random() - 0.5) * 240}px;--rot:${Math.random() * 900 - 450}deg;animation-duration:${1.6 + Math.random() * 1.6}s;animation-delay:${Math.random() * 0.4}s`;
      document.body.append(c); setTimeout(() => c.remove(), 3800);
    }
  }

  /* Champs de formulaire */
  const fg = (name, label, o = {}) => `<div class="fg${o.full ? " full" : ""}">
      <label for="f-${name}">${label}${o.required ? ' <span aria-hidden="true">*</span>' : ' <span class="muted" style="font-weight:500">(facultatif)</span>'}</label>
      ${o.area
        ? `<textarea class="textarea" id="f-${name}" name="${name}" ${o.required ? "required" : ""} placeholder="${esc(o.placeholder || "")}">${esc(o.value || "")}</textarea>`
        : `<input class="input" id="f-${name}" name="${name}" type="${o.type || "text"}" value="${esc(o.value || "")}" ${o.required ? "required" : ""} ${o.zip ? 'data-zip inputmode="numeric"' : ""} autocomplete="${o.auto || "off"}" placeholder="${esc(o.placeholder || "")}">`}
      <p class="err-msg" role="alert"></p>
    </div>`;
  function validate(form) {
    let ok = true, firstBad = null;
    $$(".fg", form).forEach((g) => {
      const f = $("input, textarea, select", g);
      if (!f || f.closest(".custom-fields:not(.open)")) return;
      const v = f.type === "checkbox" ? f.checked : f.value.trim();
      let msg = "";
      if (f.required && !v) msg = f.type === "checkbox" ? "Cette case est nécessaire pour continuer." : "Ce champ est requis.";
      else if (f.type === "email" && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) msg = "Cette adresse e-mail semble incomplète.";
      else if (f.dataset.zip !== undefined && v && !/^\d{5}$/.test(v)) msg = "Code postal à 5 chiffres.";
      g.classList.remove("err"); void g.offsetWidth; // relance l'animation de secousse
      g.classList.toggle("err", !!msg); g.classList.toggle("ok", !msg && !!v && f.type !== "checkbox");
      f.setAttribute("aria-invalid", !!msg);
      const m = $(".err-msg", g); if (m) m.textContent = msg;
      if (msg) { ok = false; firstBad = firstBad || f; }
    });
    if (firstBad) firstBad.focus();
    return ok;
  }
  const mailto = (subject, body) => `mailto:${SITE.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  /* ================= ACCUEIL ================= */
  function home() {
    /* Titre : découpé mot par mot ; les mots entre *étoiles* passent en dégradé */
    let hl = false;
    const words = SITE.hero.title.split(" ").map((tok, i) => {
      if (tok.startsWith("*")) hl = true;
      const cls = hl ? "w hl" : "w";
      if (/\*[.,;:!?]?$/.test(tok)) hl = false;
      return `<span class="${cls}"><span style="--i:${i}">${esc(tok.replace(/\*/g, ""))}</span></span>`;
    }).join(" ");
    const plainTitle = SITE.hero.title.replace(/\*/g, "");
    const latest = [...PRODUCTS].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
    const loop = SITE.marquee.map((m) => `<span>${esc(m)}</span>`).join("");

    main.innerHTML = `
      <section class="hero" aria-labelledby="hero-t">
        <div class="hero-grid" aria-hidden="true"></div>
        <div class="wrap hero-in"><div class="hero-copy">
          <h1 class="hero-title" id="hero-t" aria-label="${esc(plainTitle)}"><span aria-hidden="true">${words}</span></h1>
          <p class="lead fade-up" style="--d:.75s">${esc(SITE.hero.lead)}</p>
          <div class="hero-cta fade-up" style="--d:.9s">
            <a class="btn btn-primary" href="boutique.html" data-magnetic>${esc(SITE.hero.cta)} ${icon("arrow", "ic-arrow")}</a>
            <a class="btn btn-ghost" href="contact.html?sur-mesure=1">${esc(SITE.hero.cta2)}</a>
          </div>
          <dl class="stats fade-up" style="--d:1.05s">
            ${SITE.stats.map((s) => `<div><dt>${esc(s.label)}</dt><dd data-count="${s.value}" data-prefix="${esc(s.prefix)}" data-suffix="${esc(s.suffix)}">${esc(s.prefix)}0${esc(s.suffix)}</dd></div>`).join("")}
          </dl>
          ${SITE.demo ? '<p class="fade-up" style="--d:1.2s;margin-top:14px"><span class="demo-note">Chiffres d\'exemple — à remplacer dans data.js</span></p>' : ""}
        </div>
        <div class="hero-art fade-up" style="--d:.35s">${heroPrinterSvg()}</div></div>
        <span class="scroll-hint" aria-hidden="true"></span>
      </section>

      <div class="marquee" aria-label="${esc(SITE.marquee.join(", "))}"><div class="marquee-track" aria-hidden="true">${loop}${loop}${loop}${loop}</div></div>

      <section class="section" aria-labelledby="cats-t">
        <div class="wrap"><header class="sec-h" data-reveal><div><p class="kicker">Les univers</p><h2 id="cats-t">Huit catégories, <span class="grad-text">mille idées</span></h2></div>
          <a class="btn btn-ghost btn-sm" href="boutique.html">Toute la boutique ${icon("arrow", "ic-arrow")}</a></header></div>
        <div class="wrap"><ul class="fc" role="list">${roots().map(focusCard).join("")}</ul></div>
      </section>

      <section class="section" style="padding-top:0" aria-labelledby="new-t">
        <div class="wrap"><header class="sec-h" data-reveal><div><p class="kicker">Derniers produits</p><h2 id="new-t">Tout juste sortis du plateau</h2></div>
          <a class="btn btn-ghost btn-sm" href="boutique.html">Voir les ${PRODUCTS.length} créations ${icon("arrow", "ic-arrow")}</a></header></div>
        ${pgStage("pg-new", "Galerie des dernières créations")}
      </section>

      <section class="section" style="padding-top:0" aria-labelledby="at-t"><div class="wrap split">
        <div class="split-media" data-reveal="left">${ABOUT.photos[0].src ? `<img data-parallax=".1" src="${esc(ABOUT.photos[0].src)}" alt="${esc(ABOUT.photos[0].alt)}" loading="lazy">` : `<div data-parallax=".1">${heroPrinterSvg("hpa", "figurine")}</div>`}</div>
        <div data-reveal="right">
          <p class="kicker">L'atelier</p>
          <h2 id="at-t">Imprimé couche par couche, <span class="grad-text">fini à la main</span></h2>
          <ul class="ticks">
            <li>${icon("check")}<span>Modélisé et imprimé par mes soins, sur imprimante Bambu Lab</span></li>
            <li>${icon("check")}<span>Petites séries et couleurs au choix, rien ne dort en stock</span></li>
            <li>${icon("check")}<span>Personnalisation et pièces sur mesure sur simple demande</span></li>
          </ul>
          <a class="btn btn-ghost" href="a-propos.html">Découvrir l'atelier ${icon("arrow", "ic-arrow")}</a>
        </div>
      </div></section>

      ${REVIEWS.length ? `<section class="section" style="padding-top:0" aria-labelledby="rev-t"><div class="wrap">
        <header class="sec-h" data-reveal><div><p class="kicker">Avis clients</p><h2 id="rev-t">Ils ont adopté une création</h2></div>
          ${SITE.demo ? '<span class="demo-note">Avis d\'exemple — à remplacer par de vrais avis</span>' : ""}</header>
        <div class="reviews">${REVIEWS.map((r, i) => `<figure class="review" data-reveal style="--i:${i}">
            <div class="stars" role="img" aria-label="${r.stars} étoiles sur 5">${"★".repeat(r.stars)}${"☆".repeat(5 - r.stars)}</div>
            <blockquote>« ${esc(r.text)} »</blockquote>
            <figcaption><b>${esc(r.name)}</b>${esc(r.product)}</figcaption></figure>`).join("")}</div>
      </div></section>` : ""}

      ${extBlock()}`;

    $$(".hp").forEach((svg, i) => heroPrinter(svg, i * 6.5)); // pingouin en haut, figurine dans « L'atelier » (démarrage décalé)
    phantomGallery($("#pg-new"), latest); // les 8 dernières, de la plus récente à la plus ancienne
    jsonLd({ "@context": "https://schema.org", "@type": "Store", name: SITE.name, url: SITE.url, slogan: SITE.slogan, email: SITE.email, sameAs: SITE.stores.map((s) => s.url) });
  }

  /* Carte « focus » d'un univers (accueil) : au survol, les autres cartes se floutent
     et le nom apparaît sur un voile sombre. Adapté du composant « Focus Cards » (Aceternity UI).
     Visuel : c.image si renseignée, sinon la 1re photo d'un produit de l'univers,
     sinon un visuel d'illustration aux couleurs de la catégorie. */
  function focusCard(c, i) {
    const fam = catFamily(c.slug), prods = PRODUCTS.filter((p) => fam.includes(p.category)), n = prods.length;
    const photo = c.image || (prods.find((p) => p.images && p.images[0]) || { images: [] }).images[0];
    const visual = photo
      ? `<img src="${esc(photo)}" alt="" loading="lazy" decoding="async">`
      : art({ id: `univers-${c.slug}`, name: c.name, category: c.slug }).replace('role="img"', 'aria-hidden="true"');
    return `<li data-reveal style="--i:${i % 4}"><a class="fc-card" href="categorie.html?c=${c.slug}" style="--c:${c.color}">
      ${visual}
      <span class="fc-veil"><span class="fc-title">${esc(c.name)}</span><span class="fc-n">${n} création${n > 1 ? "s" : ""} ${icon("arrow")}</span></span>
    </a></li>`;
  }

  function catCard(c, i) {
    const fam = catFamily(c.slug), n = PRODUCTS.filter((p) => fam.includes(p.category)).length; // sous-catégories comprises
    return `<div data-reveal style="--i:${i % 4}"><a class="cat fx-${c.fx}" href="categorie.html?c=${c.slug}" style="--c:${c.color};--c2:${c.color2}" data-tilt>
      <span class="cat-ic">${icon(c.icon)}</span>
      <h3>${esc(c.name)}</h3><p>${esc(c.short)}</p>
      <span class="cat-n">${n} création${n > 1 ? "s" : ""} ${icon("arrow")}</span>
      <span class="glare" aria-hidden="true"></span></a></div>`;
  }

  /* Galerie « fantôme » des univers (accueil)
     Mur infini de créations qu'on fait glisser et qu'on peut lancer (inertie), projecteur
     qui suit la souris, légère courbure 3D. Un clic ouvre la création au centre avec sa
     légende tapée à la machine ; un clic ailleurs (ou Échap) la renvoie à sa place.
     Adapté du composant « Phantom Infinite Gallery » (Cue Foundations), en JavaScript natif.
     Les cases utilisent la 1re photo de chaque produit, sinon son visuel d'illustration. */
  /* Plateau d'une galerie (le contenu est ajouté par phantomGallery) */
  const pgStage = (id, label) => `<div class="pg">
          <div class="pg-stage" id="${id}" tabindex="0" data-cursor="Glisser" aria-label="${label}. Glissez pour explorer, cliquez sur une création pour l'ouvrir. Au clavier : flèches pour se déplacer, Entrée pour ouvrir la création au centre.">
            <div class="pg-grid" aria-hidden="true"></div>
            <div class="pg-dim" aria-hidden="true"></div><div class="pg-spot" aria-hidden="true"></div><div class="pg-vig" aria-hidden="true"></div>
            <p class="pg-hint" aria-hidden="true">Glissez pour explorer · cliquez pour ouvrir</p>
          </div>
        </div>`;

  /* list : créations à afficher (dans cet ordre). Sans list : tout le catalogue, mélangé par univers. */
  function phantomGallery(stage, list) {
    if (!stage || !PRODUCTS.length) return;
    const CFG = {
      cell: 210, cellMobile: 150,   // taille d'une case (px)
      arcAmount: 0.6, arcMaxDeg: 28, // courbure horizontale du mur
      edgeFade: 0.25,                // rétrécissement des cases sur les bords
      parallax: 0.08,                // décalage suivant la souris
      friction: 0.92, throwMin: 80, throwMax: 2500, // lancer
      zoom: 0.7, pressZoomDelay: 120, dragThreshold: 4
    };
    const grid = $(".pg-grid", stage), spot = $(".pg-spot", stage);
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const P = "perspective(1200px) translate(-50%, -50%)";

    /* Créations mélangées univers par univers : deux cases voisines changent de couleur */
    const groups = roots().map((c) => PRODUCTS.filter((p) => catFamily(c.slug).includes(p.category))).filter((g) => g.length);
    const items = list && list.length ? [...list] : [];
    if (!items.length) for (let k = 0, max = Math.max(0, ...groups.map((g) => g.length)); k < max; k++) groups.forEach((g) => g[k] && items.push(g[k]));
    if (!items.length) items.push(...PRODUCTS);
    const N = items.length;
    const thumbs = items.map((p) => {
      const src = p.images && p.images[0];
      if (src) return `url("${encodeURI(src).replace(/"/g, "%22")}")`;
      return `url("data:image/svg+xml,${encodeURIComponent(art(p).replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" '))}")`;
    });

    /* ---- État du mouvement ---- */
    let W = 0, H = 0, base = CFG.cell, size, tSize;
    let off = { x: 0, y: 0 }, tOff = { x: 0, y: 0 }, inert = { x: 0, y: 0 }, vel = { x: 0, y: 0 }, mo = { x: 0, y: 0 }, tMo = { x: 0, y: 0 };
    let pressing = false, dragging = false, throwing = false, press = { x: 0, y: 0 }, start = { x: 0, y: 0 }, last = { x: 0, y: 0, t: 0 };
    let pressTimer = 0, raf = 0, lastT = 0, visible = false;
    const cells = new Map();
    const measure = () => { W = stage.clientWidth; H = stage.clientHeight; base = W < 640 ? CFG.cellMobile : CFG.cell; };
    measure();
    size = tSize = base;
    off = { x: W / 2 - size / 2, y: H / 2 - size / 2 }; tOff = { ...off };

    function makeCell(gx, gy) {
      const i = (((gx + gy * 3) % N) + N) % N, p = items[i], c = cat(p.category) || {};
      const el = document.createElement("div");
      el.className = "pg-cell"; el.dataset.i = i;
      el.style.setProperty("--c", c.color || "#8B5CF6");
      el.innerHTML = `<div class="pg-thumb"></div><div class="pg-meta"><span>${esc(p.name)}</span><span>${euro(p.price)}</span></div>`;
      el.firstChild.style.backgroundImage = thumbs[i];
      return el;
    }

    function render() {
      const ox = off.x + mo.x + inert.x, oy = off.y + mo.y + inert.y;
      const x0 = Math.floor(-ox / size) - 1, y0 = Math.floor(-oy / size) - 1;
      const cols = Math.ceil(W / size) + 3, rows = Math.ceil(H / size) + 3;
      const maxA = (CFG.arcMaxDeg * Math.PI / 180) * CFG.arcAmount, radius = W / (2 * Math.sin(Math.max(0.001, maxA)));
      const seen = new Set();
      for (let gy = y0; gy < y0 + rows; gy++) for (let gx = x0; gx < x0 + cols; gx++) {
        const key = gx + "," + gy; seen.add(key);
        let el = cells.get(key);
        if (!el) { el = makeCell(gx, gy); cells.set(key, el); grid.append(el); }
        const left = gx * size + ox, top = gy * size + oy;
        const dx = (left + size / 2 - W / 2) / (W / 2), ang = dx * maxA, edge = Math.min(1, Math.abs(dx));
        const z = -radius * (Math.cos(ang) - 1), yaw = -ang * 180 / Math.PI;
        el.style.width = el.style.height = size + "px";
        el.style.transform = `translate3d(${left}px, ${top}px, ${z}px) rotateY(${yaw}deg) scale(${1 - CFG.edgeFade * edge * edge})`;
        el.style.opacity = 1 - 0.4 * edge * CFG.arcAmount;
      }
      for (const [key, el] of cells) if (!seen.has(key)) { el.remove(); cells.delete(key); }
    }

    function commitInertia() { off.x += inert.x; off.y += inert.y; tOff.x += inert.x; tOff.y += inert.y; inert = { x: 0, y: 0 }; throwing = false; }
    /* Change la taille des cases en gardant le centre de la galerie immobile */
    function zoomTo(next) {
      const px = W / 2, py = H / 2;
      tOff = { x: px - ((px - off.x) / size) * next, y: py - ((py - off.y) / size) * next };
      tSize = next;
    }

    function tick(now) {
      raf = 0;
      const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
      size += (tSize - size) * 0.15; if (Math.abs(size - tSize) < 0.05) size = tSize;
      if (!dragging) {
        off.x += (tOff.x - off.x) * 0.15; off.y += (tOff.y - off.y) * 0.15;
        if (Math.abs(off.x - tOff.x) < 0.1) off.x = tOff.x;
        if (Math.abs(off.y - tOff.y) < 0.1) off.y = tOff.y;
      }
      if (throwing) {
        const f = Math.pow(CFG.friction, dt * 60);
        vel.x *= f; vel.y *= f;
        inert.x += vel.x * dt; inert.y += vel.y * dt;
        if (Math.hypot(vel.x, vel.y) < 2) commitInertia();
      }
      mo.x += (tMo.x - mo.x) * 0.12; mo.y += (tMo.y - mo.y) * 0.12;
      if (Math.abs(mo.x - tMo.x) < 0.05) mo.x = tMo.x;
      if (Math.abs(mo.y - tMo.y) < 0.05) mo.y = tMo.y;
      render();
      const busy = dragging || throwing || size !== tSize || off.x !== tOff.x || off.y !== tOff.y || mo.x !== tMo.x || mo.y !== tMo.y;
      if (busy && visible) raf = requestAnimationFrame(tick); // au repos : plus aucun calcul
    }
    const wake = () => { if (!raf && visible) { lastT = performance.now(); raf = requestAnimationFrame(tick); } };
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) wake(); }, { rootMargin: "100px" }).observe(stage);
    render();

    /* ---- Glisser, lancer, maintenir pour dézoomer ---- */
    stage.addEventListener("pointerdown", (e) => {
      if (e.button) return;
      if (throwing || inert.x || inert.y) commitInertia();
      try { stage.setPointerCapture(e.pointerId); } catch { /* pointeur déjà relâché */ }
      pressing = true; dragging = false;
      press = { x: e.clientX, y: e.clientY }; last = { ...press, t: performance.now() };
      vel = { x: 0, y: 0 }; start = { ...off };
      clearTimeout(pressTimer);
      if (!RM) pressTimer = setTimeout(() => { if (pressing && !dragging) { zoomTo(base * CFG.zoom); wake(); } }, CFG.pressZoomDelay);
    });
    stage.addEventListener("pointermove", (e) => {
      const r = stage.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
      spot.style.setProperty("--mx", mx + "px"); spot.style.setProperty("--my", my + "px");
      if (!pressing) {
        if (!RM && e.pointerType === "mouse") { tMo = { x: (W / 2 - mx) * CFG.parallax, y: (H / 2 - my) * CFG.parallax }; wake(); }
        return;
      }
      const now = performance.now(), dt = Math.max(0.001, (now - last.t) / 1000);
      vel.x = clamp((e.clientX - last.x) / dt, -CFG.throwMax, CFG.throwMax) * 0.6 + vel.x * 0.4;
      vel.y = clamp((e.clientY - last.y) / dt, -CFG.throwMax, CFG.throwMax) * 0.6 + vel.y * 0.4;
      last = { x: e.clientX, y: e.clientY, t: now };
      const dx = e.clientX - press.x, dy = e.clientY - press.y;
      if (!dragging && Math.hypot(dx, dy) > CFG.dragThreshold) { dragging = true; stage.classList.add("dragging"); start = { ...off }; }
      if (dragging) { off = { x: start.x + dx, y: start.y + dy }; tOff = { ...off }; wake(); }
    });
    function endPress(e) {
      if (!pressing) return;
      const wasDrag = dragging;
      pressing = dragging = false; clearTimeout(pressTimer);
      stage.classList.remove("dragging");
      if (performance.now() - last.t > 80) vel = { x: 0, y: 0 }; // le doigt s'était arrêté : pas de lancer
      throwing = !RM && wasDrag && Math.hypot(vel.x, vel.y) >= CFG.throwMin;
      zoomTo(base);
      if (!wasDrag && e.type === "pointerup") openAt(e.clientX, e.clientY);
      wake();
    }
    stage.addEventListener("pointerup", endPress);
    stage.addEventListener("pointercancel", endPress);
    stage.addEventListener("pointerleave", () => { tMo = { x: 0, y: 0 }; wake(); });
    stage.addEventListener("keydown", (e) => {
      const k = { ArrowLeft: [1, 0], ArrowRight: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
      if (k) { e.preventDefault(); if (throwing) commitInertia(); tOff.x += k[0] * size; tOff.y += k[1] * size; wake(); }
      else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); const r = stage.getBoundingClientRect(); openAt(r.left + W / 2, r.top + H / 2); }
    });
    addEventListener("resize", () => { measure(); if (!pressing) zoomTo(base); wake(); }, { passive: true });

    /* ---- Mise en avant d'une création (carte au centre + légende tapée) ---- */
    const dim = document.createElement("div"), fc = document.createElement("div");
    dim.className = "pg-fdim";
    fc.className = "pg-fcard"; fc.setAttribute("role", "dialog"); fc.setAttribute("aria-modal", "true"); fc.inert = true;
    fc.innerHTML = `<div class="pg-fimg"></div>
      <button class="pg-fclose" type="button" aria-label="Fermer">${icon("plus")}</button>
      <div class="pg-cap">
        <a class="pg-fcat" href="#"></a>
        <p class="pg-fhead" aria-hidden="true"><b></b><span></span></p>
        <p class="pg-fdesc" aria-hidden="true"><span></span><i class="pg-caret" hidden></i></p>
        <p class="sr"></p>
        <a class="btn btn-primary btn-sm pg-fgo" href="#">Voir la création ${icon("arrow", "ic-arrow")}</a>
      </div>`;
    document.body.append(dim, fc);
    const fImg = $(".pg-fimg", fc), fCat = $(".pg-fcat", fc), fGo = $(".pg-fgo", fc), fSr = $(".sr", fc), caret = $(".pg-caret", fc);
    const [fTitle, fPrice] = $$(".pg-fhead > *", fc), fDesc = $(".pg-fdesc span", fc);
    const FULL = "left .55s cubic-bezier(.22,1,.36,1), top .55s cubic-bezier(.22,1,.36,1), transform .6s cubic-bezier(.34,1.25,.64,1), opacity .3s ease";
    let open = false, openedAt = 0, focusCell = null, typeTimer = 0, tiltRaf = 0, scrollY0 = 0, tilt = { rx: 0, ry: 0, tx: 0, ty: 0 };

    function openAt(x, y) {
      if (open) return close();
      const hit = document.elementFromPoint(x, y);
      let cell = hit && stage.contains(hit) && hit.closest(".pg-cell");
      if (!cell) { // clic entre deux cases : on prend la plus proche
        let best = size * 0.75;
        for (const el of cells.values()) {
          const r = el.getBoundingClientRect(), d = Math.hypot(r.left + r.width / 2 - x, r.top + r.height / 2 - y);
          if (d < best) { best = d; cell = el; }
        }
      }
      if (cell) openFocus(cell);
    }
    function typewriter(parts) {
      clearTimeout(typeTimer);
      parts.forEach(([el, text]) => { el.textContent = RM ? text : ""; });
      if (RM) return;
      caret.hidden = false;
      let pi = 0, ci = 0;
      const step = () => {
        if (pi >= parts.length) { typeTimer = setTimeout(() => { caret.hidden = true; }, 400); return; }
        const [el, text, speed] = parts[pi];
        if (ci < text.length) { el.textContent += text[ci++]; typeTimer = setTimeout(step, speed + Math.random() * 20); }
        else { pi++; ci = 0; typeTimer = setTimeout(step, 160); }
      };
      step();
    }
    function tiltLoop() {
      if (!open) return;
      tilt.rx += (tilt.tx - tilt.rx) * 0.14; tilt.ry += (tilt.ty - tilt.ry) * 0.14;
      fc.style.transform = `${P} rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`;
      tiltRaf = requestAnimationFrame(tiltLoop);
    }
    function openFocus(cell) {
      const i = +cell.dataset.i, p = items[i], c = cat(p.category) || {};
      const r = cell.getBoundingClientRect();
      const w = Math.min(360, innerWidth - 48, (innerHeight - 140) / 1.3), h = w * 1.3;
      const price = (p.sizes && p.sizes.length ? "dès " : "") + euro(p.price);
      fImg.style.backgroundImage = thumbs[i];
      fc.style.setProperty("--c", c.color || "#8B5CF6");
      fc.setAttribute("aria-label", p.name);
      fCat.href = `categorie.html?c=${c.slug}`; fCat.textContent = c.name || "";
      fGo.href = `produit.html?id=${encodeURIComponent(p.id)}`;
      fSr.textContent = `${p.name}, ${price}. ${p.short || ""}`;
      fTitle.textContent = fPrice.textContent = fDesc.textContent = "";
      Object.assign(fc.style, { width: w + "px", height: h + "px", transition: "none", left: r.left + r.width / 2 + "px", top: r.top + r.height / 2 + "px", opacity: "0", transform: `${P} scale(${r.width / w})` });
      void fc.offsetWidth; // fixe la position de départ avant la transition
      Object.assign(fc.style, { transition: RM ? "opacity .2s" : FULL, left: innerWidth / 2 + "px", top: innerHeight / 2 + "px", opacity: "1", transform: `${P} scale(1)` });
      fc.classList.add("on"); dim.classList.add("on"); stage.classList.add("focused"); fc.inert = false;
      open = true; openedAt = performance.now(); focusCell = cell; scrollY0 = scrollY;
      tilt = { rx: 0, ry: 0, tx: 0, ty: 0 };
      setTimeout(() => { if (open) fGo.focus({ preventScroll: true }); }, 60); // après le passage en visible
      typeTimer = setTimeout(() => {
        if (!open) return;
        typewriter([[fTitle, p.name, 34], [fPrice, price, 28], [fDesc, p.short || "", 12]]);
        if (!RM && FINE) { fc.style.transition = "opacity .3s ease"; tiltLoop(); } // inclinaison 3D à la souris
      }, RM ? 0 : 600);
    }
    function close() {
      if (!open) return;
      open = false; clearTimeout(typeTimer); cancelAnimationFrame(tiltRaf); caret.hidden = true;
      const w = parseFloat(fc.style.width);
      let x = innerWidth / 2, y = innerHeight / 2, s = 0.3;
      if (focusCell && focusCell.isConnected) { const r = focusCell.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; s = r.width / w; }
      Object.assign(fc.style, { transition: RM ? "opacity .2s" : FULL, left: x + "px", top: y + "px", opacity: "0", transform: `${P} scale(${s})` });
      dim.classList.remove("on"); stage.classList.remove("focused");
      if (fc.contains(document.activeElement)) stage.focus({ preventScroll: true });
      fc.inert = true; focusCell = null;
      setTimeout(() => { if (!open) fc.classList.remove("on"); }, 450);
    }
    const soon = () => performance.now() - openedAt < 400; // ignore le « click » qui suit l'appui tactile d'ouverture
    fc.addEventListener("click", (e) => { if (!soon() && !e.target.closest(".pg-cap a")) close(); });
    dim.addEventListener("click", () => { if (!soon()) close(); });
    document.addEventListener("keydown", (e) => {
      if (!open) return;
      if (e.key === "Escape") close();
      else if (e.key === "Tab") { // le focus reste dans la carte
        const f = $$("a, button", fc), first = f[0], lastF = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastF.focus(); }
        else if (!e.shiftKey && document.activeElement === lastF) { e.preventDefault(); first.focus(); }
      }
    });
    addEventListener("mousemove", (e) => {
      if (!open) return;
      const w = parseFloat(fc.style.width), h = parseFloat(fc.style.height);
      tilt.ty = clamp((e.clientX - innerWidth / 2) / (w / 2), -1.4, 1.4) * 10;
      tilt.tx = -clamp((e.clientY - innerHeight / 2) / (h / 2), -1.4, 1.4) * 10;
    }, { passive: true });
    addEventListener("scroll", () => { if (open && Math.abs(scrollY - scrollY0) > 40) close(); }, { passive: true });
  }

  /* Accueil : imprimante 3D qui imprime un objet couche par couche — un pingouin à droite du titre,
     une figurine dans « L'atelier ». La buse balaie chaque couche, le plateau avance et recule
     (comme une vraie imprimante à plateau mobile), le portique monte d'une couche à chaque passage,
     et la bobine prend la couleur du filament en cours. Mis en pause hors écran ; objet terminé
     si « mouvement réduit ». */
  const HP = { N: 37, LH: 4, CX: 240, BASE: 376, E: 0.12 };
  HP.H = HP.N * HP.LH;
  /* Objets dessinés posés sur le plateau (bas = BASE = 376, sommet = 228).
     t : type (e = ellipse, r = rectangle, p = tracé), k : classe de couleur,
     sp : ellipse qui remplace la forme pour calculer la largeur imprimée (ymax : seulement au-dessus) */
  /* Boucles de cheveux de la figurine : [x, y, rayon] */
  const FIG_CURLS = [[199, 254, 8], [209, 243, 9], [224, 238, 9], [240, 237, 9], [256, 238, 9], [271, 243, 9], [281, 254, 8], [191, 267, 6], [289, 267, 6], [222, 256, 6], [240, 255, 6.5], [258, 256, 6]];
  const PRINTS = {
    penguin: {
      name: "un pingouin",
      shapes: [
        { t: "e", k: "pk", cx: 196, cy: 334, rx: 10, ry: 27, rot: 18, sp: { rx: 13, ry: 27 } },  // aile gauche
        { t: "e", k: "pk", cx: 284, cy: 334, rx: 10, ry: 27, rot: -18, sp: { rx: 13, ry: 27 } }, // aile droite
        { t: "e", k: "pk", cx: 240, cy: 335, rx: 46, ry: 41 },                        // corps
        { t: "e", k: "pw", cx: 240, cy: 341, rx: 33, ry: 31 },                        // ventre
        { t: "e", k: "py", cx: 222, cy: 373, rx: 13, ry: 5 },                         // pattes
        { t: "e", k: "py", cx: 258, cy: 373, rx: 13, ry: 5 },
        { t: "e", k: "pk", cx: 240, cy: 282, rx: 33, ry: 33 },                        // tête
        { t: "e", k: "pw", cx: 228, cy: 289, rx: 15, ry: 18 },                        // visage (deux lobes)
        { t: "e", k: "pw", cx: 252, cy: 289, rx: 15, ry: 18 },
        { t: "p", k: "py", d: "M229 296Q240 291 251 296Q246 306 240 306Q234 306 229 296Z" },       // bec
        { t: "r", k: "pr", x: 199, y: 310, w: 82, h: 13, rx: 6.5 },                   // écharpe
        { t: "r", k: "pr2", x: 252, y: 318, w: 12, h: 30, rx: 3 },                    // pan de l'écharpe
        { t: "p", k: "pr", d: "M209 257C211 230 269 230 271 257Z", sp: { cx: 240, cy: 257, rx: 31, ry: 20, ymax: 257 } }, // bonnet
        { t: "r", k: "pr", x: 205, y: 252, w: 70, h: 15, rx: 7 },                     // revers du bonnet
        { t: "e", k: "pr", cx: 240, cy: 237, rx: 9, ry: 9 },                          // pompon
      ],
      details: `<circle class="pe" cx="229" cy="287" r="3.6"/><circle class="pe" cx="251" cy="287" r="3.6"/>
              <circle class="pw" cx="230.2" cy="285.8" r="1.1"/><circle class="pw" cx="252.2" cy="285.8" r="1.1"/>
              <path class="pr2s" d="M254 346v7M257.3 346v7M260.6 346v7M263 346v6M209 316h70${[212, 219, 226, 233, 240, 247, 254, 261, 268].map((x) => `M${x} 254v11`).join("")}"/>
              <circle cx="240" cy="237" r="6" fill="none" stroke="#9E211D" stroke-width="2" stroke-dasharray="1.5 2.2"/>`,
      color: (y) => (y > 368 ? "#F5B82E" : y > 323 ? "#F2F2F5" : y > 310 ? "#D7352F" : y > 268 ? "#2A2E39" : "#D7352F"),
    },
    figurine: {
      name: "une figurine",
      shapes: [
        { t: "e", k: "fo", cx: 228, cy: 370, rx: 14, ry: 7 },                        // chaussures
        { t: "e", k: "fo", cx: 252, cy: 370, rx: 14, ry: 7 },
        { t: "r", k: "fp", x: 222, y: 329, w: 36, h: 37, rx: 3 },                     // pantalon
        { t: "r", k: "fk", x: 205, y: 297, w: 15, h: 37, rx: 7, rot: 8 },             // manches
        { t: "r", k: "fk", x: 260, y: 297, w: 15, h: 37, rx: 7, rot: -8 },
        { t: "e", k: "fs", cx: 209, cy: 338, rx: 6, ry: 7.5 },                        // mains
        { t: "e", k: "fs", cx: 271, cy: 338, rx: 6, ry: 7.5 },
        { t: "r", k: "fk", x: 218, y: 295, w: 44, h: 37, rx: 5 },                     // haut noir
        { t: "r", k: "fv", x: 217, y: 297, w: 19, h: 33, rx: 3 },                     // gilet
        { t: "r", k: "fv", x: 244, y: 297, w: 19, h: 33, rx: 3 },
        { t: "r", k: "fb", x: 220, y: 326, w: 40, h: 6, rx: 2 },                      // ceinture
        { t: "r", k: "fs", x: 192, y: 230, w: 96, h: 70, rx: 28 },                    // tête
        { t: "p", k: "fh", d: "M190 272C184 240 206 228 240 228C274 228 296 240 290 272C287 262 282 256 272 254C252 250 228 250 208 254C198 256 193 262 190 272Z", sp: { cx: 240, cy: 262, rx: 52, ry: 34, ymax: 272 } }, // cheveux
        ...FIG_CURLS.map(([cx, cy, r]) => ({ t: "e", k: "fh", cx, cy, rx: r, ry: r })), // boucles
      ],
      details: `<path class="fhs" d="${FIG_CURLS.map(([x, y, r]) => `M${x - r / 2} ${y + 1}a${r / 2} ${r / 2} 0 1 1 ${r / 2} ${r / 2}`).join("")}"/>
              <path class="fhs" stroke-width="3.2" d="M208 268q9-5 19-2M253 266q10-3 19 2"/>
              <circle class="pe" cx="219" cy="280" r="8"/><circle class="pe" cx="261" cy="280" r="8"/>
              <circle class="pw" cx="221.5" cy="277.5" r="2"/><circle class="pw" cx="263.5" cy="277.5" r="2"/>
              <path d="M238 292l2-7 2 7z" fill="#DDA185"/>
              <path d="M234 299l6 7 6-7M240 306v20" fill="none" stroke="#E9EAEC" stroke-width="1.6"/>
              <path class="fvs" d="M219 311h12v8h-12zM249 311h12v8h-12zM240 336v30"/>
              <rect x="235.5" y="326" width="9" height="6" rx="1" fill="#D6D9DD"/>`,
      color: (y) => (y > 362 ? "#4B5058" : y > 332 ? "#A7ABB1" : y > 300 ? "#26282E" : y > 262 ? "#EAC29A" : "#B39A5A"),
    },
  };
  const printShape = (s, cls = true) => {
    const c = cls ? ` class="${s.k}"` : "";
    if (s.t === "e") return `<ellipse${c} cx="${s.cx}" cy="${s.cy}" rx="${s.rx}" ry="${s.ry}"${s.rot ? ` transform="rotate(${s.rot} ${s.cx} ${s.cy})"` : ""}/>`;
    if (s.t === "r") return `<rect${c} x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="${s.rx}"${s.rot ? ` transform="rotate(${s.rot} ${s.x + s.w / 2} ${s.y + s.h / 2})"` : ""}/>`;
    return `<path${c} d="${s.d}"/>`;
  };
  /* Largeur à imprimer à la hauteur y : [gauche, droite] */
  const printSpan = (shapes, y) => {
    let l = Infinity, r = -Infinity;
    const add = (a, b) => { l = Math.min(l, a); r = Math.max(r, b); };
    for (const s of shapes) {
      const e = s.sp ? { cx: s.cx, cy: s.cy, ...s.sp } : s.t === "e" ? s : null;
      if (e) { if (e.ymax != null && y > e.ymax) continue; const v = (y - e.cy) / e.ry; if (Math.abs(v) < 1) { const h = e.rx * Math.sqrt(1 - v * v); add(e.cx - h, e.cx + h); } }
      else if (s.t === "r" && y >= s.y && y <= s.y + s.h) add(s.x, s.x + s.w);
    }
    return l < r ? [l, Math.max(r, l + 6)] : [237, 243];
  };

  function heroPrinterSvg(uid = "hp", obj = "penguin") {
    const { N, LH, BASE } = HP, P = PRINTS[obj];
    const art = P.shapes.map((s) => printShape(s)).join("");
    const clip = P.shapes.map((s) => printShape(s, false)).join("");
    const shades = Array.from({ length: N }, () => `<rect fill="url(#${uid}Shade)"/>`).join("");
    const layerLines = Array.from({ length: N }, (_, i) => `M150 ${BASE - i * LH - 0.4}h180`).join(""); // lignes de couches
    const vents = [0, 1, 2, 3, 4, 5].map((j) => `M24 ${-92 + j * 6}h40`).join("");
    return `<svg class="hp" data-obj="${obj}" viewBox="0 0 480 480" role="img" aria-label="Animation : une imprimante 3D imprime ${P.name} couche par couche">
      <defs>
        <linearGradient id="${uid}Shade"><stop stop-color="#000" stop-opacity=".4"/><stop offset=".3" stop-color="#fff" stop-opacity=".2"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></linearGradient>
        <clipPath id="${uid}Shape">${clip}</clipPath>
        <clipPath id="${uid}Rev"><rect class="hp-done" x="0" width="480"/><rect class="hp-cur"/></clipPath>
        <filter id="${uid}Blur" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="3"/></filter>
      </defs>
      <ellipse class="hp-ground" cx="240" cy="464" rx="236" ry="9"/>
      <path class="c1" d="M48 396h384l22 16H26z"/>
      <rect class="c2" x="26" y="412" width="428" height="48" rx="2"/>
      <rect class="c3" x="26" y="455" width="428" height="5"/>
      <rect class="c1" x="44" y="424" width="34" height="10" rx="2"/><rect class="c1" x="44" y="438" width="34" height="10" rx="2"/>
      <rect class="c2" x="66" y="104" width="26" height="296"/><rect class="c3" x="86" y="122" width="6" height="278"/>
      <rect class="c2" x="388" y="104" width="26" height="296"/><rect class="c3" x="388" y="122" width="6" height="278"/>
      <rect class="c2" x="58" y="98" width="364" height="24"/><rect class="c3" x="58" y="98" width="364" height="6"/>
      <g transform="translate(380 60)">
        <circle class="c3" r="38"/><circle class="hp-reel" r="31"/>
        <circle r="25" fill="none" stroke="#000" stroke-opacity=".16"/><circle r="20" fill="none" stroke="#000" stroke-opacity=".16"/>
        <g class="hp-spokes"><path class="c2" d="M-5-33h10v18H-5z"/><path class="c2" d="M-5-33h10v18H-5z" transform="rotate(120)"/><path class="c2" d="M-5-33h10v18H-5z" transform="rotate(240)"/><circle class="c2" r="16"/><circle class="hp-hole-c" r="7"/></g>
      </g>
      <g class="hp-bed">
        <ellipse class="c3" cx="104" cy="401" rx="20" ry="5"/><ellipse class="c3" cx="376" cy="401" rx="20" ry="5"/>
        <path class="hp-plate" d="M112 350h256l36 40H76z"/>
        <path class="hp-plate2" d="M76 390h328v7H76z"/>
        <path class="hp-sheen" d="M150 350h44l-48 40h-52zM300 350h20l-40 40h-24z"/>
        <g class="hp-obj">
          <ellipse class="hp-shadow" cx="240" cy="377" rx="58" ry="7"/>
          <g clip-path="url(#${uid}Rev)">
            <g class="hp-art">${art}
              ${P.details}
            </g>
            <g clip-path="url(#${uid}Shape)">
              <g class="hp-shades">${shades}</g>
              <path d="${layerLines}" stroke="#000" stroke-opacity=".2" stroke-width=".8"/>
              <rect class="hp-fresh" height="1.4"/>
            </g>
          </g>
        </g>
      </g>
      <g class="hp-gantry">
        <rect class="hp-rod" x="92" y="-68" width="296" height="5" rx="2.5"/>
        <path d="M92-54H388" stroke="var(--hp-c3)" stroke-width="3" stroke-dasharray="4 3"/>
        <rect class="hp-rod" x="92" y="-42" width="296" height="5" rx="2.5"/>
        <rect class="c3" x="82" y="-78" width="16" height="50" rx="2"/><rect class="c3" x="382" y="-78" width="16" height="50" rx="2"/>
      </g>
      <g class="hp-head">
        <rect class="c3" x="14" y="-100" width="56" height="46" rx="3"/>
        <path d="${vents}" stroke="var(--hp-c1)" stroke-width="2.5"/>
        <path d="M-30-74c-24-2-26 32-4 38" fill="none" stroke="var(--hp-rod)" stroke-width="2.5"/>
        <rect class="c1" x="-30" y="-88" width="60" height="64" rx="4"/>
        <rect class="c2" x="-26" y="-96" width="44" height="10" rx="2"/>
        <rect class="c3" x="-6" y="-102" width="8" height="8" rx="1"/>
        <circle class="c2" cy="-56" r="19"/>
        <g class="hp-fan" fill="var(--hp-c1)"><path d="M0-56c2-8 8-12 14-10-3 6-8 9-14 10zM0-56c8 2 12 8 10 14-6-3-9-8-10-14zM0-56c-2 8-8 12-14 10 3-6 8-9 14-10zM0-56c-8-2-12-8-10-14 6 3 9 8 10 14z"/></g>
        <circle class="c3" cy="-56" r="4.5"/>
        <rect class="hp-heat" x="-11" y="-24" width="22" height="12" rx="1.5"/>
        <path class="hp-rod-f" d="M-6-12h12l-4 10h-4z"/>
      </g>
      <circle class="hp-glow" r="6" filter="url(#${uid}Blur)"/>
      <path class="hp-fil" fill="none" stroke-width="3" stroke-linecap="round"/>
    </svg>`;
  }

  function heroPrinter(svg, shift = 0) {
    const { N, LH, BASE, E, H } = HP, PI = Math.PI, P = PRINTS[svg.dataset.obj] || PRINTS.penguin;
    const T_IN = 0.9, L = 0.32, T_PRINT = N * L, T_OUT = 0.9, HOLD = 2.6, FADE = 0.8;
    const CYCLE = T_IN + T_PRINT + T_OUT + HOLD + FADE, PARK = [150, BASE - H];
    const q = (s) => svg.querySelector(s);
    const bed = q(".hp-bed"), obj = q(".hp-obj"), done = q(".hp-done"), cur = q(".hp-cur"), fresh = q(".hp-fresh"),
      gantry = q(".hp-gantry"), head = q(".hp-head"), fan = q(".hp-fan"), glow = q(".hp-glow"),
      fil = q(".hp-fil"), reel = q(".hp-reel"), spokes = q(".hp-spokes");
    const shades = [...svg.querySelectorAll(".hp-shades rect")];
    const f1 = (n) => n.toFixed(1);
    const top = (i) => BASE - (i + 1) * LH;      // dessus de la couche i (= pointe de la buse)
    const ease = (x) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);
    const lerp = (a, b, s) => a + (b - a) * s;
    const SPAN = Array.from({ length: N }, (_, i) => printSpan(P.shapes, top(i) + LH / 2));
    let shown = -1, raf = 0, visible = true;

    SPAN.forEach(([l, r], i) => { const s = shades[i]; s.setAttribute("x", f1(l)); s.setAttribute("width", f1(r - l)); s.setAttribute("y", f1(top(i))); s.setAttribute("height", f1(LH + (i ? 0.4 : 8))); });
    const set = (e, a) => { for (const k in a) e.setAttribute(k, typeof a[k] === "number" ? f1(a[k]) : a[k]); };

    /* Couches terminées : tout ce qui est sous le dessus de la couche k-1 */
    function show(k) {
      if (k === shown) return;
      shown = k;
      const y = k ? top(k - 1) : BASE + 20;
      set(done, { y, height: BASE + 20 - y });
      shades.forEach((r, i) => r.style.display = i < k + 1 ? "" : "none");
    }

    function draw(now) {
      const T = now / 1000 + shift, t = RM ? T_IN + T_PRINT + T_OUT + 0.5 : T % CYCLE;
      let k, nx, ny, dy = 0, cy = BASE, heat = 0, op = 1, curW = 0;
      if (t < T_IN) {                                   // la buse descend vers la première couche
        const s = ease(t / T_IN); k = 0;
        nx = lerp(PARK[0], SPAN[0][0], s); ny = lerp(PARK[1], top(0), s); heat = s;
      } else if (t < T_IN + T_PRINT) {                 // impression : aller (couche déposée) puis retour
        const x = (t - T_IN) / L; k = Math.floor(x);
        const f = x - k, phi = PI - 2 * PI * f, [l, r] = SPAN[k], c = (l + r) / 2, rr = (r - l) / 2;
        nx = c + rr * Math.cos(phi); ny = top(k); dy = -E * rr * Math.sin(phi); heat = 1; cy = top(k) + LH / 2;
        curW = f < 0.5 ? nx - l + 1 : r - l + 2;
        set(cur, { x: l - 1, y: top(k) - 0.3, width: curW, height: LH + 0.6 });
        set(fresh, { x: l, y: top(k), width: Math.max(0, curW - 1) });
      } else {                                          // la tête se range, pause, le pingouin disparaît
        const t2 = t - T_IN - T_PRINT, s = ease(Math.min(1, t2 / T_OUT)), fo = Math.max(0, (t2 - T_OUT - HOLD) / FADE);
        k = N; nx = lerp(SPAN[N - 1][0], PARK[0], s); ny = lerp(top(N - 1), PARK[1], s);
        heat = 1 - s; op = 1 - fo; cy = fo > 0 ? BASE : top(N - 1);
      }
      if (!curW) { set(cur, { width: 0 }); set(fresh, { width: 0 }); }
      show(k);
      obj.style.opacity = op;
      bed.setAttribute("transform", `translate(0 ${f1(dy)})`);
      gantry.setAttribute("transform", `translate(0 ${f1(ny)})`);
      head.setAttribute("transform", `translate(${f1(nx)} ${f1(ny)})`);
      fan.setAttribute("transform", `rotate(${RM ? 20 : (T * 900) % 360} 0 -56)`);
      glow.setAttribute("cx", f1(nx)); glow.setAttribute("cy", f1(ny - 2)); glow.style.opacity = heat * 0.9;
      const ex = nx - 2, ey = ny - 102;
      fil.setAttribute("d", `M413 80C430 150 ${f1(ex + 100)} ${f1(ey - 60)} ${f1(ex)} ${f1(ey)}`);
      fil.style.stroke = reel.style.fill = P.color(cy);
      const spun = t < T_IN ? 0 : Math.min(1, (t - T_IN) / T_PRINT);
      spokes.setAttribute("transform", `rotate(${f1(-spun * 540)})`);
      if (!RM && visible) raf = requestAnimationFrame(draw);
    }
    const start = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); };
    start();
    new IntersectionObserver(([e]) => { visible = e.isIntersecting && !document.hidden; if (visible) start(); }).observe(svg);
    document.addEventListener("visibilitychange", () => { visible = !document.hidden; if (visible) start(); });
  }

  /* ================= CATALOGUE (boutique + pages catégorie) ================= */
  function catalog(root, fixedCategory = null) {
    const state = { q: "", cat: "all", mat: "all", sort: "new" };
    const scope = fixedCategory ? catFamily(fixedCategory) : null; // une catégorie montre aussi les objets de ses sous-catégories
    const pool = scope ? PRODUCTS.filter((p) => scope.includes(p.category)) : PRODUCTS;
    const chipCats = fixedCategory ? subcats(fixedCategory) : roots();
    const family = (p) => (/PETG/i.test(p.material) ? "PETG" : "PLA");
    root.innerHTML = `
      ${!chipCats.length ? "" : `<div class="chips" role="group" aria-label="Filtrer par ${fixedCategory ? "sous-catégorie" : "catégorie"}">
        <button class="chip" type="button" data-cat="all" aria-pressed="true">Tout</button>
        ${chipCats.map((c) => `<button class="chip" type="button" data-cat="${c.slug}" aria-pressed="false" style="--c:${c.color}">${icon(c.icon)}${esc(c.name)}</button>`).join("")}
      </div>`}
      <div class="toolbar">
        <div class="field">${icon("search")}<label class="sr" for="q">Rechercher un produit</label><input class="input" id="q" type="search" placeholder="Rechercher" autocomplete="off"></div>
        <label class="sr" for="mat">Matériau</label>
        <select class="select" id="mat"><option value="all">Tous les matériaux</option><option value="PLA">PLA</option><option value="PETG">PETG</option></select>
        <label class="sr" for="sort">Trier par</label>
        <select class="select" id="sort">
          <option value="new">Nouveautés</option><option value="pop">Popularité</option>
          <option value="asc">Prix croissant</option><option value="desc">Prix décroissant</option>
        </select>
        <p class="count" aria-live="polite"></p>
      </div>
      <div class="grid"></div>`;
    const grid = $(".grid", root), count = $(".count", root);
    const sorters = { new: (a, b) => b.date.localeCompare(a.date), pop: (a, b) => b.popularity - a.popularity, asc: (a, b) => a.price - b.price, desc: (a, b) => b.price - a.price };
    function apply() {
      const q = state.q.toLowerCase(), fam = state.cat === "all" ? null : catFamily(state.cat);
      const list = pool.filter((p) =>
        (!fam || fam.includes(p.category)) &&
        (state.mat === "all" || family(p) === state.mat) &&
        (!q || (p.name + " " + p.short + " " + cat(p.category).name).toLowerCase().includes(q))
      ).sort(sorters[state.sort]);
      count.textContent = `${list.length} création${list.length > 1 ? "s" : ""}`;
      grid.innerHTML = list.length ? list.map(card).join("") : `<div class="empty" data-reveal="scale">${spool}
        <h2>Aucun produit pour le moment</h2>
        <p>${pool.length ? "Rien ne correspond à ces filtres. Essayez une autre recherche." : "Le plateau chauffe : de nouvelles créations arrivent bientôt dans cette catégorie."}</p>
        <a class="btn btn-ghost btn-sm" href="contact.html?sur-mesure=1">Demander une création sur mesure</a></div>`;
      enhance(grid);
    }
    root.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip"); if (!chip) return;
      state.cat = chip.dataset.cat;
      $$(".chip", root).forEach((c) => c.setAttribute("aria-pressed", c === chip));
      apply();
    });
    $("#q", root).addEventListener("input", (e) => { state.q = e.target.value.trim(); apply(); });
    $("#mat", root).addEventListener("change", (e) => { state.mat = e.target.value; apply(); });
    $("#sort", root).addEventListener("change", (e) => { state.sort = e.target.value; apply(); });
    apply();
  }

  function shop() {
    main.innerHTML = `
      <section class="wrap page-head">
        <p class="kicker" data-reveal>La boutique</p>
        <h1 data-reveal>Toutes les <span class="grad-text">créations</span></h1>
        <p class="lead" data-reveal style="--i:1">${PRODUCTS.length} objets imprimés à la demande, dans la couleur de votre choix. Filtrez, triez, craquez.</p>
      </section>
      <section class="wrap" id="catalog" aria-label="Catalogue"></section>
      ${extBlock()}`;
    catalog($("#catalog"));
  }

  function category() {
    const c = cat(params.get("c"));
    if (!c) { // catégorie inconnue : on propose la liste complète
      main.innerHTML = `<section class="wrap page-head"><h1>Les catégories</h1><p class="lead">Choisissez un univers.</p></section><section class="wrap"><div class="cats">${roots().map(catCard).join("")}</div></section>`;
      return;
    }
    setMeta(`${c.name} — objets imprimés en 3D`, `${c.short}. ${c.description}`);
    main.innerHTML = `
      <section class="wrap">
        <div class="cat-hero fx-${c.fx}" style="--c:${c.color};--c2:${c.color2}" data-reveal="scale">
          <ol class="crumbs"><li><a href="index.html">Accueil</a></li><li><a href="boutique.html">Boutique</a></li>${lineage(c).slice(0, -1).map((x) => `<li><a href="categorie.html?c=${x.slug}">${esc(x.name)}</a></li>`).join("")}<li aria-current="page">${esc(c.name)}</li></ol>
          <h1>${esc(c.name)}</h1>
          <p class="lead">${esc(c.description)}</p>
          ${icon(c.icon, "big-ic")}
        </div>
      </section>
      <section class="wrap" id="catalog" aria-label="Produits de la catégorie ${esc(c.name)}"></section>
      <section class="section" aria-labelledby="oc-t"><div class="wrap">
        <header class="sec-h" data-reveal><h2 id="oc-t">Autres univers</h2></header>
        <div class="cats">${roots().filter((x) => !lineage(c).includes(x)).slice(0, 4).map(catCard).join("")}</div>
      </div></section>`;
    catalog($("#catalog"), c.slug);
  }

  /* ================= FICHE PRODUIT ================= */
  function productPage() {
    const p = product(params.get("id"));
    if (!p) {
      main.innerHTML = `<section class="wrap section"><div class="empty">${spool}<h1 style="font-size:1.4rem">Produit introuvable</h1><p>Cette création a peut-être quitté le plateau.</p><a class="btn btn-primary" href="boutique.html">Retour à la boutique</a></div></section>`;
      return;
    }
    const c = cat(p.category);
    const views = p.images.length || 3;
    const sel = { color: p.colors[0] || null, size: p.sizes[0] ? p.sizes[0].label : null };
    const unit = () => p.price + ((p.sizes.find((s) => s.label === sel.size) || {}).extra || 0);
    const similar = [...PRODUCTS.filter((x) => x.category === p.category && x !== p), ...PRODUCTS.filter((x) => x.category !== p.category).sort((a, b) => b.popularity - a.popularity)].slice(0, 7);
    setMeta(`${p.name} — ${c.name}`, `${p.short} ${p.material}, ${p.dimensions}. ${euro(p.price)}.`);

    main.innerHTML = `
      <section class="wrap" style="padding-top:28px">
        <ol class="crumbs"><li><a href="index.html">Accueil</a></li><li><a href="boutique.html">Boutique</a></li>${lineage(c).map((x) => `<li><a href="categorie.html?c=${x.slug}">${esc(x.name)}</a></li>`).join("")}<li aria-current="page">${esc(p.name)}</li></ol>
        <div class="product" style="--c:${c.color}">
          <div class="gallery" data-reveal="left">
            <div class="stage"><div class="zoom" id="zoom">${media(p, 0, true)}</div>
              ${views + (p.model3d ? 1 : 0) > 1 ? `<button class="g-nav g-prev" type="button" aria-label="Photo précédente">${icon("arrow")}</button><button class="g-nav g-next" type="button" aria-label="Photo suivante">${icon("arrow")}</button>` : ""}</div>
            <div class="thumbs" role="group" aria-label="Vues du produit">
              ${Array.from({ length: views }, (_, i) => `<button class="thumb" type="button" data-v="${i}" aria-pressed="${i === 0}" aria-label="Afficher la vue ${i + 1}">${media(p, i)}</button>`).join("")}            </div>
          </div>

          <div class="p-info" data-reveal="right">
            <a class="p-cat" href="categorie.html?c=${c.slug}">${icon(c.icon)}${esc(c.name)}</a>
            <h1>${esc(p.name)}</h1>
            <p class="lead" style="margin:0">${esc(p.short)}</p>
            <p class="p-price" id="price" aria-live="polite">${euro(unit())}</p>
            <p class="p-tax">TVA non applicable, art. 293 B du CGI · livraison offerte dès ${euro(SITE.shipping.freeFrom)}</p>

            <form id="buy">
              ${p.colors.length ? `<fieldset class="opt"><legend>Couleur de filament : <span id="color-name">${esc(FILAMENTS[sel.color].name)}</span></legend>
                <div class="swatches">${p.colors.map((k, i) => `<label class="swatch" title="${esc(FILAMENTS[k].name)}"><input type="radio" name="color" value="${k}" ${i ? "" : "checked"}><span style="--sw:${FILAMENTS[k].hex}"></span><span class="sr">${esc(FILAMENTS[k].name)}</span></label>`).join("")}</div></fieldset>` : ""}
              ${p.sizes.length ? `<fieldset class="opt"><legend>Taille</legend>
                <div class="swatches">${p.sizes.map((s, i) => `<label class="pill"><input type="radio" name="size" value="${esc(s.label)}" ${i ? "" : "checked"}><span>${esc(s.label)}${s.extra ? ` <small>+${euro(s.extra)}</small>` : ""}</span></label>`).join("")}</div></fieldset>` : ""}
              <div class="buy">
                <button class="btn btn-primary add-btn" type="submit" data-magnetic>${icon("cart")} Ajouter au panier</button>
                <div class="in-cart" hidden>
                  ${qtyHTML(1, "Quantité dans le panier")}
                  <a class="btn btn-ghost" href="panier.html">Voir le panier ${icon("arrow", "ic-arrow")}</a>
                </div>
              </div>
            </form>

            <ul class="assure">
              <li>${icon("clock")}Imprimé à la commande · fabrication : ${esc(p.printTime)}</li>
              <li>${icon("box")}Emballage protecteur, livraison offerte dès ${euro(SITE.shipping.freeFrom)}</li>
              <li>${icon("shield")}Rétractation 14 jours (hors pièces personnalisées)</li>
            </ul>

            <ul class="assure credits">
              <li>${icon("etoile")}Créateur : ${esc(p.creator || "Non renseigné")}</li>
              <li>${icon("shield")}Licence : ${esc(p.license || "Non renseignée")}</li>
            </ul>

            <dl class="specs">
              <div><dt>Matériau</dt><dd>${esc(p.material)}</dd></div>
              <div><dt>Temps de fabrication</dt><dd>${esc(p.printTime)}</dd></div>
              <div><dt>Dimensions</dt><dd>${esc(p.dimensions)}</dd></div>
              <div><dt>Poids</dt><dd>${esc(p.weight)}</dd></div>
            </dl>

            <div class="p-desc"><h2>Description détaillée</h2><p>${esc(p.description)}</p></div>

            ${(() => {
              const links = SITE.stores.filter((s) => p[s.id]);
              return links.length ? `<p class="also">Aussi disponible sur
              ${links.map((s) => `<a href="${esc(p[s.id])}" ${extAttrs} style="--sc:${s.color}">${storeLogo(s)}${esc(s.name)}<span class="sr"> (nouvel onglet)</span></a>`).join("")}
            </p>` : "";
            })()}
          </div>
        </div>
      </section>

      <section class="section" aria-labelledby="sim-t"><div class="wrap">
        <header class="sec-h" data-reveal><div><p class="kicker">Dans le même esprit</p><h2 id="sim-t">Produits similaires</h2></div>
          <div class="car-nav"><button class="prev" type="button" aria-label="Produits précédents">${icon("arrow")}</button><button class="next" type="button" aria-label="Produits suivants">${icon("arrow")}</button></div></header>
        <div class="carousel" tabindex="0" aria-label="Carrousel de produits similaires">${similar.map(card).join("")}</div>
      </div></section>`;

    /* Galerie : miniatures, zoom qui suit la souris */
    const zoom = $("#zoom");
    const thumbs = $$(".thumb");
    const go = (d) => { const i = thumbs.findIndex((x) => x.getAttribute("aria-pressed") === "true"); thumbs[(i + d + thumbs.length) % thumbs.length].click(); };
    $$(".g-nav").forEach((n) => n.addEventListener("click", () => go(n.classList.contains("g-next") ? 1 : -1)));
    $(".gallery").addEventListener("keydown", (e) => { if (thumbs.length < 2 || e.target.closest("model-viewer")) return; if (e.key === "ArrowRight") { e.preventDefault(); go(1); } else if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); } });
    $(".thumbs").addEventListener("click", (e) => {
      const t = e.target.closest(".thumb"); if (!t) return;
      $$(".thumb").forEach((x) => x.setAttribute("aria-pressed", x === t));
      zoom.classList.remove("zoomed", "swap"); void zoom.offsetWidth; zoom.classList.add("swap");
      zoom.innerHTML = media(p, +t.dataset.v, true); zoom.style.cursor = "";
    });
    zoom.addEventListener("pointermove", (e) => { const r = zoom.getBoundingClientRect(); zoom.style.setProperty("--zx", ((e.clientX - r.left) / r.width) * 100 + "%"); zoom.style.setProperty("--zy", ((e.clientY - r.top) / r.height) * 100 + "%"); });
    zoom.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") zoom.classList.add("zoomed"); });
    zoom.addEventListener("pointerleave", () => zoom.classList.remove("zoomed"));
    zoom.addEventListener("click", (e) => { if (e.pointerType && e.pointerType !== "mouse") zoom.classList.toggle("zoomed"); });

    /* Options, quantité, ajout au panier */
    const form = $("#buy"), addBtn = $(".add-btn"), inCart = $(".in-cart");
    /* Bouton « Ajouter » tant que la variante choisie n'est pas au panier, sinon − quantité + */
    const syncBuy = () => {
      const n = Cart.qtyOf(p.id, sel), focused = form.contains(document.activeElement) && document.activeElement.closest(".buy");
      addBtn.hidden = n > 0; inCart.hidden = !n;
      if (n) $("output", inCart).textContent = n;
      if (focused) (n ? $('[data-step="1"]', inCart) : addBtn).focus();
    };
    form.addEventListener("change", () => {
      const d = new FormData(form);
      sel.color = d.get("color"); sel.size = d.get("size");
      if (sel.color) $("#color-name").textContent = FILAMENTS[sel.color].name;
      $("#price").textContent = euro(unit());
      syncBuy();
    });
    form.addEventListener("click", (e) => { const b = e.target.closest("[data-step]"); if (b) stepQty(p, sel, +b.dataset.step); });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      flyToCart(addBtn); Cart.add(p.id, sel);
      toast(`${esc(p.name)} ajouté au panier`);
    });
    document.addEventListener("cart:change", syncBuy);
    syncBuy();

    /* Carrousel */
    const car = $(".carousel");
    $(".car-nav .prev").addEventListener("click", () => car.scrollBy({ left: -car.clientWidth * 0.8, behavior: RM ? "auto" : "smooth" }));
    $(".car-nav .next").addEventListener("click", () => car.scrollBy({ left: car.clientWidth * 0.8, behavior: RM ? "auto" : "smooth" }));

    /* Données structurées « Product » pour les moteurs de recherche */
    const abs = (u) => new URL(u, SITE.url + "/").href;
    jsonLd({
      "@context": "https://schema.org", "@type": "Product", name: p.name, description: p.description, sku: p.id, category: c.name, material: p.material,
      brand: { "@type": "Brand", name: SITE.name }, ...(p.images.length ? { image: p.images.map(abs) } : {}),
      offers: { "@type": "Offer", price: p.price.toFixed(2), priceCurrency: "EUR", availability: "https://schema.org/InStock", url: abs(`produit.html?id=${p.id}`) }
    });
  }

  /* ================= À PROPOS ================= */
  function about() {
    main.innerHTML = `
      <section class="wrap page-head">
        <p class="kicker" data-reveal>${esc(ABOUT.kicker || "À propos")}</p>
        <h1 data-reveal>${esc(ABOUT.title)}</h1>
      </section>
      <section class="wrap split">
        <div data-reveal="left">${ABOUT.story.map((t, i) => `<p${i ? ' class="muted"' : ' style="font-size:1.15rem"'}>${esc(t)}</p>`).join("")}
          <a class="btn btn-primary" href="contact.html?sur-mesure=1" data-magnetic style="margin-top:12px">${esc(ABOUT.cta || "Parler de votre projet")} ${icon("arrow", "ic-arrow")}</a></div>
        <div class="split-media" data-reveal="right"><div data-parallax=".1">${printer("a")}</div></div>
      </section>

      <section class="section" aria-labelledby="ph-t"><div class="wrap">
        <header class="sec-h" data-reveal><div><p class="kicker">${esc(ABOUT.photosKicker || "")}</p><h2 id="ph-t">${esc(ABOUT.photosTitle || "")}</h2></div>
          ${SITE.demo && ABOUT.photos.some((x) => !x.src) ? '<span class="demo-note">Visuels d\'illustration — ajoutez vos photos depuis l\'administration</span>' : ""}</header>
        <div class="photos">${ABOUT.photos.map((ph, i) => `<figure data-reveal="scale" style="--i:${i}">
          ${ph.src ? `<img src="${esc(ph.src)}" alt="${esc(ph.alt)}" loading="lazy" decoding="async">` : i === 0 ? printer("f") : UI.art({ id: "atelier" + i, name: ph.alt, category: (CATEGORIES[i === 1 ? 1 : 7] || CATEGORIES[0]).slug }, i)}
          <figcaption>${esc(ph.caption)}</figcaption></figure>`).join("")}</div>
      </div></section>

      <section class="section" style="padding-top:0" aria-labelledby="pr-t"><div class="wrap">
        <header class="sec-h" data-reveal style="justify-content:center;text-align:center"><div><p class="kicker" style="justify-content:center">${esc(ABOUT.processKicker || "")}</p><h2 id="pr-t">${esc(ABOUT.processTitle || "").replace(/\*(.+?)\*/g, '<span class="grad-text">$1</span>')}</h2></div></header>
        <ol class="timeline">
          ${ABOUT.process.map((s, i) => `<li class="tl-item" data-reveal><span class="tl-num" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`).join("")}
        </ol>
      </div></section>
      ${extBlock()}`;

    /* La frise se remplit au fil du défilement */
    const tl = $(".timeline");
    const fill = () => { const r = tl.getBoundingClientRect(); tl.style.setProperty("--tl", Math.max(0, Math.min(1, (innerHeight * 0.65 - r.top) / r.height))); };
    if (RM) tl.style.setProperty("--tl", 1); else { addEventListener("scroll", fill, { passive: true }); fill(); }
  }

  /* ================= CONTACT ================= */
  function contact() {
    const custom = params.has("sur-mesure");
    main.innerHTML = `
      <section class="wrap page-head">
        <p class="kicker" data-reveal>Contact</p>
        <h1 data-reveal>Une question, <span class="grad-text">une idée ?</span></h1>
      </section>
      <section class="wrap contact">
        <div data-reveal="left">
          <p style="font-size:1.12rem">Une pièce cassée à refaire, un cadeau personnalisé, une figurine dans une couleur précise ? Racontez-moi, je réponds en général sous 48 h.</p>
          <ul class="contact-list">
            <li><span class="dd-ic">${icon("mail")}</span><a href="mailto:${esc(SITE.email)}">${esc(SITE.email)}</a></li>
            <li><span class="dd-ic">${icon("clock")}</span>Réponse sous 48 h ouvrées</li>
            <li><span class="dd-ic">${icon("cube")}</span>Devis gratuit pour le sur-mesure</li>
          </ul>
        </div>
        <div class="panel" data-reveal="right" id="contact-panel">
          <form class="form" id="contact-form" novalidate>
            ${fg("prenom", "Prénom", { required: true, auto: "given-name" })}
            ${fg("nom", "Nom", { required: true, auto: "family-name" })}
            ${fg("email", "Votre e-mail", { required: true, type: "email", auto: "email", full: true })}
            <div class="fg full"><label class="check"><input type="checkbox" id="f-perso" name="personnalisation" ${custom ? "checked" : ""}><span><b>C'est une demande de personnalisation</b><br><span class="muted">Pièce sur mesure, couleur spéciale, gravure…</span></span></label></div>
            <div class="custom-fields full${custom ? " open" : ""}"><div><div class="form">
              ${fg("dimensions", "Dimensions approximatives", { placeholder: "ex. 12 × 8 × 5 cm" })}
              ${fg("couleur", "Couleur souhaitée", { placeholder: "ex. noir mat" })}
            </div></div></div>
            ${fg("message", "Votre message", { required: true, area: true, full: true, placeholder: "Décrivez votre idée, l'usage prévu, la quantité…" })}
            <div aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden"><label>Ne pas remplir<input type="text" name="site_web" tabindex="-1" autocomplete="off"></label></div>
            <div class="fg full"><label class="check"><input type="checkbox" name="accord" required><span>J'accepte que ces informations servent à répondre à ma demande (<a href="confidentialite.html">confidentialité</a>).</span></label><p class="err-msg" role="alert"></p></div>
            <div class="full"><button class="btn btn-primary" type="submit" data-magnetic>Envoyer le message ${icon("arrow", "ic-arrow")}</button></div>
          </form>
        </div>
      </section>
      ${extBlock()}`;

    const form = $("#contact-form"), extra = $(".custom-fields");
    $("#f-perso").addEventListener("change", (e) => extra.classList.toggle("open", e.target.checked));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!validate(form)) return;
      const d = Object.fromEntries(new FormData(form));
      const perso = !!d.personnalisation;
      const fullName = `${d.prenom} ${d.nom}`.trim();
      const subject = `${perso ? "Demande de personnalisation" : "Message"} — ${fullName}`;
      const body = `${d.message}\n\n${perso ? `Dimensions : ${d.dimensions || "—"}\nCouleur : ${d.couleur || "—"}\n\n` : ""}${fullName}\n${d.email}`;
      let viaMail = !SITE.formEndpoint;
      if (SITE.formEndpoint) {
        const btn = $("button[type=submit]", form); btn.disabled = true;
        try { const r = await fetch(SITE.formEndpoint, { method: "POST", headers: { Accept: "application/json" }, body: new FormData(form) }); if (!r.ok) throw 0; }
        catch { btn.disabled = false; toast(`L'envoi a échoué. Réessayez ou écrivez-moi à ${SITE.email}.`); return; }
      } else location.href = mailto(subject, body);
      $("#contact-panel").innerHTML = `<div class="success" role="status">${tick}
        <h2>${viaMail ? "Votre message est prêt" : "Message envoyé"}</h2>
        <p class="muted">${viaMail ? "Votre messagerie vient de s'ouvrir avec le message pré-rempli : il ne reste qu'à cliquer sur « Envoyer »." : `Merci ${esc(d.prenom)}, je vous réponds très vite.`}</p>
        ${viaMail ? `<a class="btn btn-ghost btn-sm" href="${esc(mailto(subject, body))}">Rouvrir l'e-mail</a>` : ""}
        <a class="btn btn-ghost btn-sm" href="boutique.html">Retour à la boutique</a></div>`;
      confetti();
    });
  }

  /* ================= PANIER & COMMANDE (3 étapes) ================= */
  function cartPage() {
    const methods = SITE.shipping.methods, pays = SITE.payment.methods, stripe = SITE.payment.mode === "stripe";
    /* Mode coché par défaut : le premier sans point de retrait (livraison à domicile) */
    const st = { step: 1, ship: (methods.find((m) => !m.point) || methods[0]).id, pay: pays[0].id, info: {}, mrDown: false, mrCode: "" };
    /* Coordonnées saisies + point de retrait recopié à la main (le choix fait dans le widget est déjà dans st.info.point) */
    const keepInfo = () => { const f = $("#ship-form"); if (f) Object.assign(st.info, Object.fromEntries(new FormData(f))); const pt = $("#f-point"); if (pt) st.info.point = pt.value; };
    /* Coordonnées gardées le temps du passage sur la page Stripe (retour après annulation) */
    const KEEP = "biboulab-commande";
    const keep = { get() { try { return JSON.parse(sessionStorage.getItem(KEEP)); } catch { return null; } }, set(v) { try { sessionStorage.setItem(KEEP, JSON.stringify(v)); } catch { /* stockage indisponible */ } }, clear() { try { sessionStorage.removeItem(KEEP); } catch { /* idem */ } } };
    const totals = () => { const sub = Cart.subtotal(), m = methods.find((x) => x.id === st.ship), free = sub >= SITE.shipping.freeFrom, fee = free ? 0 : m.price; return { sub, m, free, fee, total: sub + fee }; };
    const stepsHTML = () => `<ol class="steps" aria-label="Étapes de la commande">${["Panier", "Livraison", "Paiement"].map((l, i) => `<li class="${i + 1 === st.step ? "on" : i + 1 < st.step ? "past" : ""}"${i + 1 === st.step ? ' aria-current="step"' : ""}><i aria-hidden="true"></i><span>${l}</span></li>`).join("")}</ol>`;
    const optText = (l) => [l.color && FILAMENTS[l.color] ? FILAMENTS[l.color].name : null, l.size].filter(Boolean).join(" · ");

    /* ----- Widget Mondial Relay : choix du Point Relais sur une carte -----
       Affiché pour les modes « mondialrelay » avec point de retrait quand un code enseigne est renseigné.
       Le point choisi est rangé dans st.info.point, comme s'il avait été recopié à la main.
       Si le widget ne se charge pas, on retombe sur la saisie manuelle. */
    const MR_BRAND = String(SITE.shipping.mondialRelayBrand || "").trim();
    const useMR = () => { const m = methods.find((x) => x.id === st.ship); return !!(m && m.point && m.carrier === "mondialrelay" && MR_BRAND && !st.mrDown); };
    const shipLogo = (m) => (m.carrier === "mondialrelay" ? `<img class="ship-logo" src="assets/img/mondial-relay.png" alt="" width="207" height="72" loading="lazy">` : "");
    const loadScript = (src) => new Promise((ok, ko) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = ko; document.head.append(s); });
    let mrLoading = null;
    const loadMR = () => mrLoading || (mrLoading = (async () => {
      if (!$("#leaflet-css")) { const l = document.createElement("link"); l.id = "leaflet-css"; l.rel = "stylesheet"; l.href = "assets/vendor/leaflet/leaflet.css"; document.head.append(l); }
      if (!window.jQuery) await loadScript("assets/vendor/jquery-2.2.4.min.js");
      if (!window.L) await loadScript("assets/vendor/leaflet/leaflet.js");
      if (!window.jQuery.fn.MR_ParcelShopPicker) await loadScript("https://widget.mondialrelay.com/parcelshop-picker/jquery.plugin.mondialrelay.parcelshoppicker.min.js");
    })().catch((e) => { mrLoading = null; throw e; }));
    const showRelay = () => {
      const c = $("#mr-choice"); if (!c) return;
      const pt = st.info.point;
      c.innerHTML = pt ? `${icon("check")}<span><b>Point Relais choisi :</b> ${esc(pt)}</span>` : "Recherchez puis sélectionnez votre Point Relais® ci-dessous.";
      c.classList.toggle("on", !!pt);
      const e = $("#mr-err"); if (e && pt) e.textContent = "";
    };
    function mountRelay() {
      const zone = $("#mr-zone"); if (!zone) return;
      showRelay();
      loadMR().then(() => {
        if (!zone.isConnected) return;
        const cp = (($("#f-cp") || {}).value || st.info.cp || "").trim(); // lu au dernier moment : le client a pu le saisir pendant le chargement
        window.jQuery(zone).MR_ParcelShopPicker({
          Target: "#mr-target",
          Brand: MR_BRAND.padEnd(8), // le code enseigne fait 8 caractères, complété par des espaces
          Country: "FR",
          ColLivMod: "24R",
          NbResults: 7,
          PostCode: /^\d{5}$/.test(cp) ? cp : "",
          AutoSelect: st.info.point ? st.mrCode : "",
          Responsive: true,
          ShowResultsOnMap: true,
          Theme: "mondialrelay",
          /* La carte change de taille sur mobile (feuille de style du site) : Leaflet doit la recalculer */
          OnSearchSuccess: () => setTimeout(() => window.jQuery(zone).trigger("MR_RebindMap"), 50),
          OnParcelShopSelected: (d) => {
            const t = (v) => String(v || "").replace(/''/g, "'").trim();
            st.mrCode = `${t(d.Pays) || "FR"}-${t(d.ID)}`;
            st.info.point = `${t(d.Nom)} (n° ${t(d.ID)}) — ${[t(d.Adresse1), t(d.Adresse2)].filter(Boolean).join(" ")}, ${t(d.CP)} ${t(d.Ville)}`.slice(0, 300);
            showRelay();
          }
        });
      }).catch(() => {
        if (!zone.isConnected) return;
        /* Widget indisponible : on repasse à la saisie manuelle du point de retrait */
        st.mrDown = true;
        keepInfo();
        render();
      });
    }

    function summary(t, cta) {
      const left = SITE.shipping.freeFrom - t.sub;
      return `<aside class="summary" aria-label="Récapitulatif de la commande"><h2>Récapitulatif</h2>
        ${t.free ? `<p style="font-size:.875rem;margin:0 0 8px">Livraison offerte</p>` : `<p style="font-size:.875rem;margin:0 0 8px">Plus que <b>${euro(left)}</b> pour la livraison offerte</p>`}
        <div class="free-bar" aria-hidden="true"><i style="width:${Math.min(100, (t.sub / SITE.shipping.freeFrom) * 100)}%"></i></div>
        <dl>
          <div><dt>Sous-total</dt><dd>${euro(t.sub)}</dd></div>
          <div><dt>Livraison${st.step > 1 ? ` · ${esc(t.m.label)}` : ""}</dt><dd>${t.free ? "Offerte" : st.step === 1 ? `dès ${euro(Math.min(...methods.map((m) => m.price)))}` : euro(t.fee)}</dd></div>
          <div class="total"><dt>Total${st.step === 1 && !t.free ? " <small class='muted'>hors livraison</small>" : ""}</dt><dd>${euro(st.step === 1 ? t.sub : t.total)}</dd></div>
        </dl>
        <p class="muted" style="font-size:.78rem;margin:10px 0 0">TVA non applicable, art. 293 B du CGI</p>
        ${cta}
      </aside>`;
    }

    function render(focus = false) {
      const lines = Cart.lines(), t = totals();
      if (!lines.length && st.step < 4) {
        main.innerHTML = `<section class="wrap page-head"><h1>Votre panier</h1></section><section class="wrap"><div class="empty">${spool}<h2>Votre panier est vide</h2><p>Le plateau n'attend que vous : allez choisir une création.</p><a class="btn btn-primary" href="boutique.html">Explorer la boutique</a></div></section>`;
        return;
      }
      let body = "";
      if (st.step === 1) {
        body = `<div class="co-main">${lines.map((l) => `<div class="line">
            <a class="line-media" href="produit.html?id=${l.p.id}" tabindex="-1" aria-hidden="true">${media(l.p)}</a>
            <div><h3><a href="produit.html?id=${l.p.id}">${esc(l.p.name)}</a></h3><small>${esc(optText(l))}</small><small>${euro(l.unit)} l'unité</small></div>
            <div class="line-end"><b>${euro(l.total)}</b>
              <div class="qty" role="group" aria-label="Quantité pour ${esc(l.p.name)}">
                <button type="button" data-i="${l.index}" data-q="${l.qty - 1}" aria-label="Diminuer">${icon("minus")}</button><output>${l.qty}</output>
                <button type="button" data-i="${l.index}" data-q="${l.qty + 1}" aria-label="Augmenter">${icon("plus")}</button></div>
              <button class="line-del" type="button" data-i="${l.index}" data-q="0">${icon("trash")}Retirer<span class="sr"> ${esc(l.p.name)}</span></button></div>
          </div>`).join("")}</div>
          ${summary(t, `<button class="btn btn-primary" type="button" data-go="2">Choisir la livraison ${icon("arrow", "ic-arrow")}</button><a class="back" href="boutique.html">Continuer mes achats</a>`)}`;
      } else if (st.step === 2) {
        const i = st.info;
        const mr = useMR();
        body = `<div class="co-main"><form id="ship-form" novalidate>
            <h2 class="h-sub">Vos coordonnées</h2>
            <div class="form">
              ${fg("prenom", "Prénom", { required: true, auto: "given-name", value: i.prenom })}
              ${fg("nom", "Nom", { required: true, auto: "family-name", value: i.nom })}
              ${fg("email", "E-mail", { required: true, type: "email", auto: "email", full: true, value: i.email })}
              ${fg("adresse", "Adresse", { required: true, auto: "street-address", full: true, value: i.adresse })}
              ${fg("cp", "Code postal", { required: true, auto: "postal-code", zip: true, value: i.cp })}
              ${fg("ville", "Ville", { required: true, auto: "address-level2", value: i.ville })}
              ${fg("note", "Précision pour la commande", { full: true, value: i.note, placeholder: "ex. référence d'appareil, ville pour une skyline…" })}
            </div>
          </form>
          <h2 class="h-sub" style="margin-top:32px">Mode de livraison <small class="muted" style="font:500 .85rem var(--font-b)">(France métropolitaine)</small></h2>
          ${methods.map((m) => {
            const on = m.id === st.ship;
            /* Le choix du point de retrait s'ouvre dans le cadre de l'option cochée. Il reste hors du
               formulaire : les boutons du widget Mondial Relay sont de type submit. */
            const panel = !on || !m.point ? "" : mr
              ? `<div class="ship-panel mr-box">
                  <p class="mr-choice" id="mr-choice" aria-live="polite"></p>
                  <p class="mr-err" id="mr-err" role="alert"></p>
                  <input type="hidden" id="mr-target">
                  <div class="mr-zone" id="mr-zone"><p class="muted" style="padding:16px;margin:0">Chargement de la carte des Points Relais…</p></div></div>`
              : `<div class="ship-panel form point-box">
                  <p class="full" style="margin:0">Choisissez votre point de retrait${m.finder ? ` sur <a href="${esc(m.finder)}" target="_blank" rel="noopener">le site ${m.carrier === "mondialrelay" ? "Mondial Relay" : m.carrier === "colissimo" ? "de La Poste" : "du transporteur"}<span class="sr"> (nouvel onglet)</span></a>` : ""}, puis recopiez son nom et son adresse ci-dessous.</p>
                  ${fg("point", "Point de retrait choisi", { required: true, area: true, full: true, value: i.point, placeholder: m.carrier === "mondialrelay" ? "ex. Tabac de la Gare, 12 rue de la Gare, 75011 Paris" : "ex. Bureau de poste Paris Voltaire, 4 rue Popincourt, 75011 Paris" })}
                </div>`;
            return `<div class="ship-opt${panel ? " open" : ""}"><label class="radio-card"><input type="radio" name="ship" form="ship-form" value="${m.id}" ${on ? "checked" : ""}><span><b>${esc(m.label)}</b><small>${esc([m.note, m.delay].filter(Boolean).join(" · "))}</small></span>${shipLogo(m)}<span class="price">${t.free ? "Offerte" : euro(m.price)}</span></label>${panel}</div>`;
          }).join("")}
          </div>
          ${summary(t, `<button class="btn btn-primary" type="submit" form="ship-form">Passer au paiement ${icon("arrow", "ic-arrow")}</button><button class="back" type="button" data-go="1">← Retour au panier</button>`)}`;
      } else if (st.step === 3) {
        body = `<form class="co-main" id="pay-form" novalidate>
            <h2 class="h-sub">Mode de paiement</h2>
            ${st.notice ? `<p class="notice" role="status">${esc(st.notice)}</p>` : ""}
            ${stripe
              ? `<p class="notice">Paiement sécurisé par carte bancaire (ou Apple Pay, Google Pay selon votre appareil) sur la page de Stripe, le prestataire de paiement. Vos coordonnées bancaires ne passent jamais par ce site.</p>
                 <p class="notice pay-err" role="alert" style="border-color:var(--err)" hidden></p>`
              : `${SITE.payment.mode === "email" ? `<p class="notice">Pas de paiement en ligne sur cette page : votre commande m'est envoyée par e-mail et je vous retourne un moyen de paiement sécurisé. Vous ne payez qu'après confirmation.</p>` : ""}
                 ${pays.map((m) => `<label class="radio-card"><input type="radio" name="pay" value="${m.id}" ${m.id === st.pay ? "checked" : ""}><span><b>${esc(m.label)}</b><small>${esc(m.note)}</small></span></label>`).join("")}`}
            <h2 class="h-sub" style="margin-top:32px">Livraison</h2>
            <p class="muted">${esc(st.info.prenom)} ${esc(st.info.nom)} — ${esc(st.info.adresse)}, ${esc(st.info.cp)} ${esc(st.info.ville)}<br>${esc(t.m.label)} (${esc(t.m.delay)})${t.m.point && st.info.point ? `<br>Point de retrait : ${esc(st.info.point)}` : ""}</p>
            <div class="fg" style="margin-top:22px"><label class="check"><input type="checkbox" name="cgv" required><span>J'ai lu et j'accepte les <a href="cgv.html" target="_blank" rel="noopener">conditions générales de vente</a> et je reconnais que ma commande implique une obligation de paiement.</span></label><p class="err-msg" role="alert"></p></div>
          </form>
          ${summary(t, `<button class="btn btn-primary" type="submit" form="pay-form">${stripe ? "Commander et payer" : "Valider la commande"} · ${euro(t.total)}</button><button class="back" type="button" data-go="2">← Retour à la livraison</button>`)}`;
      }
      main.innerHTML = st.step === 4 ? st.done : `<section class="wrap page-head" style="padding-bottom:0"><h1 tabindex="-1">${["Votre panier", "Livraison", "Paiement"][st.step - 1]}</h1>${stepsHTML()}</section><section class="wrap checkout">${body}</section>`;
      enhance(main);
      if (st.step === 2 && useMR()) mountRelay();
      if (focus) { scrollTo({ top: 0, behavior: RM ? "auto" : "smooth" }); const h = $("h1, h2", main); if (h) h.focus({ preventScroll: true }); }
    }

    main.addEventListener("click", async (e) => {
      const q = e.target.closest("[data-q]"), go = e.target.closest("[data-go]");
      if (q) {
        const i = +q.dataset.i, n = +q.dataset.q;
        /* Le bouton « − » qui fait tomber la quantité à 0 demande confirmation avant de retirer la ligne */
        if (n < 1 && !q.classList.contains("line-del")) {
          const l = Cart.lines().find((x) => x.index === i);
          if (!l || !(await confirmRemove(l.p.name))) return;
        }
        Cart.setQty(i, n); render();
      }
      if (go) { st.step = +go.dataset.go; render(true); }
    });
    main.addEventListener("change", (e) => {
      if (e.target.name === "ship") { st.ship = e.target.value; keepInfo(); render(); const r = $('input[name="ship"]:checked'); if (r) r.focus(); }
      if (e.target.name === "pay") st.pay = e.target.value;
      /* Code postal saisi après l'affichage du widget : on relance la recherche de Points Relais */
      if (e.target.id === "f-cp" && useMR() && /^\d{5}$/.test(e.target.value.trim()) && window.jQuery && $("#mr-zone")) window.jQuery("#mr-zone").trigger("MR_DoSearch", [e.target.value.trim(), "FR"]);
    });
    main.addEventListener("submit", (e) => {
      e.preventDefault();
      /* Étape Livraison : on valide aussi le point de retrait recopié, placé hors du formulaire */
      if (!validate(e.target.id === "ship-form" ? $(".co-main", main) : e.target)) return;
      if (e.target.id === "ship-form") {
        keepInfo();
        if (useMR() && !st.info.point) { const m = $("#mr-err"); if (m) { m.textContent = "Sélectionnez un Point Relais® pour continuer."; m.scrollIntoView({ block: "center", behavior: RM ? "auto" : "smooth" }); } return; }
        st.step = 3; st.notice = ""; render(true); return;
      }
      if (stripe) { payStripe(); return; }
      /* Validation finale : on prépare l'e-mail de commande */
      const t = totals(), i = st.info, ref = "GF-" + Date.now().toString(36).toUpperCase().slice(-6);
      const pay = pays.find((m) => m.id === st.pay);
      const text = [`Commande ${ref}`, "", ...Cart.lines().map((l) => `- ${l.qty} × ${l.p.name}${optText(l) ? ` (${optText(l)})` : ""} : ${euro(l.total)}`), "",
        `Sous-total : ${euro(t.sub)}`, `Livraison (${t.m.label}) : ${t.free ? "offerte" : euro(t.fee)}`, `TOTAL : ${euro(t.total)}`, "",
        `Paiement souhaité : ${pay.label}`, "", "Livraison :", `${i.prenom} ${i.nom}`, i.adresse, `${i.cp} ${i.ville}`, i.email,
        t.m.point && i.point ? `Point de retrait : ${i.point}` : "", i.note ? `Précision : ${i.note}` : ""].join("\n");
      const link = mailto(`Commande ${ref} — ${SITE.name}`, text);
      st.done = `<section class="wrap section"><div class="success" role="status">${tick}
        <h1 tabindex="-1">Commande ${ref} prête à partir</h1>
        <p class="muted">Votre messagerie vient de s'ouvrir avec le récapitulatif : <b>cliquez sur « Envoyer »</b> pour me transmettre la commande. Je vous réponds avec le moyen de paiement choisi (${esc(pay.label.toLowerCase())}), puis je lance l'impression.</p>
        <a class="btn btn-primary" href="${esc(link)}">Rouvrir l'e-mail de commande</a>
        <a class="btn btn-ghost" href="boutique.html">Retour à la boutique</a></div></section>`;
      st.step = 4; Cart.clear(); render(true); confetti();
      location.href = link;
    });

    /* Paiement Stripe : le serveur recalcule les prix et renvoie l'adresse de la page Stripe.
       Seuls les identifiants des articles partent d'ici, jamais les prix. */
    async function payStripe() {
      const btn = $('button[form="pay-form"][type="submit"]'), err = $(".pay-err", main), label = btn.innerHTML;
      btn.disabled = true; btn.setAttribute("aria-busy", "true"); btn.textContent = "Redirection vers le paiement…"; err.hidden = true;
      keep.set({ info: st.info, ship: st.ship });
      try {
        const r = await fetch(SITE.payment.endpoint + "session/", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ panier: Cart.read().map(({ id, color, size, qty }) => ({ id, color, size, qty })), livraison: st.ship,
            client: { ...st.info, point: totals().m.point ? st.info.point || "" : "" } })
        });
        const d = await r.json().catch(() => ({}));
        if (r.ok && d.url) { location.href = d.url; return; }
        err.textContent = d.erreur || "Le paiement en ligne est momentanément indisponible. Réessayez dans quelques minutes.";
      } catch {
        err.textContent = "Connexion impossible. Vérifiez votre accès à Internet, puis réessayez.";
      }
      err.hidden = false; btn.disabled = false; btn.removeAttribute("aria-busy"); btn.innerHTML = label;
    }

    /* Retour depuis la page Stripe : ?paiement=ok&session_id=… ou ?paiement=annule */
    const back = new URLSearchParams(location.search), outcome = back.get("paiement");
    if (outcome) history.replaceState(null, "", location.pathname);
    if (outcome === "ok") {
      Cart.clear(); keep.clear();
      st.done = `<section class="wrap section"><div class="success" role="status">${tick}
        <h1 tabindex="-1">Merci pour votre commande !</h1>
        <p class="muted pay-state">Votre paiement a bien été transmis. Vous recevez la confirmation par e-mail, et je lance l'impression.</p>
        <a class="btn btn-primary" href="boutique.html">Retour à la boutique</a></div></section>`;
      st.step = 4; render(true); confetti();
      fetch(SITE.payment.endpoint + "etat/?session_id=" + encodeURIComponent(back.get("session_id") || ""))
        .then((r) => (r.ok ? r.json() : null)).then((d) => {
          const p = $(".pay-state", main); if (!d || !p) return;
          if (d.statut === "payee") p.textContent = `Commande ${d.ref} : paiement confirmé. Vous recevez un reçu par e-mail ; je lance l'impression et je vous préviens à l'expédition.`;
          else if (d.statut === "attente") p.textContent = `Commande ${d.ref} : votre banque confirme le paiement sous quelques jours. J'imprime votre commande dès sa confirmation.`;
        }).catch(() => { /* le message par défaut reste affiché */ });
      return;
    }
    if (outcome === "annule") {
      const saved = keep.get();
      if (saved && saved.info && Cart.count()) {
        Object.assign(st.info, saved.info);
        if (methods.some((m) => m.id === saved.ship)) st.ship = saved.ship;
        st.step = 3;
      }
      st.notice = "Paiement annulé : rien n'a été débité. Votre panier est intact, vous pouvez réessayer.";
    }
    render();
  }

  /* ================= PAGES LÉGALES =================
     Textes dans data.js (PAGES), modifiables depuis l'administration.
     Mise en forme et {variables} : assets/js/rich.js */
  function legal() {
    const doc = PAGES[document.body.dataset.doc], R = window.SHOP_RICH;
    if (!doc || !R) return;
    main.innerHTML = `<section class="wrap page-head"><p class="kicker">${esc(doc.kicker)}</p><h1>${esc(doc.title)}</h1><p class="muted" style="margin-top:14px">Dernière mise à jour : ${esc(SITE.legal.updated)}</p></section>
      <section class="wrap prose">${R.page(doc, SITE)}</section>`;
    setMeta(doc.title, doc.description || ""); // titre d'onglet et description (utile quand le texte vient de l'administration en ligne)
  }

  /* ================= Aiguillage ================= */
  const routes = { home, shop, category, product: productPage, about, contact, cart: cartPage, legal };
  (routes[document.body.dataset.page] || (() => {}))();
  enhance(main);
})();
