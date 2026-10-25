/* xlsx-lite.js — genera un archivo Excel (.xlsx) real en el navegador, sin librerías externas.
   Uso: descargarInventarioXlsx(items) */
(function () {
  const enc = new TextEncoder();
  const esc = v => String(v ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const col = n => String.fromCharCode(65 + n); // A..N

  const T = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = T[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };

  function zip(files) { // sin compresión ("stored"): válido para Excel
    const parts = [], central = []; let offset = 0;
    files.forEach(f => {
      const name = enc.encode(f.name), data = enc.encode(f.text), crc = crc32(data);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true);
      lh.setUint16(10, 0, true); lh.setUint16(12, 0x21, true);
      lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true);
      lh.setUint16(26, name.length, true);
      parts.push(new Uint8Array(lh.buffer), name, data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
      ch.setUint16(14, 0x21, true); ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true);
      ch.setUint16(28, name.length, true); ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), name);
      offset += 30 + name.length + data.length;
    });
    const cdSize = central.reduce((s, p) => s + p.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }

  // Estilos: 1 encabezado, 2 dinero, 3 porcentaje, 4 negrita, 5 negrita dinero
  const STYLES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;$&quot;#,##0.00"/></numFmts>' +
    '<fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
    '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF101C2B"/></patternFill></fill></fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
    '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '<xf numFmtId="9" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
    '<xf numFmtId="164" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

  function buildSheet(items) {
    const H = ["Código", "Nombre", "Marca", "Categoría", "Modelo / aplicación", "Cantidad", "Precio de compra (USD)", "Precio de venta (USD)",
      "Ganancia por unidad (USD)", "Margen", "Inversión en stock (USD)", "Ganancia potencial (USD)", "Estado", "Visible en tienda"];
    const s = (r, c, v, st) => `<c r="${col(c)}${r}" t="inlineStr"${st ? ` s="${st}"` : ""}><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
    const n = (r, c, v, st) => `<c r="${col(c)}${r}"${st ? ` s="${st}"` : ""}><v>${Number(v) || 0}</v></c>`;
    const f = (r, c, formula, val, st) => `<c r="${col(c)}${r}"${st ? ` s="${st}"` : ""}><f>${formula}</f><v>${Number.isFinite(val) ? val : 0}</v></c>`;
    let rows = `<row r="1" ht="34" customHeight="1">${H.map((h, i) => s(1, i, h, 1)).join("")}</row>`;
    let tCant = 0, tInv = 0, tGan = 0;
    items.forEach((p, i) => {
      const r = i + 2, c = Number(p.precio_compra) || 0, v = Number(p.precio) || 0, q = Number(p.cantidad) || 0, g = v - c;
      tCant += q; tInv += c * q; tGan += g * q;
      rows += `<row r="${r}">` + s(r, 0, p.codigo) + s(r, 1, p.nombre) + s(r, 2, p.marca) + s(r, 3, p.categoria) + s(r, 4, p.modelo) +
        n(r, 5, q) + n(r, 6, c, 2) + n(r, 7, v, 2) +
        f(r, 8, `H${r}-G${r}`, g, 2) + f(r, 9, `IF(H${r}&gt;0,I${r}/H${r},0)`, v > 0 ? g / v : 0, 3) +
        f(r, 10, `G${r}*F${r}`, c * q, 2) + f(r, 11, `I${r}*F${r}`, g * q, 2) +
        s(r, 12, p.agotado ? "Agotado" : "Disponible") + s(r, 13, p.visible ? "Sí" : "No") + `</row>`;
    });
    const last = items.length + 1, t = last + 1;
    rows += `<row r="${t}">` + s(t, 0, "TOTAL", 4) + s(t, 1, "", 4) + f(t, 5, `SUM(F2:F${last})`, tCant, 4) +
      f(t, 10, `SUM(K2:K${last})`, tInv, 5) + f(t, 11, `SUM(L2:L${last})`, tGan, 5) + `</row>`;
    const widths = [14, 34, 16, 22, 28, 10, 14, 14, 14, 10, 16, 16, 12, 12];
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
      `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>` +
      `<sheetData>${rows}</sheetData><autoFilter ref="A1:N${Math.max(last, 1)}"/></worksheet>`;
  }

  window.crearXlsxInventario = function (items) {
    const X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    return zip([
      { name: "[Content_Types].xml", text: X + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>' },
      { name: "_rels/.rels", text: X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
      { name: "xl/workbook.xml", text: X + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Inventario" sheetId="1" r:id="rId1"/></sheets></workbook>' },
      { name: "xl/_rels/workbook.xml.rels", text: X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
      { name: "xl/styles.xml", text: STYLES },
      { name: "xl/worksheets/sheet1.xml", text: buildSheet(items) }
    ]);
  };

  window.descargarInventarioXlsx = function (items) {
    const blob = window.crearXlsxInventario(items);
    const d = new Date(), p = x => String(x).padStart(2, "0");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `inventario-jl-camiones-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.xlsx`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
})();
