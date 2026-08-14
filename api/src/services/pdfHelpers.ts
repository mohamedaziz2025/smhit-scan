import type PDFKit from "pdfkit";

export const BRAND = "#F26A21";
export const INK = "#0F172A";
export const MUTED = "#64748B";

/**
 * Cadre décoratif + filigrane "SMHIT" — appelé sur chaque nouvelle page pour
 * lui donner l'aspect "papier à en-tête encadré" du document réel (bordure
 * orange fine tout autour) plutôt qu'une page blanche nue.
 *
 * Voir note historique sur le bug rotate()+width (23 pages au lieu de ~3,
 * fixé via lineBreak:false) : `doc.save()`/`doc.restore()` ne couvrent que
 * l'état graphique (couleur, matrice de transformation…) — PAS le curseur
 * texte (`doc.x`/`doc.y`, de simples propriétés JS, hors de cette pile). Le
 * `.text(..., {lineBreak:false})` du filigrane laissait donc le curseur
 * bloqué à (80, 380) après chaque appel, décalant tout le contenu qui suit
 * vers le milieu de la page à chaque nouvelle page — d'où des rapports de
 * 8+ pages à moitié vides pour un contenu qui tient normalement sur 3. On
 * restaure donc explicitement x/y après coup.
 */
export function addWatermark(doc: PDFKit.PDFDocument): void {
  const { x, y } = doc;

  doc.save();
  doc.lineWidth(1.2).strokeColor(BRAND, 0.55);
  doc.roundedRect(18, 18, doc.page.width - 36, doc.page.height - 36, 6).stroke();
  doc.restore();

  doc.save();
  doc.rotate(-35, { origin: [297, 420] });
  doc.fillColor(BRAND, 0.05).fontSize(90).text("SMHIT", 80, 380, { lineBreak: false });
  doc.restore();

  doc.x = x;
  doc.y = y;
}

/**
 * Emblème vectoriel (dégradé + pictogramme "bouclier") — même identité
 * visuelle que le logo web/mobile (`SmhitLogo`), recréé ici en primitives
 * PDFKit puisqu'aucun fichier image n'est embarqué dans l'API.
 */
export function drawLogoMark(doc: PDFKit.PDFDocument, x: number, y: number, size = 36): void {
  const grad = doc.linearGradient(x, y, x + size, y + size);
  grad.stop(0, "#FF8A3D").stop(0.5, BRAND).stop(1, "#D2551A");
  doc.roundedRect(x, y, size, size, size * 0.28).fill(grad);

  doc.save();
  const scale = (size * 0.5) / 24;
  doc.translate(x + size * 0.22, y + size * 0.16).scale(scale, scale);
  doc.path("M12 2l7 3v6c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V5l7-3z").fillOpacity(0.95).fill("#FFFFFF");
  doc.restore();
  doc.fillOpacity(1);
}

/** En-tête société (§ fiche/rapport réels) — identité + agréments + emblème vectoriel (pas de logo tiers). */
export function drawLetterhead(doc: PDFKit.PDFDocument): void {
  drawLogoMark(doc, 50, 56, 34);
  doc.fillColor(BRAND).fontSize(24).font("Helvetica-Bold").text("SMHIT", 94, 60);
  doc
    .fillColor(MUTED)
    .fontSize(8.5)
    .font("Helvetica-Bold")
    .text("Société de Maintenance et Hygiène Industrielle Tunisienne", 50, 100)
    .font("Helvetica")
    .text("Société Agréée Par Le Ministère De L'Environnement — Société Agréée Par Le Ministère De La Santé Publique")
    .text("M.F: 020715RAM000 — Zone Artisanale Bouargoub 8040")
    .text("Certifiée ISO 9001 V2015 (n°01 100 2215618) & ISO 14001 V2015 (n°01 104 2215618)");

  doc.moveTo(50, 148).lineTo(doc.page.width - 50, 148).lineWidth(0.75).strokeColor(BRAND, 0.3).stroke();
  doc.fillColor(INK);
  doc.x = 50;
  doc.y = 158;
}

export function drawInfoRow(doc: PDFKit.PDFDocument, label: string, value: string): void {
  doc.fontSize(10).font("Helvetica-Bold").fillColor(MUTED).text(`${label} : `, { continued: true });
  doc.font("Helvetica").fillColor(INK).text(value);
}

