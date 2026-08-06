import { Router } from "express";
import { healthRouter } from "./health.route";
import { authRouter } from "./auth.route";
import { usersRouter } from "./users.route";
import { clientsRouter } from "./clients.route";
import { productsRouter } from "./products.route";
import { fichesRouter } from "./fiches.route";
import { reportsRouter } from "./reports.route";

/**
 * Point d'entrée unique des routes de l'API.
 *
 * IMPORTANT : chaque sous-routeur est monté sur son propre préfixe explicite
 * (`router.use("/prefix", subRouter)`), jamais à la racine. Un `subRouter.use(...)`
 * sans préfixe s'applique à TOUTE requête qui traverse ce routeur — si deux
 * sous-routeurs étaient montés à la racine, le middleware restrictif du
 * premier (ex: `requireRole(SUPER_ADMIN)` sur /users) intercepterait aussi
 * les requêtes destinées aux routeurs suivants (ex: /fiches), avant même
 * qu'Express ne cherche une route correspondante. D'où le préfixe systématique.
 *
 * Les routes reports/analytics seront ajoutées ici au Module 5 — voir §14.
 */
export const router = Router();

router.use("/health", healthRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/clients", clientsRouter);
router.use("/products", productsRouter);
router.use("/fiches", fichesRouter);
router.use("/reports", reportsRouter);
