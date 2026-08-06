import type { CorsOptions } from "cors";
import { env } from "./env";

/**
 * CORS_ORIGIN accepte une liste séparée par des virgules (dashboard web
 * prod, preview, etc.). En complément, on autorise toujours localhost/127.0.0.1
 * quel que soit le port : indispensable pour tester le mobile Flutter en
 * cible web (`flutter run -d chrome`), qui démarre son propre serveur de dev
 * sur un port choisi dynamiquement.
 */
const configuredOrigins = env.CORS_ORIGIN.split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const LOCALHOST_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // Requêtes sans en-tête Origin (curl, apps mobiles natives) : toujours OK.
    if (!origin) return callback(null, true);

    const allowed = configuredOrigins.includes(origin) || LOCALHOST_ORIGIN.test(origin);
    callback(allowed ? null : new Error(`Origine non autorisée par CORS : ${origin}`), allowed);
  },
  credentials: true,
};
