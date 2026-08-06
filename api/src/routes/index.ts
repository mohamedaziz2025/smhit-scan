import { Router } from "express";
import { healthRouter } from "./health.route";
import { authRouter } from "./auth.route";
import { usersRouter } from "./users.route";

/**
 * Point d'entrée unique des routes de l'API.
 * Les routes clients/sites/produits/fiches/reports/analytics seront
 * ajoutées ici module par module — voir §14 du cahier des charges.
 */
export const router = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
