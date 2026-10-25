/* Sección de promociones del inicio. Datos: panel de administración (api.php?promo=1);
   si no hay nada guardado, usa PROMO de catalogo.js. */
(async function () {
  const band = document.getElementById("promo-band");
  if (!band) return;
  let P = typeof PROMO !== "undefined" ? PROMO : null;
  try {
    const r = await fetch("api.php?promo=1", { cache: "no-store" });
    if (r.ok) { const d = await r.json(); if (d && typeof d === "object") P = d; }
  } catch (e) { /* sin servidor: se usa el respaldo */ }
  if (!P || !P.activa) return;
  const wa = String((typeof AJUSTES !== "undefined" && AJUSTES.whatsapp) || "").replace(/\D/g, "");
  const set = (sel, txt) => { const n = band.querySelector(sel); if (n && txt) n.textContent = txt; };
  set("[data-promo=etiqueta]", "🔥 " + (P.etiqueta || "PROMOCIÓN"));
  set("[data-promo=titulo]", P.titulo);
  set("[data-promo=texto]", P.texto);
  set("[data-promo=vigencia]", P.vigencia);
  const badge = band.querySelector("[data-promo=destacado]");
  if (badge) { if (P.destacado) { badge.textContent = P.destacado; badge.hidden = false; } else badge.hidden = true; }
  const btn = band.querySelector("[data-promo=boton]");
  if (btn) {
    btn.firstChild.textContent = (P.boton || "QUIERO LA PROMO") + " ↗";
    const msg = "Hola, JL Camiones. Quiero aprovechar la promoción: " + P.titulo + (P.destacado ? " (" + P.destacado + ")" : "");
    if (wa) btn.href = "https://wa.me/" + wa + "?text=" + encodeURIComponent(msg);
  }
  band.classList.add("is-promo");
})();
