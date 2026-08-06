import { Router } from "express";
import * as authService from "../services/auth.service";
import { loginSchema, refreshSchema } from "../validators/auth.validators";
import { requireAuth } from "../middlewares/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { User } from "../models/User";
import { ApiError } from "../middlewares/errorHandler";

export const authRouter = Router();

authRouter.post(
  "/auth/login",
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const result = await authService.login(email, password);
    res.json(result);
  }),
);

authRouter.post(
  "/auth/refresh",
  asyncHandler(async (req, res) => {
    const { refreshToken } = refreshSchema.parse(req.body);
    const result = await authService.refresh(refreshToken);
    res.json(result);
  }),
);

authRouter.post(
  "/auth/logout",
  asyncHandler(async (req, res) => {
    const { refreshToken } = refreshSchema.parse(req.body);
    await authService.logout(refreshToken);
    res.status(204).send();
  }),
);

authRouter.get(
  "/auth/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.auth!.userId);
    if (!user) throw new ApiError(404, "Utilisateur introuvable");
    res.json(authService.toPublicUser(user));
  }),
);
