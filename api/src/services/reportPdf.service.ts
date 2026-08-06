import PDFDocument from "pdfkit";
import { randomUUID } from "node:crypto";
import type { IReport } from "../models/Report";
import { Client } from "../models/Client";
import { Site } from "../models/Site";
import { ensureBucket, minioClient } from "../config/minio";
import { env } from "../config/env";

const BRAND = "#F26A21";
const INK = "#0F172A";
const MUTED = "#64748B";

/**
 * Rendu PDF du rapport (§8) : page de garde, tendance 12 mois (mini-
 * histogramme dessiné directement avec les primitives PDFKit — pas de
 * dépendance à un service externe type QuickChart), tableaux d'intervention,
 * conclusion. Filigrane "SMHIT" sur chaque page comme sur le modèle papier.
 */
export async function generateReportPdf(report: IReport): Promise<Buffer> {
  const [client, site] = await Promise.all([Client.findById(report.clientId), Site.findById(report.siteId)]);

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const addWatermark = () => {
    // `lineBreak: false` et pas de `width`/`align` : avec un `.rotate()`
    // actif, le calcul de mise en page multi-ligne de PDFKit se trompe sur
    // la hauteur restante de page et déclenche des `addPage()` en cascade
    // (repéré via un rapport de test à 23 pages pour une seule fiche).
    doc.save();
    doc.rotate(-35, { origin: [297, 420] });
    doc.fillColor(BRAND, 0.06).fontSize(90).text("SMHIT", 80, 380, { lineBreak: false });
    doc.restore();
  };

  // --- Page de garde ---
  addWatermark();
  doc.fillColor(BRAND).fontSize(28).font("Helvetica-Bold").text("SMHIT", 50, 60);
  doc
    .fillColor(MUTED)
    .fontSize(10)
    .font("Helvetica")
    .text("Système de digitalisation des fiches de lutte antiparasitaire", 50, 92);

  doc.moveDown(4);
  doc.fillColor(INK).fontSize(20).font("Helvetica-Bold").text("Rapport d'intervention", { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(13).font("Helvetica").fillColor(MUTED).text(report.period.label, { align: "center" });

  doc.moveDown(2);
  drawInfoRow(doc, "Client", client?.name ?? "—");
  drawInfoRow(doc, "Site", site?.name ?? "—");
  drawInfoRow(doc, "Période", `${formatDate(report.period.from)} — ${formatDate(report.period.to)}`);
  drawInfoRow(doc, "Statut", report.status);

  const derat = report.deratisation as
    | {
        interventions?: Array<{
          index: number;
          zonesExternes: Array<{ zone: string; nbPiege: number; nbPrise: number; pctPrise: number; nbCadavre: number; pctCadavre: number }>;
          zonesInternes: Array<{ zone: string; nbPiege: number; nbCadavre: number; indiceCapture: number }>;
          commentairesExternes: string[];
          commentairesInternes: string[];
        }>;
        tendance?: { months: Array<{ month: string; appatsConsommes: number; cadavres: number; tendance: string; risque: string }> };
        conclusion?: { interpretation: string; risqueActuel: string; evolution: string; actionRecommandee: string };
      }
    | undefined;

  // --- Section I : Dératisation ---
  if (derat?.interventions?.length) {
    doc.addPage();
    addWatermark();
    sectionTitle(doc, "I. Dératisation");

    for (const intervention of derat.interventions) {
      doc.fontSize(12).font("Helvetica-Bold").fillColor(INK).text(`Intervention n°${intervention.index}`);
      doc.moveDown(0.3);

      if (intervention.zonesExternes.length > 0) {
        doc.fontSize(10).font("Helvetica-Bold").text("Zones externes");
        drawTable(
          doc,
          ["Zone", "Postes", "Prises", "% Prise", "Cadavres", "% Cadavre"],
          intervention.zonesExternes.map((z) => [z.zone, z.nbPiege, z.nbPrise, `${z.pctPrise}%`, z.nbCadavre, `${z.pctCadavre}%`]),
        );
      }
      if (intervention.zonesInternes.length > 0) {
        doc.moveDown(0.3);
        doc.fontSize(10).font("Helvetica-Bold").text("Zones internes");
        drawTable(
          doc,
          ["Zone", "Plaques", "Cadavres", "Indice capture"],
          intervention.zonesInternes.map((z) => [z.zone, z.nbPiege, z.nbCadavre, z.indiceCapture]),
        );
      }

      const comments = [...intervention.commentairesExternes, ...intervention.commentairesInternes];
      if (comments.length > 0) {
        doc.moveDown(0.3);
        doc.fontSize(9).font("Helvetica-Oblique").fillColor(MUTED);
        for (const c of comments) doc.text(`• ${c}`);
      }
      doc.moveDown(1);
      doc.fillColor(INK);
    }
  }

  // --- Tendance 12 mois ---
  if (derat?.tendance?.months?.length) {
    doc.addPage();
    addWatermark();
    sectionTitle(doc, "Analyse de tendance (12 mois)");
    drawTrendChart(doc, derat.tendance.months);

    doc.moveDown(1);
    drawTable(
      doc,
      ["Mois", "Appâts consommés", "Cadavres", "Tendance", "Risque"],
      derat.tendance.months.map((m) => [m.month, m.appatsConsommes, m.cadavres, m.tendance, m.risque]),
    );
  }

  // --- Conclusion ---
  if (derat?.conclusion) {
    doc.moveDown(1.5);
    sectionTitle(doc, "Conclusion");
    doc.fontSize(10).font("Helvetica").fillColor(INK).text(derat.conclusion.interpretation);
    doc.moveDown(0.3);
    doc.font("Helvetica-Bold").text(`Risque actuel : `, { continued: true }).font("Helvetica").text(derat.conclusion.risqueActuel);
    doc.font("Helvetica-Bold").text(`Évolution : `, { continued: true }).font("Helvetica").text(derat.conclusion.evolution);
    doc.moveDown(0.3);
    doc.font("Helvetica-Bold").text("Action recommandée :");
    doc.font("Helvetica").text(derat.conclusion.actionRecommandee);
  }

  // --- Section II : Désinsectisation ---
  const desinsect = report.desinsectisation as
    | { zonesTraitees: string[]; produits: Array<{ nuisible: string; produit: string; activeSubstance: string; concentration: string; numLot: string }>; conclusion: string }
    | undefined;

  if (desinsect) {
    doc.addPage();
    addWatermark();
    sectionTitle(doc, "II. Désinsectisation");
    doc.fontSize(10).font("Helvetica-Bold").text("Zones traitées : ", { continued: true });
    doc.font("Helvetica").text(desinsect.zonesTraitees.join(", ") || "—");
    doc.moveDown(0.5);

    if (desinsect.produits.length > 0) {
      drawTable(
        doc,
        ["Nuisible", "Produit", "Matière active", "Concentration", "N° Lot"],
        desinsect.produits.map((p) => [p.nuisible, p.produit, p.activeSubstance, p.concentration, p.numLot]),
      );
    }
    doc.moveDown(0.5);
    doc.fontSize(10).font("Helvetica-Oblique").fillColor(MUTED).text(desinsect.conclusion);
  }

  // Admin
  if (report.adminRecommendations) {
    doc.moveDown(1.5);
    sectionTitle(doc, "Recommandations Admin");
    doc.fontSize(10).font("Helvetica").fillColor(INK).text(report.adminRecommendations);
  }

  doc.end();
  return done;
}

export async function generateAndStoreReportPdf(report: IReport): Promise<string> {
  await ensureBucket();
  const buffer = await generateReportPdf(report);
  const key = `reports/${report.id}/${randomUUID()}.pdf`;
  await minioClient.putObject(env.MINIO_BUCKET, key, buffer, buffer.length, { "Content-Type": "application/pdf" });
  return key;
}

/**
 * Renvoie le flux de lecture d'un PDF stocké — utilisé pour le proxy-download
 * (§13 stockage privé). On évite volontairement les URLs présignées
 * "brutes" ici : MinIO n'est joignable que sur le réseau Docker interne
 * (§ déploiement, verrouillé sur un serveur partagé), donc une URL présignée
 * pointant sur l'hostname interne ("minio:9000") serait injoignable par un
 * client externe (mobile, navigateur). Le PDF transite par l'API à la place.
 */
export async function streamReportPdf(key: string) {
  await ensureBucket();
  return minioClient.getObject(env.MINIO_BUCKET, key);
}

/* ------------------------------------------------------------------ */
/* Helpers de dessin                                                    */
/* ------------------------------------------------------------------ */

function drawInfoRow(doc: PDFKit.PDFDocument, label: string, value: string) {
  doc.fontSize(10).font("Helvetica-Bold").fillColor(MUTED).text(`${label} : `, { continued: true });
  doc.font("Helvetica").fillColor(INK).text(value);
}

function sectionTitle(doc: PDFKit.PDFDocument, title: string) {
  doc.fontSize(15).font("Helvetica-Bold").fillColor(BRAND).text(title);
  doc.moveDown(0.5);
  doc.fillColor(INK);
}

function drawTable(doc: PDFKit.PDFDocument, headers: string[], rows: Array<Array<string | number>>) {
  const startX = doc.x;
  const colWidth = (doc.page.width - doc.page.margins.left - doc.page.margins.right) / headers.length;

  doc.fontSize(8).font("Helvetica-Bold").fillColor("#FFFFFF");
  let y = doc.y;
  doc.rect(startX, y, colWidth * headers.length, 16).fill(INK);
  doc.fillColor("#FFFFFF");
  headers.forEach((h, i) => doc.text(String(h), startX + i * colWidth + 4, y + 4, { width: colWidth - 8 }));

  y += 16;
  doc.font("Helvetica").fillColor(INK);
  rows.forEach((row, rowIndex) => {
    const rowHeight = 16;
    if (rowIndex % 2 === 0) {
      doc.rect(startX, y, colWidth * headers.length, rowHeight).fill("#F8FAFC");
      doc.fillColor(INK);
    }
    row.forEach((cell, i) => doc.text(String(cell), startX + i * colWidth + 4, y + 4, { width: colWidth - 8 }));
    y += rowHeight;
  });

  doc.y = y + 8;
}

/** Mini-histogramme + courbe de tendance dessinés à la main (pas de lib externe). */
function drawTrendChart(doc: PDFKit.PDFDocument, months: Array<{ month: string; appatsConsommes: number }>) {
  const chartWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const chartHeight = 120;
  const startX = doc.x;
  const startY = doc.y;
  const max = Math.max(1, ...months.map((m) => m.appatsConsommes));
  const barWidth = chartWidth / months.length;

  months.forEach((m, i) => {
    const barHeight = (m.appatsConsommes / max) * (chartHeight - 20);
    const x = startX + i * barWidth;
    doc
      .rect(x + 4, startY + chartHeight - barHeight - 20, barWidth - 8, barHeight)
      .fill(BRAND);
    doc
      .fontSize(6)
      .fillColor(MUTED)
      .text(m.month.slice(0, 3), x, startY + chartHeight - 14, { width: barWidth, align: "center" });
  });

  doc.y = startY + chartHeight + 10;
  doc.fillColor(INK);
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
