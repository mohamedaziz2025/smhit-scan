import { Fiche, type IFiche } from "../models/Fiche";
import { Report, type IReport } from "../models/Report";
import { Product } from "../models/Product";
import { User } from "../models/User";
import { PeriodType, ReportStatus, FicheStatus } from "../types/enums";
import {
  computeInterventionFromFiche,
  computeRiskLevel,
  computeTrendSymbol,
  totalsForFiche,
} from "./reportCalculations";
import { getSettings } from "./settings.service";

const MOIS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function monthBounds(date: Date): { from: Date; to: Date; label: string } {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const from = new Date(Date.UTC(year, month, 1));
  const to = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  return { from, to, label: `${MOIS_FR[month]} ${year}` };
}

/**
 * Génère/actualise le rapport mensuel du client+site après validation d'une
 * fiche (§5 workflow, §6.5, §8). Un rapport agrège toutes les fiches
 * AGENT_VALIDATED/LOCKED du mois — s'il en existe déjà un non verrouillé
 * pour ce mois, on le met à jour plutôt que d'en créer un second.
 */
export async function generateOrUpdateReportForFiche(fiche: IFiche): Promise<IReport> {
  const { from, to, label } = monthBounds(fiche.interventionDate);

  let report = await Report.findOne({
    clientId: fiche.clientId,
    siteId: fiche.siteId,
    "period.from": from,
    "period.to": to,
    status: { $ne: ReportStatus.VALIDATED },
  });

  if (!report) {
    report = await Report.create({
      clientId: fiche.clientId,
      siteId: fiche.siteId,
      period: { type: PeriodType.MONTH, from, to, label },
      ficheIds: [],
      status: ReportStatus.PENDING_ADMIN,
      createdByAgentAuto: true,
    });
  }

  if (!report.ficheIds.some((id) => id.toString() === fiche.id)) {
    report.ficheIds.push(fiche._id as typeof report.ficheIds[number]);
  }

  await recomputeReport(report);
  return report;
}

