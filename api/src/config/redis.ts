import IORedis from "ioredis";
import { env } from "./env";

/**
 * Connexion Redis partagée : BullMQ (jobs OCR/rapports), rate-limit,
 * sessions refresh-token révocables.
 */
export const redisConnection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // requis par BullMQ
});

redisConnection.on("connect", () => console.log("✅ Redis connecté"));
redisConnection.on("error", (err) => console.error("❌ Erreur Redis :", err));