/** Titre de section avec liseré coloré — hiérarchie visuelle plus nette qu'un simple texte orange. */
export function sectionTitle(doc: PDFKit.PDFDocument, title: string): void {
  const barX = doc.x;
  const barY = doc.y;
  doc.rect(barX, barY + 1.5, 4, 15).fill(BRAND);
  doc.fontSize(15).font("Helvetica-Bold").fillColor(INK).text(title, barX + 12, barY);
  doc.x = barX;
  doc.moveDown(0.6);
  doc.fillColor(INK);
}

/** Numérotation de page centrée en pied de page — appelé après coup une fois le nombre total de pages connu. */
export function drawFooter(doc: PDFKit.PDFDocument, pageIndex: number, pageCount: number): void {
  // Le pied de page est délibérément sous la marge basse (`maxY() = height -
  // margins.bottom`) — PDFKit compare `document.y` à `maxY()` au moment de
  // dessiner du texte et déclenche SA PROPRE pagination automatique dès que
  // la position dépasse cette limite, même avec x/y explicites ET
  // lineBreak:false (qui n'évite que le retour à la ligne, pas cette
  // vérification-là). Ça créait une page fantôme blanche par appel (12
  // pages livrées pour un rapport de 6, une page originale + une page ne
  // contenant que son numéro, répété). Fix : on met temporairement la marge
  // basse à 0 pour repousser maxY() sous le texte du pied de page.
  const originalBottom = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;
  const y = doc.page.height - 34;
  doc
    .fontSize(8)
    .font("Helvetica")
    .fillColor(MUTED)
    .text(`SMHIT — Page ${pageIndex} / ${pageCount}`, 0, y, { width: doc.page.width, align: "center", lineBreak: false });
  doc.page.margins.bottom = originalBottom;
}

const CELL_PAD_X = 6;
const CELL_PAD_Y = 5;
const MIN_ROW_HEIGHT = 17;

export function drawTable(
  doc: PDFKit.PDFDocument,
  headers: string[],
  rows: Array<Array<string | number>>,
  colWidths?: number[],
): void {
  const startX = doc.x;
  const totalWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  let widths = colWidths ?? headers.map(() => totalWidth / headers.length);

  // Filet de sécurité : des largeurs explicites qui dépassent la largeur
  // imprimable (ça arrive vite à additionner des colWidths "au pif") font
  // déborder les colonnes de droite hors du cadre de page — on les
  // rééchelonne proportionnellement plutôt que de laisser déborder.
  const widthsSum = widths.reduce((a, b) => a + b, 0);
  if (widthsSum > totalWidth) {
    const scale = totalWidth / widthsSum;
    widths = widths.map((w) => w * scale);
  }

  const xAt = (i: number) => startX + widths.slice(0, i).reduce((a, b) => a + b, 0);
  const tableTop = doc.y;

  // Hauteur de ligne calculée sur le texte réel (doc.heightOfString), pas une
  // constante à une ligne : un en-tête/contenu qui passe à la ligne dans sa
  // colonne (ex. "Endommagés" dans une colonne étroite, ou une observation
  // longue) débordait auparavant sur la ligne suivante au lieu d'agrandir sa
  // propre ligne.
  const rowHeightFor = (cells: Array<string | number>, fontSize: number, bold: boolean): number => {
    doc.fontSize(fontSize).font(bold ? "Helvetica-Bold" : "Helvetica");
    const maxTextHeight = Math.max(
      ...cells.map((c, i) => doc.heightOfString(String(c), { width: widths[i] - CELL_PAD_X * 2 })),
    );
    return Math.max(maxTextHeight + CELL_PAD_Y * 2, MIN_ROW_HEIGHT);
  };

  let y = doc.y;
  const headerHeight = rowHeightFor(headers, 7.5, true);
  doc.rect(startX, y, totalWidth, headerHeight).fill(BRAND);
  doc.fillColor("#FFFFFF").fontSize(7.5).font("Helvetica-Bold");
  headers.forEach((h, i) => doc.text(String(h), xAt(i) + CELL_PAD_X, y + CELL_PAD_Y, { width: widths[i] - CELL_PAD_X * 2 }));

  y += headerHeight;
  doc.font("Helvetica").fillColor(INK);
  let segmentTop = tableTop; // haut du morceau de tableau sur la page courante (repart de 0 après un saut de page)
  rows.forEach((row, rowIndex) => {
    const rowHeight = rowHeightFor(row, 7.5, false);

    // Ajoute une nouvelle page si la ligne dépasse la zone imprimable —
    // sans ça, PDFKit continue d'écrire hors-page (texte tronqué en bas).
    if (y + rowHeight > doc.page.height - doc.page.margins.bottom - 5) {
      // Referme le cadre du morceau de tableau resté sur la page précédente
      // avant de tourner la page — sinon un tableau qui déborde dessinerait
      // un cadre absurde du haut de la 1ère page jusqu'au bas de la dernière.
      doc.lineWidth(0.75).strokeColor(BRAND, 0.4).rect(startX, segmentTop, totalWidth, y - segmentTop).stroke();
      doc.addPage();
      addWatermark(doc);
      y = doc.y;
      segmentTop = y;
    }

    if (rowIndex % 2 === 0) {
      doc.rect(startX, y, totalWidth, rowHeight).fill("#FBF4EE");
      doc.fillColor(INK);
    }
    doc.fontSize(7.5).font("Helvetica");
    row.forEach((cell, i) => doc.text(String(cell), xAt(i) + CELL_PAD_X, y + CELL_PAD_Y, { width: widths[i] - CELL_PAD_X * 2 }));
    doc
      .moveTo(startX, y + rowHeight)
      .lineTo(startX + totalWidth, y + rowHeight)
      .lineWidth(0.5)
      .strokeColor("#E7EAF0")
      .stroke();
    y += rowHeight;
  });

  // Cadre fin autour du dernier morceau du tableau (en-tête + lignes de la
  // page courante) pour un rendu moins "à plat" — dessiné en dernier pour
  // ne pas être recouvert.
  doc.lineWidth(0.75).strokeColor(BRAND, 0.4).rect(startX, segmentTop, totalWidth, y - segmentTop).stroke();

  // Même piège que addWatermark() (voir la note là-bas) : les cellules sont
  // écrites avec des .text(str, x, y, …) à position explicite, qui laissent
  // le curseur PDFKit collé au x de la DERNIÈRE cellule (colonne la plus à
  // droite) plutôt que de le rendre au point de départ du tableau. Sans ce
  // reset, tout ce qui suit en positionnement relatif (titre de section,
  // tableau suivant…) démarre décalé vers la droite — voire hors-page.
  doc.x = startX;
  doc.y = y + 8;
}

