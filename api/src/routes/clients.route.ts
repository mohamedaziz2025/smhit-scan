import { Router } from "express";
import { Client } from "../models/Client";
import { Site } from "../models/Site";
import { UserRole } from "../types/enums";
import { requireAuth, requireRole } from "../middlewares/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../middlewares/errorHandler";
import { canAccessClient } from "../utils/scope";
import { auditFromRequest } from "../utils/audit";
import {
  createClientSchema,
  createSiteSchema,
  updateClientSchema,
  updateSiteSchema,
} from "../validators/client.validators";

// Clients / Sites — §9. Lecture ouverte à tout rôle authentifié (l'agent
// doit pouvoir choisir client+site au moment du scan) ; écriture selon la
// matrice §2 : création Admin+SuperAdmin, modification/suppression SuperAdmin.
export const clientsRouter = Router();
clientsRouter.use(requireAuth);

clientsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { search, page = "1", limit = "20" } = req.query as Record<string, string>;
    const filter: Record<string, unknown> = { isActive: true };
    if (search) filter.$text = { $search: search };

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));

    const [items, total] = await Promise.all([
      Client.find(filter)
        .sort({ name: 1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Client.countDocuments(filter),
    ]);

    res.json({ items, total, page: pageNum, limit: limitNum });
  }),
);

clientsRouter.post(
  "/",
  requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const input = createClientSchema.parse(req.body);
    const client = await Client.create(input);
    await auditFromRequest(req, "CLIENT_CREATED", "Client", client.id, input);
    res.status(201).json(client);
  }),
);

clientsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const client = await Client.findById(req.params.id);
    if (!client) throw new ApiError(404, "Client introuvable");
    if (!(await canAccessClient(req.auth!, client.id))) throw new ApiError(403, "Hors de votre périmètre");
    res.json(client);
  }),
);

clientsRouter.patch(
  "/:id",
  requireRole(UserRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const input = updateClientSchema.parse(req.body);
    const client = await Client.findByIdAndUpdate(req.params.id, input, { new: true });
    if (!client) throw new ApiError(404, "Client introuvable");
    await auditFromRequest(req, "CLIENT_UPDATED", "Client", client.id, input);
    res.json(client);
  }),
);

clientsRouter.delete(
  "/:id",
  requireRole(UserRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const client = await Client.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!client) throw new ApiError(404, "Client introuvable");
    await auditFromRequest(req, "CLIENT_DEACTIVATED", "Client", client.id);
    res.status(204).send();
  }),
);

/* ------------------------------------------------------------------ */
/* Sites d'un client                                                   */
/* ------------------------------------------------------------------ */

clientsRouter.get(
  "/:clientId/sites",
  asyncHandler(async (req, res) => {
    if (!(await canAccessClient(req.auth!, req.params.clientId))) {
      throw new ApiError(403, "Hors de votre périmètre");
    }
    const sites = await Site.find({ clientId: req.params.clientId, isActive: true }).sort({ name: 1 });
    res.json(sites);
  }),
);

clientsRouter.post(
  "/:clientId/sites",
  requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const input = createSiteSchema.parse(req.body);
    const site = await Site.create({ ...input, clientId: req.params.clientId });
    await auditFromRequest(req, "SITE_CREATED", "Site", site.id, input);
    res.status(201).json(site);
  }),
);

clientsRouter.patch(
  "/:clientId/sites/:siteId",
  requireRole(UserRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const input = updateSiteSchema.parse(req.body);
    const site = await Site.findOneAndUpdate(
      { _id: req.params.siteId, clientId: req.params.clientId },
      input,
      { new: true },
    );
    if (!site) throw new ApiError(404, "Site introuvable");
    await auditFromRequest(req, "SITE_UPDATED", "Site", site.id, input);
    res.json(site);
  }),
);

clientsRouter.delete(
  "/:clientId/sites/:siteId",
  requireRole(UserRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const site = await Site.findOneAndUpdate(
      { _id: req.params.siteId, clientId: req.params.clientId },
      { isActive: false },
      { new: true },
    );
    if (!site) throw new ApiError(404, "Site introuvable");
    await auditFromRequest(req, "SITE_DEACTIVATED", "Site", site.id);
    res.status(204).send();
  }),
);
