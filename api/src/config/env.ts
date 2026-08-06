import "dotenv/config";
import { z } from "zod";

/**
 * Validation stricte des variables d'environnement au démarrage.
 * Toute variable manquante/mal typée fait échouer le boot immédiatement
 * plutôt que de laisser une erreur silencieuse en runtime.
 */
const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  MONGO_URI: z.string().min(1, "MONGO_URI est requis"),
  REDIS_URL: z.string().min(1, "REDIS_URL est requis"),

  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("7d"),

  AI_OCR_URL: z.string().url().default("http://localhost:8000"),
  AI_OCR_CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.75),

  MINIO_ENDPOINT: z.string().default("localhost"),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_USE_SSL: z.coerce.boolean().default(false),
  MINIO_ROOT_USER: z.string().optional(),
  MINIO_ROOT_PASSWORD: z.string().optional(),
  MINIO_BUCKET: z.string().default("smhit-files"),

  CORS_ORIGIN: z.string().default("http://localhost:3000"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Variables d'environnement invalides :", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
