/* =====================================================================
   BIBOULAB — RENDU DES PAGES
   Chaque page HTML porte un attribut <body data-page="..."> ; la fonction
   correspondante ci-dessous construit son contenu à partir de data.js.
   ===================================================================== */
(() => {
  "use strict";
  const { SITE, FILAMENTS, CATEGORIES, PRODUCTS, REVIEWS, ABOUT } = window.SHOP;
  const { $, $$, esc, euro, cat, roots, subcats, catFamily, lineage, product, icon, media, card, storeLogo, extAttrs, Cart, toast, flyToCart, enhance, jsonLd, setMeta, RM } = window.UI;
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
        <canvas class="hero-cv" aria-hidden="true"></canvas>
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
        </div></div>
        <span class="scroll-hint" aria-hidden="true"></span>
      </section>

      <div class="marquee" aria-label="${esc(SITE.marquee.join(", "))}"><div class="marquee-track" aria-hidden="true">${loop}${loop}${loop}${loop}</div></div>

      <section class="section" aria-labelledby="cats-t"><div class="wrap">
        <header class="sec-h" data-reveal><div><p class="kicker">Les univers</p><h2 id="cats-t">Huit catégories, <span class="grad-text">mille idées</span></h2></div>
          <a class="btn btn-ghost btn-sm" href="boutique.html">Toute la boutique ${icon("arrow", "ic-arrow")}</a></header>
        <div class="cats">${roots().map(catCard).join("")}</div>
      </div></section>

      <section class="section" style="padding-top:0" aria-labelledby="new-t"><div class="wrap">
        <header class="sec-h" data-reveal><div><p class="kicker">Derniers produits</p><h2 id="new-t">Tout juste sortis du plateau</h2></div>
          <a class="btn btn-ghost btn-sm" href="boutique.html">Voir les ${PRODUCTS.length} créations ${icon("arrow", "ic-arrow")}</a></header>
        <div class="grid">${latest.map(card).join("")}</div>
      </div></section>

      <section class="section" style="padding-top:0" aria-labelledby="at-t"><div class="wrap split">
        <div class="split-media" data-reveal="left">${ABOUT.photos[0].src ? `<img data-parallax=".1" src="${esc(ABOUT.photos[0].src)}" alt="${esc(ABOUT.photos[0].alt)}" loading="lazy">` : `<div data-parallax=".1">${printer("h")}</div>`}</div>
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

    heroCanvas($(".hero-cv"));
    jsonLd({ "@context": "https://schema.org", "@type": "Store", name: SITE.name, url: SITE.url, slogan: SITE.slogan, email: SITE.email, sameAs: SITE.stores.map((s) => s.url) });
  }

  function catCard(c, i) {
    const fam = catFamily(c.slug), n = PRODUCTS.filter((p) => fam.includes(p.category)).length; // sous-catégories comprises
    return `<div data-reveal style="--i:${i % 4}"><a class="cat fx-${c.fx}" href="categorie.html?c=${c.slug}" style="--c:${c.color};--c2:${c.color2}" data-tilt>
      <span class="cat-ic">${icon(c.icon)}</span>
      <h3>${esc(c.name)}</h3><p>${esc(c.short)}</p>
      <span class="cat-n">${n} création${n > 1 ? "s" : ""} ${icon("arrow")}</span>
      <span class="glare" aria-hidden="true"></span></a></div>`;
  }

  /* Fond du hero : impression 3D simulée (vase qui monte couche par couche) + particules.
     Dessin 2D léger ; mis en pause hors écran ; image fixe si « mouvement réduit ». */
  function heroCanvas(cv) {
    const ctx = cv.getContext("2d");
    const N = 64, COLORS = [[139, 92, 246], [34, 211, 238], [255, 122, 26]];
    const dots = Array.from({ length: 20 }, () => ({ x: Math.random(), y: Math.random(), s: Math.random() * 1.6 + 0.5, v: Math.random() * 0.025 + 0.008 }));
    let W = 0, H = 0, visible = true, raf = 0;
    const size = () => { const d = Math.min(devicePixelRatio || 1, 2); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
    const profile = (u) => 0.55 + 0.38 * Math.sin(u * 3.4 + 0.3) * (1 - u * 0.35) + 0.12 * u ** 4; // silhouette du vase
    const colorAt = (u) => { const k = u * 2, a = COLORS[Math.min(1, Math.floor(k))], b = COLORS[Math.min(2, Math.floor(k) + 1)], t = k - Math.floor(k); return a.map((v, i) => Math.round(v + (b[i] - v) * (u >= 1 ? 1 : t))); };

    function draw(now) {
      const T = now / 1000, cycle = 13, ph = (T % cycle) / cycle;
      const prog = RM ? 1 : Math.min(1, ph / 0.72), fade = RM ? 1 : ph > 0.93 ? 1 - (ph - 0.93) / 0.07 : Math.min(1, ph / 0.03);
      const wide = W > 960, base = wide ? 1 : 0.32;
      const cx = wide ? W * 0.76 : W * 0.5, by = H * (wide ? 0.82 : 0.9), OH = Math.min(H * 0.6, 460), R = OH * 0.36, lh = OH / N, rot = T * 0.55;
      const light = document.documentElement.dataset.theme === "light";
      ctx.clearRect(0, 0, W, H);

      // particules qui montent doucement
      ctx.fillStyle = light ? "rgba(60,50,120,.35)" : "rgba(255,255,255,.45)";
      for (const d of dots) { if (!RM) { d.y -= d.v / 60; if (d.y < -0.02) { d.y = 1.02; d.x = Math.random(); } } ctx.globalAlpha = 0.25 + 0.5 * Math.abs(Math.sin(T * 0.6 + d.x * 9)); ctx.beginPath(); ctx.arc(d.x * W, d.y * H, d.s, 0, 6.283); ctx.fill(); }

      // plateau
      ctx.globalAlpha = base;
      ctx.beginPath(); ctx.ellipse(cx, by + 8, R * 1.3, R * 0.4, 0, 0, 6.283);
      ctx.fillStyle = light ? "rgba(20,20,45,.06)" : "rgba(255,255,255,.04)"; ctx.fill();
      ctx.strokeStyle = light ? "rgba(20,20,45,.22)" : "rgba(255,255,255,.18)"; ctx.lineWidth = 1.5; ctx.stroke();

      // couches déjà imprimées
      const top = Math.max(1, Math.floor(prog * N));
      ctx.lineWidth = Math.max(1.4, lh * 0.5);
      for (let i = 0; i < top; i++) {
        const u = i / N, r = R * profile(u), y = by - i * lh, [cr, cg, cb] = colorAt(u);
        ctx.beginPath();
        for (let k = 0; k <= 44; k++) {
          const a = (k / 44) * 6.283, rr = r * (1 + 0.075 * Math.sin(5 * a + u * 5 + rot));
          const px = cx + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.3;
          k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${(0.5 + 0.5 * (i / top)) * fade * base})`;
        ctx.globalAlpha = 1; ctx.stroke();
      }

      // buse lumineuse qui dépose le filament
      if (prog < 1) {
        const u = top / N, a = T * 5, r = R * profile(u), nx = cx + Math.cos(a) * r, ny = by - top * lh + Math.sin(a) * r * 0.3;
        ctx.globalAlpha = fade * base; ctx.shadowColor = "#FF7A1A"; ctx.shadowBlur = 6; ctx.fillStyle = "#FF7A1A";
        ctx.beginPath(); ctx.arc(nx, ny, 4.5, 0, 6.283); ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = light ? "#3a3a4d" : "#d8d8e6";
        ctx.beginPath(); ctx.moveTo(nx, ny - 5); ctx.lineTo(nx - 7, ny - 18); ctx.lineTo(nx + 7, ny - 18); ctx.closePath(); ctx.fill();
        ctx.fillRect(nx - 10, ny - 36, 20, 18);
      }
      ctx.globalAlpha = 1;
      if (!RM && visible) raf = requestAnimationFrame(draw);
    }
    const start = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); };
    size(); start();
    addEventListener("resize", () => { size(); start(); });
    new IntersectionObserver(([e]) => { visible = e.isIntersecting && !document.hidden; if (visible) start(); }).observe(cv);
    document.addEventListener("visibilitychange", () => { visible = !document.hidden; if (visible) start(); });
    new MutationObserver(start).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
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
    const sel = { color: p.colors[0] || null, size: p.sizes[0] ? p.sizes[0].label : null, qty: 1 };
    const unit = () => p.price + ((p.sizes.find((s) => s.label === sel.size) || {}).extra || 0);
    const similar = [...PRODUCTS.filter((x) => x.category === p.category && x !== p), ...PRODUCTS.filter((x) => x.category !== p.category).sort((a, b) => b.popularity - a.popularity)].slice(0, 7);
    setMeta(`${p.name} — ${c.name}`, `${p.short} ${p.material}, ${p.dimensions}. ${euro(p.price)}.`);

    main.innerHTML = `
      <section class="wrap" style="padding-top:28px">
        <ol class="crumbs"><li><a href="index.html">Accueil</a></li><li><a href="boutique.html">Boutique</a></li>${lineage(c).map((x) => `<li><a href="categorie.html?c=${x.slug}">${esc(x.name)}</a></li>`).join("")}<li aria-current="page">${esc(p.name)}</li></ol>
        <div class="product" style="--c:${c.color}">
          <div class="gallery" data-reveal="left">
            <div class="zoom" id="zoom">${media(p, 0, true)}</div>
            <div class="thumbs" role="group" aria-label="Vues du produit">
              ${Array.from({ length: views }, (_, i) => `<button class="thumb" type="button" data-v="${i}" aria-pressed="${i === 0}" aria-label="Afficher la vue ${i + 1}">${media(p, i)}</button>`).join("")}
              ${p.model3d ? `<button class="thumb" type="button" data-v="3d" aria-pressed="false" aria-label="Afficher le modèle 3D interactif" style="background:var(--surface-2);color:var(--text)">${icon("cube")}3D</button>` : ""}
            </div>
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
                <div class="qty" role="group" aria-label="Quantité">
                  <button type="button" data-q="-1" aria-label="Diminuer la quantité">${icon("minus")}</button>
                  <output id="qty" aria-live="polite">1</output>
                  <button type="button" data-q="1" aria-label="Augmenter la quantité">${icon("plus")}</button>
                </div>
                <button class="btn btn-primary add-btn" type="submit" data-magnetic>
                  <span class="lbl">${icon("cart")} Ajouter au panier</span>
                  <span class="done" aria-hidden="true">${icon("check")} Ajouté</span>
                </button>
              </div>
            </form>

            <ul class="assure">
              <li>${icon("clock")}Imprimé à la commande · fabrication : ${esc(p.printTime)}</li>
              <li>${icon("box")}Emballage protecteur, livraison offerte dès ${euro(SITE.shipping.freeFrom)}</li>
              <li>${icon("shield")}Rétractation 14 jours (hors pièces personnalisées)</li>
            </ul>

            <dl class="specs">
              <div><dt>Matériau</dt><dd>${esc(p.material)}</dd></div>
              <div><dt>Temps de fabrication</dt><dd>${esc(p.printTime)}</dd></div>
              <div><dt>Dimensions</dt><dd>${esc(p.dimensions)}</dd></div>
              <div><dt>Poids</dt><dd>${esc(p.weight)}</dd></div>
            </dl>

            <div class="p-desc"><h2>Description détaillée</h2><p>${esc(p.description)}</p></div>

            <p class="also">Aussi disponible sur
              ${SITE.stores.map((s) => `<a href="${esc(p[s.id] || s.url)}" ${extAttrs} style="--sc:${s.color}">${storeLogo(s)}${esc(s.name)}<span class="sr"> (nouvel onglet)</span></a>`).join("")}
            </p>
          </div>
        </div>
      </section>

      <section class="section" aria-labelledby="sim-t"><div class="wrap">
        <header class="sec-h" data-reveal><div><p class="kicker">Dans le même esprit</p><h2 id="sim-t">Produits similaires</h2></div>
          <div class="car-nav"><button class="prev" type="button" aria-label="Produits précédents">${icon("arrow")}</button><button class="next" type="button" aria-label="Produits suivants">${icon("arrow")}</button></div></header>
        <div class="carousel" tabindex="0" aria-label="Carrousel de produits similaires">${similar.map(card).join("")}</div>
      </div></section>`;

    /* Galerie : miniatures, zoom qui suit la souris, visionneuse 3D à la demande */
    const zoom = $("#zoom");
    $(".thumbs").addEventListener("click", (e) => {
      const t = e.target.closest(".thumb"); if (!t) return;
      $$(".thumb").forEach((x) => x.setAttribute("aria-pressed", x === t));
      zoom.classList.remove("zoomed", "swap"); void zoom.offsetWidth; zoom.classList.add("swap");
      if (t.dataset.v === "3d") {
        if (!customElements.get("model-viewer")) { const s = document.createElement("script"); s.type = "module"; s.src = "https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js"; document.head.append(s); }
        zoom.innerHTML = `<model-viewer src="${esc(p.model3d)}" alt="Modèle 3D de ${esc(p.name)}" camera-controls auto-rotate shadow-intensity="1" style="background:#14141c"></model-viewer>`;
        zoom.style.cursor = "grab";
      } else { zoom.innerHTML = media(p, +t.dataset.v, true); zoom.style.cursor = ""; }
    });
    zoom.addEventListener("pointermove", (e) => { const r = zoom.getBoundingClientRect(); zoom.style.setProperty("--zx", ((e.clientX - r.left) / r.width) * 100 + "%"); zoom.style.setProperty("--zy", ((e.clientY - r.top) / r.height) * 100 + "%"); });
    zoom.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") zoom.classList.add("zoomed"); });
    zoom.addEventListener("pointerleave", () => zoom.classList.remove("zoomed"));
    zoom.addEventListener("click", (e) => { if (e.pointerType && e.pointerType !== "mouse") zoom.classList.toggle("zoomed"); });

    /* Options, quantité, ajout au panier */
    const form = $("#buy"), addBtn = $(".add-btn");
    form.addEventListener("change", () => {
      const d = new FormData(form);
      sel.color = d.get("color"); sel.size = d.get("size");
      if (sel.color) $("#color-name").textContent = FILAMENTS[sel.color].name;
      $("#price").textContent = euro(unit());
    });
    form.addEventListener("click", (e) => { const b = e.target.closest("[data-q]"); if (!b) return; sel.qty = Math.max(1, Math.min(20, sel.qty + +b.dataset.q)); $("#qty").textContent = sel.qty; });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      Cart.add(p.id, sel, sel.qty);
      addBtn.classList.add("ok"); flyToCart(addBtn);
      toast(`${sel.qty} × ${esc(p.name)} ajouté · <a href="panier.html">Voir le panier</a>`);
      setTimeout(() => addBtn.classList.remove("ok"), 1900);
    });

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
        <p class="kicker" data-reveal>À propos</p>
        <h1 data-reveal>${esc(ABOUT.title)}</h1>
      </section>
      <section class="wrap split">
        <div data-reveal="left">${ABOUT.story.map((t, i) => `<p${i ? ' class="muted"' : ' style="font-size:1.15rem"'}>${esc(t)}</p>`).join("")}
          <a class="btn btn-primary" href="contact.html?sur-mesure=1" data-magnetic style="margin-top:12px">Parler de votre projet ${icon("arrow", "ic-arrow")}</a></div>
        <div class="split-media" data-reveal="right"><div data-parallax=".1">${printer("a")}</div></div>
      </section>

      <section class="section" aria-labelledby="ph-t"><div class="wrap">
        <header class="sec-h" data-reveal><div><p class="kicker">L'atelier en images</p><h2 id="ph-t">Ma Bambu Lab et ses bobines</h2></div>
          ${SITE.demo && ABOUT.photos.some((x) => !x.src) ? '<span class="demo-note">Visuels d\'illustration — ajoutez vos photos dans data.js</span>' : ""}</header>
        <div class="photos">${ABOUT.photos.map((ph, i) => `<figure data-reveal="scale" style="--i:${i}">
          ${ph.src ? `<img src="${esc(ph.src)}" alt="${esc(ph.alt)}" loading="lazy" decoding="async">` : i === 0 ? printer("f") : UI.art({ id: "atelier" + i, name: ph.alt, category: (CATEGORIES[i === 1 ? 1 : 7] || CATEGORIES[0]).slug }, i)}
          <figcaption>${esc(ph.caption)}</figcaption></figure>`).join("")}</div>
      </div></section>

      <section class="section" style="padding-top:0" aria-labelledby="pr-t"><div class="wrap">
        <header class="sec-h" data-reveal style="justify-content:center;text-align:center"><div><p class="kicker" style="justify-content:center">Le process</p><h2 id="pr-t">Du modèle 3D à <span class="grad-text">la finition</span></h2></div></header>
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
            ${fg("nom", "Votre nom", { required: true, auto: "name" })}
            ${fg("email", "Votre e-mail", { required: true, type: "email", auto: "email" })}
            <div class="fg full"><label class="check"><input type="checkbox" id="f-perso" name="personnalisation" ${custom ? "checked" : ""}><span><b>C'est une demande de personnalisation</b><br><span class="muted">Pièce sur mesure, couleur spéciale, gravure…</span></span></label></div>
            <div class="custom-fields full${custom ? " open" : ""}"><div><div class="form">
              ${fg("dimensions", "Dimensions approximatives", { placeholder: "ex. 12 × 8 × 5 cm" })}
              ${fg("couleur", "Couleur souhaitée", { placeholder: "ex. noir mat" })}
            </div></div></div>
            ${fg("message", "Votre message", { required: true, area: true, full: true, placeholder: "Décrivez votre idée, l'usage prévu, la quantité…" })}
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
      const subject = `${perso ? "Demande de personnalisation" : "Message"} — ${d.nom}`;
      const body = `${d.message}\n\n${perso ? `Dimensions : ${d.dimensions || "—"}\nCouleur : ${d.couleur || "—"}\n\n` : ""}${d.nom}\n${d.email}`;
      let viaMail = !SITE.formEndpoint;
      if (SITE.formEndpoint) {
        const btn = $("button[type=submit]", form); btn.disabled = true;
        try { const r = await fetch(SITE.formEndpoint, { method: "POST", headers: { Accept: "application/json" }, body: new FormData(form) }); if (!r.ok) throw 0; }
        catch { btn.disabled = false; toast("L'envoi a échoué. Réessayez ou écrivez-moi par e-mail."); return; }
      } else location.href = mailto(subject, body);
      $("#contact-panel").innerHTML = `<div class="success" role="status">${tick}
        <h2>${viaMail ? "Votre message est prêt" : "Message envoyé"}</h2>
        <p class="muted">${viaMail ? "Votre messagerie vient de s'ouvrir avec le message pré-rempli : il ne reste qu'à cliquer sur « Envoyer »." : `Merci ${esc(d.nom)}, je vous réponds très vite.`}</p>
        ${viaMail ? `<a class="btn btn-ghost btn-sm" href="${esc(mailto(subject, body))}">Rouvrir l'e-mail</a>` : ""}
        <a class="btn btn-ghost btn-sm" href="boutique.html">Retour à la boutique</a></div>`;
      confetti();
    });
  }

  /* ================= PANIER & COMMANDE (3 étapes) ================= */
  function cartPage() {
    const methods = SITE.shipping.methods, pays = SITE.payment.methods;
    const st = { step: 1, ship: methods[0].id, pay: pays[0].id, info: {} };
    const totals = () => { const sub = Cart.subtotal(), m = methods.find((x) => x.id === st.ship), free = sub >= SITE.shipping.freeFrom, fee = free ? 0 : m.price; return { sub, m, free, fee, total: sub + fee }; };
    const stepsHTML = () => `<ol class="steps" aria-label="Étapes de la commande">${["Panier", "Livraison", "Paiement"].map((l, i) => `<li class="${i + 1 === st.step ? "on" : i + 1 < st.step ? "past" : ""}"${i + 1 === st.step ? ' aria-current="step"' : ""}><i aria-hidden="true"></i><span>${l}</span></li>`).join("")}</ol>`;
    const optText = (l) => [l.color && FILAMENTS[l.color] ? FILAMENTS[l.color].name : null, l.size].filter(Boolean).join(" · ");

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
        body = `<form class="co-main" id="ship-form" novalidate>
            <h2 class="h-sub">Adresse de livraison</h2>
            <div class="form">
              ${fg("prenom", "Prénom", { required: true, auto: "given-name", value: i.prenom })}
              ${fg("nom", "Nom", { required: true, auto: "family-name", value: i.nom })}
              ${fg("email", "E-mail", { required: true, type: "email", auto: "email", full: true, value: i.email })}
              ${fg("adresse", "Adresse", { required: true, auto: "street-address", full: true, value: i.adresse })}
              ${fg("cp", "Code postal", { required: true, auto: "postal-code", zip: true, value: i.cp })}
              ${fg("ville", "Ville", { required: true, auto: "address-level2", value: i.ville })}
              ${fg("note", "Précision pour la commande", { full: true, value: i.note, placeholder: "ex. référence d'appareil, ville pour une skyline…" })}
            </div>
            <h2 class="h-sub" style="margin-top:32px">Mode de livraison <small class="muted" style="font:500 .85rem var(--font-b)">(France métropolitaine)</small></h2>
            ${methods.map((m) => `<label class="radio-card"><input type="radio" name="ship" value="${m.id}" ${m.id === st.ship ? "checked" : ""}><span><b>${esc(m.label)}</b><small>${esc(m.delay)}</small></span><span class="price">${t.free ? "Offerte" : euro(m.price)}</span></label>`).join("")}
          </form>
          ${summary(t, `<button class="btn btn-primary" type="submit" form="ship-form">Passer au paiement ${icon("arrow", "ic-arrow")}</button><button class="back" type="button" data-go="1">← Retour au panier</button>`)}`;
      } else if (st.step === 3) {
        body = `<form class="co-main" id="pay-form" novalidate>
            <h2 class="h-sub">Mode de paiement</h2>
            ${SITE.payment.mode === "email" ? `<p class="notice">Pas de paiement en ligne sur cette page : votre commande m'est envoyée par e-mail et je vous retourne un moyen de paiement sécurisé. Vous ne payez qu'après confirmation.</p>` : ""}
            ${pays.map((m) => `<label class="radio-card"><input type="radio" name="pay" value="${m.id}" ${m.id === st.pay ? "checked" : ""}><span><b>${esc(m.label)}</b><small>${esc(m.note)}</small></span></label>`).join("")}
            <h2 class="h-sub" style="margin-top:32px">Livraison</h2>
            <p class="muted">${esc(st.info.prenom)} ${esc(st.info.nom)} — ${esc(st.info.adresse)}, ${esc(st.info.cp)} ${esc(st.info.ville)}<br>${esc(t.m.label)} (${esc(t.m.delay)})</p>
            <div class="fg" style="margin-top:22px"><label class="check"><input type="checkbox" name="cgv" required><span>J'ai lu et j'accepte les <a href="cgv.html" target="_blank" rel="noopener">conditions générales de vente</a> et je reconnais que ma commande implique une obligation de paiement.</span></label><p class="err-msg" role="alert"></p></div>
          </form>
          ${summary(t, `<button class="btn btn-primary" type="submit" form="pay-form">Valider la commande · ${euro(t.total)}</button><button class="back" type="button" data-go="2">← Retour à la livraison</button>`)}`;
      }
      main.innerHTML = st.step === 4 ? st.done : `<section class="wrap page-head" style="padding-bottom:0"><h1 tabindex="-1">${["Votre panier", "Livraison", "Paiement"][st.step - 1]}</h1>${stepsHTML()}</section><section class="wrap checkout">${body}</section>`;
      enhance(main);
      if (focus) { scrollTo({ top: 0, behavior: RM ? "auto" : "smooth" }); const h = $("h1, h2", main); if (h) h.focus({ preventScroll: true }); }
    }

    main.addEventListener("click", (e) => {
      const q = e.target.closest("[data-q]"), go = e.target.closest("[data-go]");
      if (q) { Cart.setQty(+q.dataset.i, +q.dataset.q); render(); }
      if (go) { st.step = +go.dataset.go; render(true); }
    });
    main.addEventListener("change", (e) => {
      if (e.target.name === "ship") { st.ship = e.target.value; Object.assign(st.info, Object.fromEntries(new FormData($("#ship-form")))); render(); const r = $('input[name="ship"]:checked'); if (r) r.focus(); }
      if (e.target.name === "pay") st.pay = e.target.value;
    });
    main.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!validate(e.target)) return;
      if (e.target.id === "ship-form") { Object.assign(st.info, Object.fromEntries(new FormData(e.target))); st.step = 3; render(true); return; }
      /* Validation finale : on prépare l'e-mail de commande */
      const t = totals(), i = st.info, ref = "GF-" + Date.now().toString(36).toUpperCase().slice(-6);
      const pay = pays.find((m) => m.id === st.pay);
      const text = [`Commande ${ref}`, "", ...Cart.lines().map((l) => `- ${l.qty} × ${l.p.name}${optText(l) ? ` (${optText(l)})` : ""} : ${euro(l.total)}`), "",
        `Sous-total : ${euro(t.sub)}`, `Livraison (${t.m.label}) : ${t.free ? "offerte" : euro(t.fee)}`, `TOTAL : ${euro(t.total)}`, "",
        `Paiement souhaité : ${pay.label}`, "", "Livraison :", `${i.prenom} ${i.nom}`, i.adresse, `${i.cp} ${i.ville}`, i.email, i.note ? `Précision : ${i.note}` : ""].join("\n");
      const link = mailto(`Commande ${ref} — ${SITE.name}`, text);
      st.done = `<section class="wrap section"><div class="success" role="status">${tick}
        <h1 tabindex="-1">Commande ${ref} prête à partir</h1>
        <p class="muted">Votre messagerie vient de s'ouvrir avec le récapitulatif : <b>cliquez sur « Envoyer »</b> pour me transmettre la commande. Je vous réponds avec le moyen de paiement choisi (${esc(pay.label.toLowerCase())}), puis je lance l'impression.</p>
        <a class="btn btn-primary" href="${esc(link)}">Rouvrir l'e-mail de commande</a>
        <a class="btn btn-ghost" href="boutique.html">Retour à la boutique</a></div></section>`;
      st.step = 4; Cart.clear(); render(true); confetti();
      location.href = link;
    });
    render();
  }

  /* ================= PAGES LÉGALES =================
     Les <span data-fill="..."> sont remplis avec les valeurs de data.js. */
  function legal() {
    const values = { ...SITE.legal, name: SITE.name, email: SITE.email, url: SITE.url, freeFrom: euro(SITE.shipping.freeFrom), methods: SITE.shipping.methods.map((m) => `${m.label} (${euro(m.price)}, ${m.delay})`).join(" ; ") };
    $$("[data-fill]").forEach((el) => { el.textContent = values[el.dataset.fill] ?? ""; if (SITE.demo && el.dataset.fill in SITE.legal && el.dataset.fill !== "updated" && el.dataset.fill !== "status") { el.classList.add("todo"); el.title = "Valeur d'exemple à remplacer dans data.js"; } });
    $$("a[data-mail]").forEach((a) => { a.href = "mailto:" + SITE.email; a.textContent = SITE.email; });
  }

  /* ================= Aiguillage ================= */
  const routes = { home, shop, category, product: productPage, about, contact, cart: cartPage, legal };
  (routes[document.body.dataset.page] || (() => {}))();
  enhance(main);
})();
