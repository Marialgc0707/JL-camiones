/* Rellena los datos del negocio desde catalogo.js (NEGOCIO y AJUSTES). */
(function () {
  const N = typeof NEGOCIO !== "undefined" ? NEGOCIO : {};
  const A = typeof AJUSTES !== "undefined" ? AJUSTES : {};
  const wa = String(A.whatsapp || "").replace(/\D/g, "");
  const val = { razonSocial: N.razonSocial, rif: N.rif, direccion: N.direccion, ciudad: N.ciudad, correo: N.correo, horario: N.horario, whatsapp: wa ? "+" + wa : "" };
  const nombre = { razonSocial: "razón social", rif: "RIF", direccion: "dirección", correo: "correo", horario: "horario", ciudad: "ciudad", whatsapp: "WhatsApp" };
  document.querySelectorAll("[data-n]").forEach(el => {
    const k = el.dataset.n;
    if (val[k]) el.textContent = val[k];
    else { el.textContent = "[COMPLETAR: " + (nombre[k] || k) + "]"; el.classList.add("pendiente"); }
  });
  // WhatsApp: todos los enlaces con data-wa usan AJUSTES.whatsapp (único lugar donde se escribe el número)
  document.querySelectorAll("a[data-wa]").forEach(a => {
    if (!wa) { a.hidden = true; return; }
    const t = a.dataset.waText;
    a.href = "https://wa.me/" + wa + (t ? "?text=" + encodeURIComponent(t) : "");
  });
  // Instagram: todos los enlaces con data-ig usan AJUSTES.instagram
  const ig = String(A.instagram || "").trim();
  const handle = ig.split("/").filter(Boolean).pop();
  document.querySelectorAll("a[data-ig]").forEach(a => { if (ig) a.href = ig; else a.hidden = true; });
  document.querySelectorAll("[data-ig-handle]").forEach(e => { if (handle) e.textContent = "@" + handle; });
})();
