import { z } from "zod";
import { PeriodType, ReportType } from "../types/enums";

export const patchReportSchema = z.object({
  adminRecommendations: z.string().optional(),
  adminEdits: z.record(z.unknown()).optional(),
});

export const listReportsQuerySchema = z.object({
  clientId: z.string().optional(),
  status: z.string().optional(),
  type: z.nativeEnum(ReportType).optional(),
  period: z.nativeEnum(PeriodType).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const generateReportSchema = z.object({
  clientId: z.string().min(1),
  siteId: z.string().min(1),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000),
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
