import { Router } from "express";
import { UserRole } from "../types/enums";
import { requireAuth, requireRole } from "../middlewares/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { auditFromRequest } from "../utils/audit";
import { getSettings, updateSettings } from "../services/settings.service";
import { updateSettingsSchema } from "../validators/settings.validators";

// Paramètres système (§9) — seuils IA, matrice de risque. Lecture/écriture
// réservées au Super Admin (§2 : "Paramètres système / seuils IA / matrices
// de risque" -> ❌ Agent, ❌ Admin, ✅ SuperAdmin).
export const settingsRouter = Router();
settingsRouter.use(requireAuth, requireRole(UserRole.SUPER_ADMIN));

settingsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await getSettings());
  }),
);

settingsRouter.patch(
  "/",
  asyncHandler(async (req, res) => {
    const input = updateSettingsSchema.parse(req.body);
    const settings = await updateSettings(input);
    await auditFromRequest(req, "SETTINGS_UPDATED", "Settings", settings.id, input);
    res.json(settings);
  }),
);
