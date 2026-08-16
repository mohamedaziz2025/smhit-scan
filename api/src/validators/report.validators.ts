import { z } from "zod";
import { PeriodType, ReportType } from "../types/enums";

export const patchReportSchema = z.object({
  adminRecommendations: z.string().optional(),
  adminEdits: z.record(z.unknown()).optional(),
});

export const listReportsQuerySchema = z.object({
  clientId: z.string().optional(),
  siteId: z.string().optional(),
  status: z.string().optional(),
  type: z.nativeEnum(ReportType).optional(),
  period: z.nativeEnum(PeriodType).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Génération à la demande (§8/§9) — n'importe quel type de période
 * (jour/semaine/quinzaine/mois/trimestre/semestre/année), pas seulement le
 * mois calendaire. `date` est n'importe quel jour à l'intérieur de la
 * période visée (utils/date.ts, computePeriodBounds calcule les bornes
 * exactes à partir de ce point d'ancrage).
 */
export const generateReportSchema = z.object({
  clientId: z.string().min(1),
  siteId: z.string().min(1),
  periodType: z.nativeEnum(PeriodType).default(PeriodType.MONTH),
  date: z.coerce.date(),
});

/** Rapport Spécifique des magasins (§ multi-sites) — pas de siteId : agrège tout le client. */
export const generateMagasinsReportSchema = z.object({
  clientId: z.string().min(1),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000),
});

export const returnReportSchema = z.object({
  reason: z.string().optional(),
});
