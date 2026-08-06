import { Router } from "express";
import { User } from "../models/User";
import { UserRole } from "../types/enums";
import { requireAuth, requireRole } from "../middlewares/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../middlewares/errorHandler";
import { createUserWithPassword } from "../services/auth.service";
import { revokeAllRefreshTokens } from "../services/refreshToken.service";
import {
  activateSchema,
  createUserSchema,
  updateRoleSchema,
  updateUserSchema,
} from "../validators/user.validators";

// Gestion des utilisateurs & rôles — réservée au Super Admin (§2 matrice de permissions).
export const usersRouter = Router();
usersRouter.use(requireAuth, requireRole(UserRole.SUPER_ADMIN));

usersRouter.get(
  "/users",
  asyncHandler(async (req, res) => {
    const { role, isActive, page = "1", limit = "20" } = req.query as Record<string, string>;
    const filter: Record<string, unknown> = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));

    const [items, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      User.countDocuments(filter),
    ]);

    res.json({ items, total, page: pageNum, limit: limitNum });
  }),
);

usersRouter.post(
  "/users",
  asyncHandler(async (req, res) => {
    const input = createUserSchema.parse(req.body);
    const user = await createUserWithPassword(input);
    res.status(201).json(user);
  }),
);

usersRouter.get(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) throw new ApiError(404, "Utilisateur introuvable");
    res.json(user);
  }),
);

usersRouter.patch(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const input = updateUserSchema.parse(req.body);
    const user = await User.findByIdAndUpdate(req.params.id, input, { new: true });
    if (!user) throw new ApiError(404, "Utilisateur introuvable");
    res.json(user);
  }),
);

usersRouter.patch(
  "/users/:id/role",
  asyncHandler(async (req, res) => {
    const { role } = updateRoleSchema.parse(req.body);
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) throw new ApiError(404, "Utilisateur introuvable");
    res.json(user);
  }),
);

usersRouter.patch(
  "/users/:id/activate",
  asyncHandler(async (req, res) => {
    const { isActive } = activateSchema.parse(req.body);
    const user = await User.findByIdAndUpdate(req.params.id, { isActive }, { new: true });
    if (!user) throw new ApiError(404, "Utilisateur introuvable");
    // Désactivation = révocation immédiate de toutes ses sessions actives.
    if (!isActive) await revokeAllRefreshTokens(user.id);
    res.json(user);
  }),
);

usersRouter.delete(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) throw new ApiError(404, "Utilisateur introuvable");
    await revokeAllRefreshTokens(user.id);
    res.status(204).send();
  }),
);
