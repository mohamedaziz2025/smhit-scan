import { z } from "zod";

export const updateSettingsSchema = z.object({
  aiConfidenceThreshold: z.number().min(0).max(1).optional(),
  riskMoyenMax: z.number().min(0).optional(),
  riskEleveMinCaptures: z.number().min(0).optional(),
});
