import type { IFiche } from "../models/Fiche";
import { RiskLevel } from "../types/enums";

/* ------------------------------------------------------------------ */
/* Formules §8 — zones externes / internes                            */
/* ------------------------------------------------------------------ */

interface PosteExterneLike {
  etatAppat?: { consomme?: boolean; presenceCadavres?: boolean };
  etatPorteAppat?: { inaccessible?: boolean; disparu?: boolean; malFixe?: boolean; casse?: boolean };
}

interface ZoneExterneLike {
  zoneLabel: string;
  postes: PosteExterneLike[];
}

export interface ZoneExterneStats {
  zone: string;
  nbPiege: number;
  nbPrise: number;
  pctPrise: number;
  nbCadavre: number;
  pctCadavre: number;
}

export function computeZoneExterneStats(zone: ZoneExterneLike): ZoneExterneStats {
  const nbPiege = zone.postes.length;
  const nbPrise = zone.postes.filter((p) => p.etatAppat?.consomme).length;
  const nbCadavre = zone.postes.filter((p) => p.etatAppat?.presenceCadavres).length;

  return {
    zone: zone.zoneLabel,
    nbPiege,
    nbPrise,
    pctPrise: nbPiege > 0 ? round1((nbPrise / nbPiege) * 100) : 0,
    nbCadavre,
    pctCadavre: nbPiege > 0 ? round1((nbCadavre / nbPiege) * 100) : 0,
  };
}

interface PosteInterneLike {
  etatPlaque?: { presenceCadavres?: boolean };
}

interface ZoneInterneLike {
  zoneLabel: string;
  postes: PosteInterneLike[];
}

export interface ZoneInterneStats {
  zone: string;
  nbPiege: number;
  nbCadavre: number;
  indiceCapture: number;
}

export function computeZoneInterneStats(zone: ZoneInterneLike): ZoneInterneStats {
  const nbPiege = zone.postes.length;
  const nbCadavre = zone.postes.filter((p) => p.etatPlaque?.presenceCadavres).length;
  return { zone: zone.zoneLabel, nbPiege, nbCadavre, indiceCapture: nbPiege > 0 ? round2(nbCadavre / nbPiege) : 0 };
}

/** Commentaires auto (§8, règles fixes). */
export function computeCommentairesExternes(zone: ZoneExterneLike, stats: ZoneExterneStats): string[] {
  const comments: string[] = [];
  if (stats.nbPrise > 0) {
    comments.push(`Présence d'une activité de rongeurs au niveau de ${zone.zoneLabel}.`);
  }
  const anomalie = zone.postes.some(
    (p) => p.etatPorteAppat?.inaccessible || p.etatPorteAppat?.disparu || p.etatPorteAppat?.malFixe || p.etatPorteAppat?.casse,
  );
  if (!anomalie) {
    comments.push("Aucun dysfonctionnement ni dégradation des postes ; dispositif en bon état.");
  }
  if (stats.nbCadavre === 0) {
    comments.push("Aucun cadavre de rongeur observé.");
  }
  return comments;
}

export function computeCommentairesInternes(stats: ZoneInterneStats): string[] {
  const comments: string[] = [];
  if (stats.nbCadavre === 0) comments.push("Aucun cadavre de rongeur observé.");
  else comments.push(`Présence de ${stats.nbCadavre} cadavre(s) au niveau de ${stats.zone}.`);
  return comments;
}

/* ------------------------------------------------------------------ */
/* Matrice de risque & tendance (§8) — seuils paramétrables par Super   */
/* Admin (Module 8, GET/PATCH /settings) ; valeurs par défaut ci-dessous */
/* si aucun `Settings` n'a encore été chargé.                           */
/* ------------------------------------------------------------------ */

export interface RiskThresholds {
  riskMoyenMax: number;
  riskEleveMinCaptures: number;
}

export const DEFAULT_RISK_THRESHOLDS: RiskThresholds = { riskMoyenMax: 3, riskEleveMinCaptures: 1 };

export function computeRiskLevel(
  appatsConsommes: number,
  captures: number,
  thresholds: RiskThresholds = DEFAULT_RISK_THRESHOLDS,
): RiskLevel {
  if (appatsConsommes === 0 && captures === 0) return RiskLevel.FAIBLE;
  if (captures >= thresholds.riskEleveMinCaptures || appatsConsommes > thresholds.riskMoyenMax) {
    return RiskLevel.ELEVE;
  }
  return RiskLevel.MOYEN;
}

export function computeTrendSymbol(current: number, previous: number | undefined): "↗" | "↘" | "→" {
  if (previous === undefined) return "→";
  if (current > previous) return "↗";
  if (current < previous) return "↘";
  return "→";
}

/* ------------------------------------------------------------------ */
/* Agrégation par fiche -> une "intervention" du rapport (§6.5/§8)     */
/* ------------------------------------------------------------------ */

export interface InterventionAggregate {
  index: number;
  zonesExternes: ZoneExterneStats[];
  zonesInternes: ZoneInterneStats[];
  commentairesExternes: string[];
  commentairesInternes: string[];
}

export function computeInterventionFromFiche(fiche: IFiche, index: number): InterventionAggregate {
  const zonesExternesRaw = (fiche.deratExterne?.zones ?? []) as ZoneExterneLike[];
  const zonesInternesRaw = (fiche.deratInterne?.zones ?? []) as ZoneInterneLike[];

  const zonesExternes = zonesExternesRaw.map(computeZoneExterneStats);
  const zonesInternes = zonesInternesRaw.map(computeZoneInterneStats);

  const commentairesExternes = zonesExternesRaw.flatMap((z, i) => computeCommentairesExternes(z, zonesExternes[i]));
  const commentairesInternes = zonesInternesRaw.flatMap((_z, i) => computeCommentairesInternes(zonesInternes[i]));

  return { index: index + 1, zonesExternes, zonesInternes, commentairesExternes, commentairesInternes };
}

/** Totaux "appâts consommés" / "cadavres" toutes zones confondues, pour la tendance mensuelle. */
export function totalsForFiche(fiche: IFiche): { appatsConsommes: number; cadavres: number } {
  const externes = (fiche.deratExterne?.zones ?? []) as ZoneExterneLike[];
  const internes = (fiche.deratInterne?.zones ?? []) as ZoneInterneLike[];

  const appatsConsommes = externes.reduce(
    (sum, z) => sum + z.postes.filter((p) => p.etatAppat?.consomme).length,
    0,
  );
  const cadavresExternes = externes.reduce(
    (sum, z) => sum + z.postes.filter((p) => p.etatAppat?.presenceCadavres).length,
    0,
  );
  const cadavresInternes = internes.reduce(
    (sum, z) => sum + z.postes.filter((p) => p.etatPlaque?.presenceCadavres).length,
    0,
  );

  return { appatsConsommes, cadavres: cadavresExternes + cadavresInternes };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
