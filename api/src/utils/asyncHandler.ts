import type { NextFunction, Request, Response } from "express";

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * Express 4 ne transmet pas automatiquement les rejets de Promise au
 * middleware d'erreur — sans ce wrapper, une exception async (ex: erreur
 * Mongoose, ApiError levée dans un `await`) crasherait silencieusement la
 * requête au lieu de passer par `errorHandler`.
 */
export function asyncHandler(fn: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
