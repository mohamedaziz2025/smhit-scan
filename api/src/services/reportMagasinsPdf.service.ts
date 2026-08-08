import PDFDocument from "pdfkit";
import type { IReport } from "../models/Report";
import { Client } from "../models/Client";
import { BRAND, INK, MUTED, addWatermark, drawLetterhead, drawTable, sectionTitle } from "./pdfHelpers";
import type { SiteRow } from "./reportMagasins.service";

interface MagasinsData {
  kpis: {
    nombreMagasinsSuivis: number;
    nombreMagasinsTotal: number;
    interventionsRealisees: number;
    tauxRealisation: number;
    nombreTotalPieges: number;
    piegesDisparus: number;
    piegesEndommages: number;
    appatsConsommes: number;
    sitesAvecActivite: number;
  };
  produitsUtilises: Array<{ type: string; produit: string; activeSubstance: string }>;
  suiviInterventions: SiteRow[];
  nonConformites: Array<{
    numero: number;
    magasin: string;
    constat: string;
    actionCorrective: string;
    responsable: string;
    echeance: string | null;
  }>;
  conclusion?: string;
}

/**
 * Rapport Spécifique des Magasins (multi-sites) — 6 pages fidèles au modèle
 * fourni : synthèse managériale (KPIs + produits), suivi des interventions
 * par local, analyse du parc de pièges (taux disparition/endommagement/
 * couverture), analyse de l'activité rongeurs (taux consommation),
 * non-conformités & plan d'actions, conclusion.
 */
export async function generateMagasinsReportPdf(report: IReport): Promise<Buffer> {
  const client = await Client.findById(report.clientId);
  const data = (report.magasins ?? {}) as MagasinsData;
  const kpis = data.kpis ?? ({} as MagasinsData["kpis"]);
  const suivi = data.suiviInterventions ?? [];

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  // --- Page 1 : Synthèse managériale ---
  addWatermark(doc);
  drawLetterhead(doc);

  doc.moveDown(3);
  doc.fillColor(INK).fontSize(18).font("Helvetica-Bold").text("RAPPORT MENSUEL DE SUIVI DES INTERVENTIONS 3D", { align: "center" });
  doc.moveDown(0.3);
  doc.fontSize(11).font("Helvetica").fillColor(MUTED).text(`Période : ${report.period.label}`, { align: "center" });
  doc.text(`Périmètre : ${client?.name ?? "—"} (magasins)`, { align: "center" });
  doc.fillColor(INK);
  doc.moveDown(1.5);

  doc.fontSize(11).font("Helvetica-Bold").text("KPI du mois");
  doc.moveDown(0.3);
  drawTable(
    doc,
    ["Indicateur", "Résultat"],
    [
      ["Nombre de magasins suivis", `${kpis.nombreMagasinsSuivis ?? 0} / ${kpis.nombreMagasinsTotal ?? 0}`],
      ["Interventions réalisées", kpis.interventionsRealisees ?? 0],
      ["Taux de réalisation", `${kpis.tauxRealisation ?? 0} %`],
      ["Nombre total de pièges", kpis.nombreTotalPieges ?? 0],
      ["Pièges disparus", kpis.piegesDisparus ?? 0],
      ["Pièges endommagés", kpis.piegesEndommages ?? 0],
      ["Appâts consommés", kpis.appatsConsommes ?? 0],
      ["Sites avec activité rongeurs", kpis.sitesAvecActivite ?? 0],
    ],
    [300, 200],
  );

  doc.moveDown(1);
  if (data.produitsUtilises?.length) {
    doc.fontSize(11).font("Helvetica-Bold").text("Produits utilisés");
    doc.moveDown(0.3);
    drawTable(
      doc,
      ["Type de traitement", "Produit", "Matière active"],
      data.produitsUtilises.map((p) => [p.type, p.produit, p.activeSubstance]),
    );
  }

  // --- Page 2 : Suivi des interventions ---
  doc.addPage();
  addWatermark(doc);
  sectionTitle(doc, "Suivi des interventions");
  if (suivi.length > 0) {
    drawTable(
      doc,
      ["Local", "Date", "Pièges prévus", "Présents", "Disparus", "Endommagés", "Inaccessible", "Appâts consommés", "Observation"],
      suivi.map((r) => [
        r.siteName,
        r.dateRealisation ? new Date(r.dateRealisation).toLocaleDateString("fr-FR") : "—",
        r.piegesPrevus,
        r.presents,
        r.disparus,
        r.endommages,
        r.inaccessibles,
        r.appatsConsommes,
        r.observation,
      ]),
      [70, 55, 55, 50, 50, 55, 55, 60, 100],
    );
  } else {
    doc.fontSize(10).font("Helvetica").fillColor(MUTED).text("Aucune intervention enregistrée sur cette période.");
  }

  // --- Page 3 : Analyse des dispositifs de dératisation ---
  doc.addPage();
  addWatermark(doc);
  sectionTitle(doc, "Analyse des dispositifs de dératisation");
  doc
    .fontSize(8)
    .font("Helvetica")
    .fillColor(MUTED)
    .text(
      "Taux de disparition = pièges disparus ÷ pièges prévus × 100 · Taux d'endommagement = pièges endommagés ÷ " +
        "pièges prévus × 100 · Taux de couverture opérationnelle = pièges présents ÷ pièges prévus × 100.",
    );
  doc.fillColor(INK);
  doc.moveDown(0.5);
  if (suivi.length > 0) {
    drawTable(
      doc,
      ["Local", "Prévus", "Disparus", "Endommagés", "Présents", "Taux disparition", "Taux endommagement", "Taux couverture"],
      suivi.map((r) => [
        r.siteName,
        r.piegesPrevus,
        r.disparus,
        r.endommages,
        r.presents,
        `${r.tauxDisparition}%`,
        `${r.tauxEndommagement}%`,
        `${r.tauxCouverture}%`,
      ]),
    );
  }

  // --- Page 4 : Analyse de l'activité rongeurs ---
  doc.addPage();
  addWatermark(doc);
  sectionTitle(doc, "Analyse de l'activité rongeurs");
  if (suivi.length > 0) {
    drawTable(
      doc,
      ["Local", "Pièges", "Appâts consommés", "Taux de consommation"],
      suivi.map((r) => [r.siteName, r.piegesPrevus, r.appatsConsommes, `${r.tauxConsommation}%`]),
    );
  }

  // --- Page 5 : Non-conformités et plan d'actions ---
  doc.addPage();
  addWatermark(doc);
  sectionTitle(doc, "Non-conformités et plan d'actions");
  if (data.nonConformites?.length) {
    drawTable(
      doc,
      ["N°", "Magasin", "Constat", "Action corrective", "Responsable", "Échéance"],
      data.nonConformites.map((n) => [
        n.numero,
        n.magasin,
        n.constat,
        n.actionCorrective || "—",
        n.responsable || "—",
        n.echeance ? new Date(n.echeance).toLocaleDateString("fr-FR") : "—",
      ]),
    );
  } else {
    doc.fontSize(10).font("Helvetica").fillColor(MUTED).text("Aucune non-conformité constatée sur cette période.");
  }

  // --- Page 6 : Conclusion ---
  doc.addPage();
  addWatermark(doc);
  sectionTitle(doc, "Conclusion");
  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor(INK)
    .text(data.conclusion || report.adminRecommendations || "En attente des recommandations de l'administrateur.");

  doc.end();
  return done;
}