export function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const PDF_SAFE_SYMBOLS: Record<string, string> = { "↗": "^", "↘": "v", "→": "-" };

/**
 * Les flèches de tendance (↗↘→, voir computeTrendSymbol) s'affichent
 * correctement dans l'API/le web (fonts système Unicode), mais Helvetica —
 * la seule police standard PDF utilisée ici, pas de fichier de police
 * embarqué — ne couvre que WinAnsiEncoding et rend ces caractères comme des
 * glyphes de substitution illisibles. Substitution ASCII uniquement pour
 * l'affichage PDF ; la donnée elle-même (JSON, web) garde le vrai symbole.
 */
export function pdfSafeSymbol(symbol: string): string {
  return PDF_SAFE_SYMBOLS[symbol] ?? symbol;
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

export const WARNING = "#F59E0B";
export const DANGER = "#DC2626";

export interface StatCardSpec {
  label: string;
  value: string | number;
  tone?: "warning" | "danger";
}

/**
 * Grille de cartes KPI (4 par ligne) — même esprit que le composant `Kpi`
 * du web (chiffre en avant, libellé en dessous), plutôt qu'un tableau
 * "Indicateur | Résultat" plat pour la synthèse managériale des rapports.
 */
export function drawStatCards(doc: PDFKit.PDFDocument, cards: StatCardSpec[], perRow = 4): void {
  const startX = doc.x;
  const totalWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const gap = 8;
  const cardWidth = (totalWidth - gap * (perRow - 1)) / perRow;
  const cardHeight = 52;
  let y = doc.y;

  cards.forEach((card, i) => {
    const col = i % perRow;
    if (col === 0 && i > 0) y += cardHeight + gap;
    const x = startX + col * (cardWidth + gap);

    const color = card.tone === "danger" ? DANGER : card.tone === "warning" ? WARNING : INK;
    doc.roundedRect(x, y, cardWidth, cardHeight, 6).fillAndStroke("#FBF4EE", "#F0DFD1");
    doc
      .fontSize(17)
      .font("Helvetica-Bold")
      .fillColor(color)
      .text(String(card.value), x + 8, y + 9, { width: cardWidth - 16, lineBreak: false });
    doc
      .fontSize(6.7)
      .font("Helvetica")
      .fillColor(MUTED)
      .text(card.label, x + 8, y + 32, { width: cardWidth - 16 });
  });

  doc.x = startX;
  doc.y = y + cardHeight + 10;
  doc.fillColor(INK);
}
