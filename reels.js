/* reel.js — carrusel animado de marcas (reemplaza el video). */
(function () {
  const INTERVAL = 3200;
  const IG = (typeof AJUSTES !== "undefined" && AJUSTES.instagram || "").split("/").filter(Boolean).pop() || "jlcamiones";
  // Para usar logos oficiales: guarda el archivo en fotos/marcas/ y escribe su nombre en "logo".
  const SLIDES = [
    { type: "intro" },
    { cls: "freightliner", name: "Freightliner", logo: "freightliner.png" },
    { cls: "mercedes", name: "Mercedes-Benz", logo: "mercedes-benz.png" },
    { cls: "mann", name: "Mann Filter", logo: "mann-filter.png" },
    { cls: "worldparts", name: "World Parts", logo: "world-parts.png" },
    { cls: "ford", name: "Ford Cargo", logo: "ford-cargo.png" },
    { cls: "international", name: "Internacional", logo: "internacional.png" },
    { type: "outro" }
  ];
  const root = document.getElementById("brand-reel");
  if (!root) return;
  const box = document.getElementById("reel-slides");
  const dots = document.getElementById("reel-dots");
  const bar = document.getElementById("reel-progress");
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; };

  const nodes = SLIDES.map((s, i) => {
    const slide = el("div", "reel-slide");
    if (s.type === "intro") {
      slide.append(el("div", "reel-title", "Tenemos las mejores marcas"), el("span", "reel-pill", "A tu disposición"));
    } else if (s.type === "outro") {
      const c = el("div", "reel-closing");
      c.append(el("div", "reel-title", "¡Y mucho más!"), el("div", "reel-sub", "Síguenos para que no te pierdas de nada"), el("div", "reel-sub", "@" + IG));
      slide.append(c);
    } else {
      const text = el("div", "reel-brand " + s.cls, s.name);
      const img = new Image();
      img.className = "reel-logo-img"; img.alt = s.name;
      img.onload = () => text.replaceWith(img);
      img.src = "fotos/marcas/" + s.logo;
      slide.append(text, el("div", "reel-sub", "Repuestos de calidad al mejor precio"));
    }
    box.appendChild(slide);
    const d = el("button"); d.type = "button"; d.setAttribute("aria-label", "Ir a la diapositiva " + (i + 1));
    d.addEventListener("click", () => { go(i); });
    dots.appendChild(d);
    return { slide, dot: d };
  });

  let cur = -1, timer = null, paused = false, start = 0, raf = 0;
  function go(i) {
    const prev = cur;
    cur = (i + nodes.length) % nodes.length;
    nodes.forEach((n, k) => {
      n.slide.classList.toggle("is-active", k === cur);
      n.slide.classList.toggle("is-leaving", k === prev && k !== cur);
      n.dot.classList.toggle("is-active", k === cur);
    });
    restart();
  }
  function tick(t) {
    if (!paused) { start = start || t; bar.style.width = Math.min(100, (t - start) / INTERVAL * 100) + "%"; if (t - start >= INTERVAL) return go(cur + 1); }
    raf = requestAnimationFrame(tick);
  }
  function restart() { cancelAnimationFrame(raf); start = 0; bar.style.width = "0"; raf = requestAnimationFrame(tick); }

  document.getElementById("reel-next").addEventListener("click", () => go(cur + 1));
  root.addEventListener("mouseenter", () => { paused = true; });
  root.addEventListener("mouseleave", () => { paused = false; start = 0; });
  document.addEventListener("visibilitychange", () => { paused = document.hidden; start = 0; });
  go(0);
})();
