import PDFDocument from "pdfkit";
import { randomUUID } from "node:crypto";
import type { IReport } from "../models/Report";
import { Client } from "../models/Client";
import { Site } from "../models/Site";
import { ensureBucket, minioClient } from "../config/minio";
import { env } from "../config/env";
import { BRAND, INK, MUTED, addWatermark, drawInfoRow, drawLetterhead, drawTable, formatDate, sectionTitle } from "./pdfHelpers";
import { generateMagasinsReportPdf } from "./reportMagasinsPdf.service";
import { ReportType } from "../types/enums";

/**
 * Rendu PDF du rapport standard (§8) : page de garde, tendance 12 mois (mini-
 * histogramme dessiné directement avec les primitives PDFKit — pas de
 * dépendance à un service externe type QuickChart), tableaux d'intervention,
 * conclusion. Filigrane "SMHIT" sur chaque page comme sur le modèle papier.
 * Délègue à `generateMagasinsReportPdf` pour les rapports multi-sites.
 */
export async function generateReportPdf(report: IReport): Promise<Buffer> {
  if (report.type === ReportType.MAGASINS) {
    return generateMagasinsReportPdf(report);
  }

  const [client, site] = await Promise.all([Client.findById(report.clientId), Site.findById(report.siteId)]);

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  // --- Page de garde ---
  addWatermark(doc);
  drawLetterhead(doc);

  doc.moveDown(3);
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
        planning?: Array<{ date: Date; treatment: string; hygienistName: string }>;
        produitsUtilises?: Array<{
          nuisible: string;
          intervention: string;
          type: string;
          produit: string;
          activeSubstance: string;
          localisation: string;
        }>;
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
    addWatermark(doc);
    sectionTitle(doc, "I. Traitement de dératisation");
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor(INK)
      .text(
        "La dératisation est une opération visant à prévenir, détecter et éliminer la présence des rongeurs " +
          "tels que les rats et les souris, qui peuvent représenter un risque pour l'hygiène, la sécurité " +
          "sanitaire et l'intégrité des installations. Elle repose sur la mise en place de dispositifs de " +
          "surveillance et de contrôle, notamment des postes d'appâtage sécurisés installés dans les zones " +
          "stratégiques du site afin d'assurer une maîtrise efficace de toute activité de rongeurs.",
        { align: "justify" },
      );
    doc.moveDown(0.8);

    if (derat.planning?.length) {
      doc.fontSize(10).font("Helvetica-Bold").text("Planning des interventions");
      drawTable(
        doc,
        ["Date intervention", "Traitement effectué", "Hygiéniste SMHIT"],
        derat.planning.map((p) => [formatDate(p.date), p.treatment, p.hygienistName]),
      );
      doc.moveDown(0.8);
    }

    if (derat.produitsUtilises?.length) {
      doc.fontSize(10).font("Helvetica-Bold").text("Produits utilisés");
      drawTable(
        doc,
        ["Nuisible", "Intervention", "Type", "Produit", "Matière active", "Localisation"],
        derat.produitsUtilises.map((p) => [p.nuisible, p.intervention, p.type, p.produit, p.activeSubstance, p.localisation]),
      );
      doc.moveDown(0.8);
    }

    doc.fontSize(10).font("Helvetica-Bold").fillColor(BRAND).text("Analyse des données");
    doc.fillColor(INK);
    doc.moveDown(0.3);

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
    addWatermark(doc);
    sectionTitle(doc, "Analyse de tendance (12 mois)");
    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor(MUTED)
      .text(
        "Matrice de risque : Faible = 0 consommation et 0 capture · Moyen = 1 à 3 consommations d'appâts · " +
          "Élevé = > 3 consommations et/ou ≥ 1 capture.  Tendance : ↗ augmentation · ↘ diminution · → stable.",
      );
    doc.fillColor(INK);
    doc.moveDown(0.5);
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
    | {
        zonesTraitees: string[];
        detailZones?: Array<{
          zoneTraitee: string;
          designationProduit: string;
          codeProduit: string;
          concentration: string;
          numLot: string;
          dlc: string;
          observations: string;
        }>;
        produits: Array<{ nuisible: string; produit: string; activeSubstance: string; concentration: string; numLot: string }>;
        conclusion: string;
      }
    | undefined;

  if (desinsect) {
    doc.addPage();
    addWatermark(doc);
    sectionTitle(doc, "II. Traitement de désinsectisation");
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor(INK)
      .text(
        "La désinsectisation consiste à prévenir et à contrôler la présence d'insectes nuisibles (moustiques, " +
          "mouches, fourmis, etc.) pouvant compromettre l'hygiène et la sécurité sanitaire des locaux.",
        { align: "justify" },
      );
    doc.moveDown(0.6);

    doc.fontSize(10).font("Helvetica-Bold").text("Zones traitées");
    doc.font("Helvetica");
    for (const zone of desinsect.zonesTraitees.length ? desinsect.zonesTraitees : ["—"]) doc.text(`• ${zone}`);
    doc.moveDown(0.6);

    if (desinsect.detailZones?.length) {
      doc.fontSize(10).font("Helvetica-Bold").text("Détail par zone traitée");
      drawTable(
        doc,
        ["Zone traitée", "Désignation produit", "Code produit", "Concentration", "N° lot", "DLC"],
        desinsect.detailZones.map((z) => [z.zoneTraitee, z.designationProduit, z.codeProduit, z.concentration, z.numLot, z.dlc]),
      );
      doc.moveDown(0.6);
    }

    if (desinsect.produits.length > 0) {
      doc.fontSize(10).font("Helvetica-Bold").fillColor(BRAND).text("Conclusion Générale");
      doc.fillColor(INK);
      drawTable(
        doc,
        ["Nuisible ciblé", "Produit", "Matière active", "Concentration", "N° du lot"],
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
