import { Router } from "express";
import { healthRouter } from "./health.route";

/**
 * Point d'entrée unique des routes de l'API.
 * Les routes métier (auth, users, clients, products, fiches, reports,
 * analytics) seront ajoutées ici module par module — voir §14 du
 * cahier des charges (Module 2 : auth/models, Module 4 : fiches,
 * Module 5 : rapports, etc.).
 */
export const router = Router();

router.use(healthRouter);