/** POST /reports/generate (§9) — (re)génère explicitement le rapport d'un mois donné. */
export async function generateReportForPeriod(
  clientId: string,
  siteId: string,
  month: number,
  year: number,
): Promise<IReport> {
  const { from, to, label } = monthBounds(new Date(Date.UTC(year, month - 1, 1)));

  const fiches = await Fiche.find({
    clientId,
    siteId,
    interventionDate: { $gte: from, $lte: to },
    status: { $in: [FicheStatus.AGENT_VALIDATED, FicheStatus.LOCKED] },
  });

  let report = await Report.findOne({ clientId, siteId, "period.from": from, "period.to": to });
  if (!report) {
    report = await Report.create({
      clientId,
      siteId,
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

  await recomputeReport(report);
  return report;
}

/** Recalcule entièrement les agrégats d'un rapport à partir de ses fiches (idempotent). */
export async function recomputeReport(report: IReport): Promise<IReport> {
  const fiches = await Fiche.find({
    _id: { $in: report.ficheIds },
    status: { $in: [FicheStatus.AGENT_VALIDATED, FicheStatus.LOCKED] },
  }).sort({ interventionDate: 1 });

  const interventions = fiches.map((f, i) => computeInterventionFromFiche(f, i));

  const agentIds = [...new Set(fiches.map((f) => f.createdByAgentId.toString()))];
  const agents = await User.find({ _id: { $in: agentIds } }).select("fullName").lean();
  // .lean() renvoie des objets bruts sans les virtuals Mongoose (dont `.id`) —
  // il faut donc composer la clé à partir de `._id` directement.
  const agentNameById = new Map(agents.map((a) => [a._id.toString(), a.fullName]));

  const planning = fiches.map((f) => ({
    date: f.interventionDate,
    treatment: "Dératisation",
    hygienistName: agentNameById.get(f.createdByAgentId.toString()) ?? "—",
  }));

  const tendance = await computeTendance(report.clientId.toString(), report.siteId.toString(), report.period.to);

  const dernierMois = tendance.months.at(-1);
  const conclusion = computeConclusion(dernierMois);

  const produitsUtilises = await collectProduitsUtilises(fiches);

  report.deratisation = {
    planning,
    produitsUtilises,
    interventions,
    tendance,
    conclusion,
  };

  report.desinsectisation = await computeDesinsectisation(fiches);

  await report.save();
  return report;
}

async function collectProduitsUtilises(fiches: IFiche[]) {
  const refCodes = new Set<string>();
  for (const f of fiches) {
    for (const zone of (f.deratExterne?.zones ?? []) as Array<{ postes: Array<{ produit?: { refCode?: string } }> }>) {
      for (const poste of zone.postes) if (poste.produit?.refCode) refCodes.add(poste.produit.refCode);
    }
    for (const zone of (f.deratInterne?.zones ?? []) as Array<{ postes: Array<{ produit?: { refCode?: string } }> }>) {
      for (const poste of zone.postes) if (poste.produit?.refCode) refCodes.add(poste.produit.refCode);
    }
  }
  if (refCodes.size === 0) return [];

  const products = await Product.find({ code: { $in: [...refCodes] } }).lean();
  return products.map((p) => ({
    nuisible: "Rongeurs",
    intervention: "Dératisation",
    type: p.category,
    activeSubstance: p.activeSubstance ?? "—",
    localisation: "Zones traitées",
  }));
}

async function computeDesinsectisation(fiches: IFiche[]) {
  const lignes = fiches.flatMap((f) => (f.desinsectisation?.lignes ?? []) as Array<{
    zoneTraitee: string;
    produit?: { refCode?: string; concentration?: string; numLot?: string };
  }>);

  if (lignes.length === 0) return undefined;

  const zonesTraitees = [...new Set(lignes.map((l) => l.zoneTraitee))];
  const refCodes = [...new Set(lignes.map((l) => l.produit?.refCode).filter(Boolean))] as string[];
  const products = await Product.find({ code: { $in: refCodes } }).lean();
  const byCode = new Map(products.map((p) => [p.code, p]));

  const produits = lignes
    .filter((l) => l.produit?.refCode)
    .map((l) => {
      const p = byCode.get(l.produit!.refCode!);
      return {
        nuisible: "Insectes",
        produit: p?.name ?? l.produit!.refCode,
        activeSubstance: p?.activeSubstance ?? "—",
        concentration: l.produit?.concentration ?? p?.concentration ?? "—",
        numLot: l.produit?.numLot ?? "—",
      };
    });

  return {
    zonesTraitees,
    produits,
    conclusion: "Traitement insecticide réalisé conformément au protocole SMHIT.",
  };
}

/** Tendance 12 mois (§8) — recalculée à partir des Fiches validées/verrouillées. */
async function computeTendance(clientId: string, siteId: string, upTo: Date) {
  const from = new Date(Date.UTC(upTo.getUTCFullYear(), upTo.getUTCMonth() - 11, 1));
  const settings = await getSettings();
  const thresholds = { riskMoyenMax: settings.riskMoyenMax, riskEleveMinCaptures: settings.riskEleveMinCaptures };

  const fiches = await Fiche.find({
    clientId,
    siteId,
    status: { $in: [FicheStatus.AGENT_VALIDATED, FicheStatus.LOCKED] },
    interventionDate: { $gte: from, $lte: upTo },
  }).lean();

  const byMonth = new Map<string, { appatsConsommes: number; cadavres: number }>();
  for (const f of fiches as unknown as IFiche[]) {
    const d = new Date(f.interventionDate);
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    const totals = totalsForFiche(f);
    const acc = byMonth.get(key) ?? { appatsConsommes: 0, cadavres: 0 };
    acc.appatsConsommes += totals.appatsConsommes;
    acc.cadavres += totals.cadavres;
    byMonth.set(key, acc);
  }

  const months: Array<{
    month: string;
    appatsConsommes: number;
    cadavres: number;
    tendance: "↗" | "↘" | "→";
    risque: string;
  }> = [];

  let previous: number | undefined;
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(upTo.getUTCFullYear(), upTo.getUTCMonth() - i, 1));
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    const totals = byMonth.get(key) ?? { appatsConsommes: 0, cadavres: 0 };

    months.push({
      month: `${MOIS_FR[d.getUTCMonth()]} ${d.getUTCFullYear()}`,
      appatsConsommes: totals.appatsConsommes,
      cadavres: totals.cadavres,
      tendance: computeTrendSymbol(totals.appatsConsommes, previous),
      risque: computeRiskLevel(totals.appatsConsommes, totals.cadavres, thresholds),
    });
    previous = totals.appatsConsommes;
  }

  return { months, chartData: months.map((m) => ({ month: m.month, value: m.appatsConsommes })) };
}

function computeConclusion(dernierMois?: { risque: string; tendance: string; appatsConsommes: number; cadavres: number }) {
  if (!dernierMois) {
    return {
      interpretation: "Aucune donnée exploitable sur la période.",
      risqueActuel: "Faible",
      evolution: "→",
      actionRecommandee: "Poursuivre le suivi standard.",
    };
  }

  const actionsByRisk: Record<string, string> = {
    Faible: "Poursuivre le suivi standard.",
    Moyen: "Renforcer la surveillance et vérifier l'étanchéité du site.",
    Élevé: "Intervention corrective recommandée : renforcement du maillage de postes et traitement complémentaire.",
  };

  return {
    interpretation:
      dernierMois.appatsConsommes > 0 || dernierMois.cadavres > 0
        ? `Activité de nuisibles détectée ce mois (${dernierMois.appatsConsommes} consommation(s), ${dernierMois.cadavres} cadavre(s)).`
        : "Aucune activité de nuisibles détectée ce mois.",
    risqueActuel: dernierMois.risque,
    evolution: dernierMois.tendance,
    actionRecommandee: actionsByRisk[dernierMois.risque] ?? actionsByRisk.Faible,
  };
}
