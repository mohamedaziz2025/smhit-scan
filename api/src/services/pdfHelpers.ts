import type PDFKit from "pdfkit";

export const BRAND = "#F26A21";
export const INK = "#0F172A";
export const MUTED = "#64748B";

/** Filigrane "SMHIT" — voir note dans generateReportPdf sur le bug rotate()+width. */
export function addWatermark(doc: PDFKit.PDFDocument): void {
  doc.save();
  doc.rotate(-35, { origin: [297, 420] });
  doc.fillColor(BRAND, 0.06).fontSize(90).text("SMHIT", 80, 380, { lineBreak: false });
  doc.restore();
}

/** En-tête société (§ fiche/rapport réels) — identité + agréments, texte seul (pas de logo tiers). */
export function drawLetterhead(doc: PDFKit.PDFDocument): void {
  doc.fillColor(BRAND).fontSize(28).font("Helvetica-Bold").text("SMHIT", 50, 60);
  doc
    .fillColor(MUTED)
    .fontSize(9)
    .font("Helvetica-Bold")
    .text("Société de Maintenance et Hygiène Industrielle Tunisienne", 50, 92)
    .font("Helvetica")
    .text("Société Agréée Par Le Ministère De L'Environnement — Société Agréée Par Le Ministère De La Santé Publique")
    .text("M.F: 020715RAM000 — Zone Artisanale Bouargoub 8040")
    .text("Certifiée ISO 9001 V2015 (n°01 100 2215618) & ISO 14001 V2015 (n°01 104 2215618)");
  doc.fillColor(INK);
}

export function drawInfoRow(doc: PDFKit.PDFDocument, label: string, value: string): void {
  doc.fontSize(10).font("Helvetica-Bold").fillColor(MUTED).text(`${label} : `, { continued: true });
  doc.font("Helvetica").fillColor(INK).text(value);
}

export function sectionTitle(doc: PDFKit.PDFDocument, title: string): void {
  doc.fontSize(15).font("Helvetica-Bold").fillColor(BRAND).text(title);
  doc.moveDown(0.5);
  doc.fillColor(INK);
}

export function drawTable(
  doc: PDFKit.PDFDocument,
  headers: string[],
  rows: Array<Array<string | number>>,
  colWidths?: number[],
): void {
  const startX = doc.x;
  const totalWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const widths = colWidths ?? headers.map(() => totalWidth / headers.length);

  const xAt = (i: number) => startX + widths.slice(0, i).reduce((a, b) => a + b, 0);

  doc.fontSize(7.5).font("Helvetica-Bold").fillColor("#FFFFFF");
  let y = doc.y;
  doc.rect(startX, y, totalWidth, 16).fill(INK);
  doc.fillColor("#FFFFFF");
  headers.forEach((h, i) => doc.text(String(h), xAt(i) + 4, y + 4, { width: widths[i] - 8 }));

  y += 16;
  doc.font("Helvetica").fillColor(INK);
  rows.forEach((row, rowIndex) => {
    // Ajoute une nouvelle page si la ligne dépasse la zone imprimable —
    // sans ça, PDFKit continue d'écrire hors-page (texte tronqué en bas).
    if (y > doc.page.height - doc.page.margins.bottom - 20) {
      doc.addPage();
      addWatermark(doc);
      y = doc.y;
    }

    const rowHeight = 16;
    if (rowIndex % 2 === 0) {
      doc.rect(startX, y, totalWidth, rowHeight).fill("#F8FAFC");
      doc.fillColor(INK);
    }
    row.forEach((cell, i) => doc.text(String(cell), xAt(i) + 4, y + 4, { width: widths[i] - 8 }));
    y += rowHeight;
  });

  doc.y = y + 8;
}

export function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/**
 * Place un caractère sur un arc de cercle (PDFKit n'a pas de "text on path"
 * natif) : translation au point de l'arc puis rotation tangentielle avant
 * de dessiner le caractère à l'origine locale.
 */
function drawArcText(
  doc: PDFKit.PDFDocument,
  text: string,
  cx: number,
  cy: number,
  radius: number,
  startDeg: number,
  endDeg: number,
  fontSize: number,
  flip: boolean,
): void {
  doc.font("Helvetica-Bold").fontSize(fontSize).fillColor(BRAND);
  const step = (endDeg - startDeg) / Math.max(text.length - 1, 1);
  for (let i = 0; i < text.length; i++) {
    const deg = startDeg + step * i;
    const rad = (deg * Math.PI) / 180;
    const x = cx + radius * Math.sin(rad);
    const y = cy - radius * Math.cos(rad);
    doc.save();
    doc.translate(x, y);
    // Sur l'arc du bas, le texte serait dessiné tête en bas sans le +180° —
    // "flip" corrige l'orientation pour qu'il reste lisible normalement.
    doc.rotate(flip ? deg + 180 : deg, { origin: [0, 0] });
    doc.text(text[i], -3, -3, { lineBreak: false });
    doc.restore();
  }
}

/**
 * Cachet SMHIT — cercle vectoriel (pas d'image externe à charger) : texte
 * courbé en haut/bas + identité au centre. Placé en bas des rapports
 * générés (§ signature), comme le cachet humide sur le document papier.
 */
export function drawCachet(doc: PDFKit.PDFDocument, cx: number, cy: number, radius = 46): void {
  doc.save();
  doc.lineWidth(1.4).strokeColor(BRAND);
  doc.circle(cx, cy, radius).stroke();
  doc.lineWidth(0.6);
  doc.circle(cx, cy, radius - 7).stroke();
  doc.restore();

  drawArcText(doc, "STE MAINTENANCE HYGIENE INDUSTRIELLE", cx, cy, radius - 15, -100, 100, 6, false);
  drawArcText(doc, "BOUARGOUB - TUNISIE", cx, cy, radius - 15, 235, 125, 6.5, true);

  doc.fillColor(BRAND).font("Helvetica-Bold").fontSize(13).text("SMHIT", cx - 25, cy - 7, { width: 50, align: "center", lineBreak: false });
  doc.fillColor(MUTED).font("Helvetica").fontSize(5).text("Agréée Min. Santé", cx - 30, cy + 7, { width: 60, align: "center", lineBreak: false });
  doc.fillColor(INK);
}

/**
 * Bloc "Cachet & Signature SMHIT" à placer en fin de rapport (§ validation) —
 * ajoute une nouvelle page si la place manque plutôt que de couper le cachet
 * en bas de page.
 */
export function drawSignatureBlock(doc: PDFKit.PDFDocument): void {
  const radius = 42;
  const blockHeight = 20 + radius * 2 + 10;
  if (doc.y + blockHeight > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
    addWatermark(doc);
  }

  doc.moveDown(1.5);
  const rightEdge = doc.page.width - doc.page.margins.right;
  const labelY = doc.y;
  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor(MUTED)
    .text("Cachet & Signature SMHIT", rightEdge - 160, labelY, { width: 160, align: "right" });

  const cx = rightEdge - radius;
  const cy = labelY + 18 + radius;
  drawCachet(doc, cx, cy, radius);

  doc.y = cy + radius + 10;
  doc.fillColor(INK);
}
