import { Router } from "express";
import { Fiche } from "../models/Fiche";
import { UserRole, FicheType } from "../types/enums";
import { requireAuth } from "../middlewares/auth";
import { uploadScanImages } from "../middlewares/upload";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../middlewares/errorHandler";
import { canAccessClient } from "../utils/scope";
import { canEditFiche, canValidateFiche, canViewFiche } from "../utils/fichePermissions";
import { auditFromRequest } from "../utils/audit";
import * as ficheService from "../services/fiche.service";
import { listFichesQuerySchema, scanFicheSchema, updateFicheSchema } from "../validators/fiche.validators";

export const fichesRouter = Router();
fichesRouter.use(requireAuth);

fichesRouter.post(
  "/scan",
  uploadScanImages,
  asyncHandler(async (req, res) => {
    const body = scanFicheSchema.parse(req.body);
    const ficheType = (req.body.ficheType as FicheType) ?? FicheType.DERATISATION_EXTERNE;

    if (!(await canAccessClient(req.auth!, body.clientId)) && req.auth!.role !== UserRole.AGENT) {
      throw new ApiError(403, "Hors de votre périmètre");
    }

    const files = ((req.files as Express.Multer.File[]) ?? []).map((f) => ({
      buffer: f.buffer,
      mimetype: f.mimetype,
      originalname: f.originalname,
    }));

    const fiche = await ficheService.createFicheFromScan({
      clientId: body.clientId,
      siteId: body.siteId,
      interventionDate: body.interventionDate,
      agentId: req.auth!.userId,
      ficheType,
      files,
    });

    await auditFromRequest(req, "FICHE_SCANNED", "Fiche", fiche.id, { clientId: body.clientId, siteId: body.siteId });
    res.status(201).json(fiche);
  }),
);

fichesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = listFichesQuerySchema.parse(req.query);
    const filter: Record<string, unknown> = {};

    if (req.auth!.role === UserRole.AGENT) {
      filter.createdByAgentId = req.auth!.userId; // §2 : l'agent ne voit que les siennes
    } else if (query.agentId) {
      filter.createdByAgentId = query.agentId;
    }

    if (query.clientId) filter.clientId = query.clientId;
    if (query.status) filter.status = query.status;
    if (query.from || query.to) {
      filter.interventionDate = {
        ...(query.from ? { $gte: query.from } : {}),
        ...(query.to ? { $lte: query.to } : {}),
      };
    }

    const [items, total] = await Promise.all([
      Fiche.find(filter)
        .sort({ interventionDate: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit),
      Fiche.countDocuments(filter),
    ]);

    res.json({ items, total, page: query.page, limit: query.limit });
  }),
);

fichesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const fiche = await Fiche.findById(req.params.id);
    if (!fiche) throw new ApiError(404, "Fiche introuvable");
    if (!canViewFiche(req.auth!, fiche)) throw new ApiError(403, "Accès refusé à cette fiche");
    res.json(fiche);
  }),
);

fichesRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const fiche = await Fiche.findById(req.params.id);
    if (!fiche) throw new ApiError(404, "Fiche introuvable");
    if (!canEditFiche(req.auth!, fiche)) throw new ApiError(403, "Cette fiche ne peut plus être modifiée");

    const input = updateFicheSchema.parse(req.body);
    Object.assign(fiche, input);
    await fiche.save();

    await auditFromRequest(req, "FICHE_UPDATED", "Fiche", fiche.id, input);
    res.json(fiche);
  }),
);

fichesRouter.post(
  "/:id/validate",
  asyncHandler(async (req, res) => {
    const fiche = await Fiche.findById(req.params.id);
    if (!fiche) throw new ApiError(404, "Fiche introuvable");
    if (!canValidateFiche(req.auth!, fiche)) throw new ApiError(403, "Vous ne pouvez pas valider cette fiche");

    const validated = await ficheService.validateFiche(fiche.id);
    await auditFromRequest(req, "FICHE_VALIDATED", "Fiche", fiche.id);

    // Génération automatique du rapport (§5, §8) — Module 5.
    res.json(validated);
  }),
);
