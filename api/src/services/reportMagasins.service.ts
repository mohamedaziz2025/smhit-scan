import { Fiche, type IFiche } from "../models/Fiche";
import { Report, type IReport } from "../models/Report";
import { Site } from "../models/Site";
import { Product } from "../models/Product";
import { PeriodType, ReportStatus, ReportType, FicheStatus } from "../types/enums";

const MOIS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function monthBounds(month: number, year: number): { from: Date; to: Date; label: string } {
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { from, to, label: `${MOIS_FR[month - 1]} ${year}` };
}

interface PosteLike {
  etatAppat?: { consomme?: boolean; presenceCadavres?: boolean };
  etatPlaque?: { presenceCadavres?: boolean };
  etatPorteAppat?: { inaccessible?: boolean; disparu?: boolean; malFixe?: boolean; casse?: boolean };
  produit?: { refCode?: string };
}

function allPostes(fiche: IFiche): PosteLike[] {
  const externes = ((fiche.deratExterne?.zones ?? []) as Array<{ postes: PosteLike[] }>).flatMap((z) => z.postes);
  const internes = ((fiche.deratInterne?.zones ?? []) as Array<{ postes: PosteLike[] }>).flatMap((z) => z.postes);
  return [...externes, ...internes];
}

export interface SiteRow {
  siteId: string;
  siteName: string;
  dateRealisation: Date | null;
  piegesPrevus: number;
  presents: number;
  disparus: number;
  endommages: number;
  inaccessibles: number;
  appatsConsommes: number;
  cadavres: number;
  tauxDisparition: number;
  tauxEndommagement: number;
  tauxCouverture: number;
  tauxConsommation: number;
  observation: string;
}

function computeSiteRow(siteId: string, siteName: string, fiches: IFiche[]): SiteRow {
  const postes = fiches.flatMap(allPostes);
  const piegesPrevus = postes.length;
  const disparus = postes.filter((p) => p.etatPorteAppat?.disparu).length;
  const endommages = postes.filter((p) => p.etatPorteAppat?.casse).length;
  const inaccessibles = postes.filter((p) => p.etatPorteAppat?.inaccessible).length;
  const appatsConsommes = postes.filter((p) => p.etatAppat?.consomme).length;
  const cadavres = postes.filter((p) => p.etatAppat?.presenceCadavres || p.etatPlaque?.presenceCadavres).length;
  const presents = Math.max(0, piegesPrevus - (disparus + endommages));

  const pct = (n: number) => (piegesPrevus > 0 ? Math.round((n / piegesPrevus) * 1000) / 10 : 0);

  const observations: string[] = [];
  if (disparus > 0) observations.push(`${disparus} piège${disparus > 1 ? "s" : ""} disparu${disparus > 1 ? "s" : ""}`);
  if (endommages > 0) observations.push(`${endommages} piège${endommages > 1 ? "s" : ""} endommagé${endommages > 1 ? "s" : ""}`);
  if (appatsConsommes > 0) observations.push(`consommation de ${appatsConsommes} appât${appatsConsommes > 1 ? "s" : ""}`);

  return {
    siteId,
    siteName,
    dateRealisation: fiches[0]?.interventionDate ?? null,
    piegesPrevus,
    presents,
    disparus,
    endommages,
    inaccessibles,
    appatsConsommes,
    cadavres,
    tauxDisparition: pct(disparus),
    tauxEndommagement: pct(endommages),
    tauxCouverture: pct(presents),
    tauxConsommation: pct(appatsConsommes),
    observation: observations.length ? observations.join(", ") : "—",
  };
}

async function collectProduitsUtilises(fiches: IFiche[]) {
  const refCodes = new Set<string>();
  const typeByCode = new Map<string, string>();

  for (const f of fiches) {
    for (const zone of (f.deratExterne?.zones ?? []) as Array<{ postes: PosteLike[] }>) {
      for (const p of zone.postes) if (p.produit?.refCode) {
        refCodes.add(p.produit.refCode);
        typeByCode.set(p.produit.refCode, "Dératisation");
      }
    }
    for (const zone of (f.deratInterne?.zones ?? []) as Array<{ postes: PosteLike[] }>) {
      for (const p of zone.postes) if (p.produit?.refCode) {
        refCodes.add(p.produit.refCode);
        typeByCode.set(p.produit.refCode, "Dératisation");
      }
    }
    for (const ligne of (f.desinsectisation?.lignes ?? []) as Array<{ produit?: { refCode?: string } }>) {
      if (ligne.produit?.refCode) {
        refCodes.add(ligne.produit.refCode);
        typeByCode.set(ligne.produit.refCode, "Désinsectisation");
      }
    }
  }

  if (refCodes.size === 0) return [];

  const products = await Product.find({ code: { $in: [...refCodes] } }).lean();
  return products.map((p) => ({
    type: typeByCode.get(p.code) ?? "—",
    produit: p.name,
    activeSubstance: p.activeSubstance ?? (p.isToxic === false ? "Non toxique" : "—"),
  }));
}

