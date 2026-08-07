import type { IFiche } from "../models/Fiche";
import { RiskLevel } from "../types/enums";

/* ------------------------------------------------------------------ */
/* Formules §8 — zones externes / internes                            */
/* ------------------------------------------------------------------ */

interface PorteAppatLike {
  inaccessible?: boolean;
  disparu?: boolean;
  malFixe?: boolean;
  casse?: boolean;
}

function hasAnomalie(porteAppat?: PorteAppatLike): boolean {
  return Boolean(porteAppat?.inaccessible || porteAppat?.disparu || porteAppat?.malFixe || porteAppat?.casse);
}

interface PosteExterneLike {
  etatAppat?: { consomme?: boolean; presenceCadavres?: boolean };
  etatPorteAppat?: PorteAppatLike;
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
  etatPorteAppat?: PorteAppatLike;
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

/**
 * Commentaires auto (§8, règles fixes) — générés **par intervention**, toutes
 * zones externes confondues (et non par zone individuelle) : c'est la
 * granularité exacte du modèle papier (`Rapport standard`), où une seule
 * liste de puces couvre l'ensemble des zones d'une même intervention.
 */
export function computeCommentairesExternes(zones: ZoneExterneLike[], statsList: ZoneExterneStats[]): string[] {
  const comments: string[] = [];

  statsList.forEach((s) => {
    if (s.nbPrise > 0) comments.push(`Présence d'une activité de rongeurs au niveau de ${s.zone}.`);
  });

  const anomalie = zones.some((z) => z.postes.some((p) => hasAnomalie(p.etatPorteAppat)));
  if (!anomalie) {
    comments.push(
      "Aucun dysfonctionnement ni aucune dégradation des postes d'appâtage n'ont été constatés ; l'ensemble du dispositif est en bon état de fonctionnement.",
    );
  }

  const totalCadavres = statsList.reduce((sum, s) => sum + s.nbCadavre, 0);
  if (totalCadavres === 0) {
    comments.push("Aucun cadavre de rongeur n'a été observé sur les zones externes de site.");
  }

  return comments;
}

export function computeCommentairesInternes(zones: ZoneInterneLike[], statsList: ZoneInterneStats[]): string[] {
  const comments: string[] = [];
  const totalCadavres = statsList.reduce((sum, s) => sum + s.nbCadavre, 0);

  if (totalCadavres === 0) {
    comments.push("Aucune activité de rongeurs n'a été détectée sur l'ensemble des zones interne de site lors de l'inspection.");
  } else {
    statsList.forEach((s) => {
      if (s.nbCadavre > 0) comments.push(`Présence de ${s.nbCadavre} cadavre(s) au niveau de ${s.zone}.`);
    });
  }

  const anomalie = zones.some((z) => z.postes.some((p) => hasAnomalie(p.etatPorteAppat)));
  if (!anomalie) {
    comments.push(
      "Aucun dysfonctionnement ni aucune dégradation des postes d'appâtage n'ont été constatés ; l'ensemble du dispositif est en bon état de fonctionnement.",
    );
  }

  if (totalCadavres === 0) {
    comments.push("Aucun cadavre de rongeur n'a été observé sur les zones interne de site.");
  }

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

  const commentairesExternes = computeCommentairesExternes(zonesExternesRaw, zonesExternes);
  const commentairesInternes = computeCommentairesInternes(zonesInternesRaw, zonesInternes);

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
