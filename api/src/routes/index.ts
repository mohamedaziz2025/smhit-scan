import { Router } from "express";
import { healthRouter } from "./health.route";
import { authRouter } from "./auth.route";
import { usersRouter } from "./users.route";
import { clientsRouter } from "./clients.route";
import { productsRouter } from "./products.route";
import { fichesRouter } from "./fiches.route";

/**
 * Point d'entrée unique des routes de l'API.
 * Les routes reports/analytics seront ajoutées ici au Module 5 — voir §14.
 */
export const router = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(clientsRouter);
router.use(productsRouter);
router.use(fichesRouter);
