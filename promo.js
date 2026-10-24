/* Convierte la sección inferior del inicio en promoción, según PROMO en catalogo.js */
(function () {
  if (typeof PROMO === "undefined" || !PROMO.activa) return;
  const band = document.getElementById("promo-band");
  if (!band) return;
  const wa = String((typeof AJUSTES !== "undefined" && AJUSTES.whatsapp) || "").replace(/\D/g, "");
  const set = (sel, txt) => { const n = band.querySelector(sel); if (n && txt) n.textContent = txt; };
  set("[data-promo=etiqueta]", "🔥 " + PROMO.etiqueta);
  set("[data-promo=titulo]", PROMO.titulo);
  set("[data-promo=texto]", PROMO.texto);
  set("[data-promo=vigencia]", PROMO.vigencia);
  const badge = band.querySelector("[data-promo=destacado]");
  if (badge) { if (PROMO.destacado) badge.textContent = PROMO.destacado; else badge.hidden = true; }
  const btn = band.querySelector("[data-promo=boton]");
  if (btn) {
    btn.firstChild.textContent = (PROMO.boton || "QUIERO LA PROMO") + " ↗";
    const msg = "Hola, JL Camiones. Quiero aprovechar la promoción: " + PROMO.titulo + (PROMO.destacado ? " (" + PROMO.destacado + ")" : "");
    if (wa) btn.href = "https://wa.me/" + wa + "?text=" + encodeURIComponent(msg);
  }
  band.classList.add("is-promo");
})();
