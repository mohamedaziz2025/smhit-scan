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