/**
 * Rapport Spécifique des Magasins (multi-sites) : agrège toutes les fiches
 * d'un client (tous "locaux"/magasins confondus) sur un mois donné. Diffère
 * du rapport standard (une seule paire client+site, détail par zone/poste) :
 * ici chaque ligne = un local, avec KPIs et taux d'état du parc de pièges.
 */
export async function generateMagasinsReport(clientId: string, month: number, year: number): Promise<IReport> {
  const { from, to, label } = monthBounds(month, year);

  const sites = await Site.find({ clientId, isActive: true });
  const fiches = await Fiche.find({
    clientId,
    interventionDate: { $gte: from, $lte: to },
    status: { $in: [FicheStatus.AGENT_VALIDATED, FicheStatus.LOCKED] },
  }).sort({ interventionDate: 1 });

  const fichesBySite = new Map<string, IFiche[]>();
  for (const f of fiches) {
    const key = f.siteId.toString();
    fichesBySite.set(key, [...(fichesBySite.get(key) ?? []), f]);
  }

  const suiviInterventions: SiteRow[] = [...fichesBySite.entries()].map(([siteId, siteFiches]) => {
    const site = sites.find((s) => s.id === siteId);
    return computeSiteRow(siteId, site?.name ?? "—", siteFiches);
  });

  const nombreMagasinsTotal = sites.length;
  const nombreMagasinsSuivis = suiviInterventions.length;
  const nombreTotalPieges = suiviInterventions.reduce((s, r) => s + r.piegesPrevus, 0);
  const piegesDisparus = suiviInterventions.reduce((s, r) => s + r.disparus, 0);
  const piegesEndommages = suiviInterventions.reduce((s, r) => s + r.endommages, 0);
  const appatsConsommes = suiviInterventions.reduce((s, r) => s + r.appatsConsommes, 0);
  const sitesAvecActivite = suiviInterventions.filter((r) => r.appatsConsommes > 0 || r.cadavres > 0).length;

  const kpis = {
    nombreMagasinsSuivis,
    nombreMagasinsTotal,
    interventionsRealisees: fiches.length,
    tauxRealisation: nombreMagasinsTotal > 0 ? Math.round((nombreMagasinsSuivis / nombreMagasinsTotal) * 1000) / 10 : 0,
    nombreTotalPieges,
    piegesDisparus,
    piegesEndommages,
    appatsConsommes,
    sitesAvecActivite,
  };

  const produitsUtilises = await collectProduitsUtilises(fiches);

  // Non-conformités : tout local avec disparition/dégradation/consommation —
  // colonnes "Action corrective/Responsable/Échéance" laissées à l'Admin (§9).
  const nonConformites = suiviInterventions
    .filter((r) => r.disparus > 0 || r.endommages > 0 || r.appatsConsommes > 0)
    .map((r, i) => ({
      numero: i + 1,
      magasin: r.siteName,
      constat: r.observation,
      actionCorrective: "",
      responsable: "",
      echeance: null as Date | null,
    }));

  let report = await Report.findOne({ clientId, type: ReportType.MAGASINS, "period.from": from, "period.to": to });
  if (!report) {
    report = await Report.create({
      clientId,
      type: ReportType.MAGASINS,
      period: { type: PeriodType.MONTH, from, to, label },
      ficheIds: fiches.map((f) => f._id),
      status: ReportStatus.PENDING_ADMIN,
      createdByAgentAuto: true,
    });
  } else if (report.status === ReportStatus.VALIDATED) {
    throw new Error("Ce rapport est déjà validé et verrouillé — utilisez une nouvelle période.");
  } else {
    report.ficheIds = fiches.map((f) => f._id) as typeof report.ficheIds;
  }

  report.magasins = {
    kpis,
    produitsUtilises,
    suiviInterventions,
    nonConformites,
    conclusion: report.magasins && typeof report.magasins === "object" && "conclusion" in report.magasins
      ? (report.magasins as { conclusion?: string }).conclusion
      : "",
  };

  await report.save();
  return report;
}

export async function recomputeMagasinsReport(report: IReport): Promise<IReport> {
  return generateMagasinsReport(report.clientId.toString(), report.period.from.getUTCMonth() + 1, report.period.from.getUTCFullYear());
}
