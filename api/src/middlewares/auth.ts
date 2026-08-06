import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { ApiError } from "./errorHandler";
import type { UserRole } from "../types/enums";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: { userId: string; role: UserRole };
    }
  }
}

/** Exige un access token JWT valide dans `Authorization: Bearer <token>`. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new ApiError(401, "Authentification requise");
  }

  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyAccessToken(token);
    req.auth = { userId: payload.sub, role: payload.role };
    next();
  } catch {
    throw new ApiError(401, "Token invalide ou expiré");
  }
}

/** Exige que le rôle de l'utilisateur authentifié figure dans la liste autorisée (§2). */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) throw new ApiError(401, "Authentification requise");
    if (!roles.includes(req.auth.role)) {
      throw new ApiError(403, "Accès refusé pour ce rôle");
    }
    next();
  };
}
