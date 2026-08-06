import { redisConnection } from "../config/redis";
import { env } from "../config/env";
import { durationToSeconds } from "../utils/duration";

/**
 * Sessions refresh-token révocables via Redis (§13). Une clé par (user, jti)
 * avec TTL = durée du refresh token — permet le multi-device et la
 * révocation ciblée (logout) ou globale (changement de mot de passe, ban).
 */
const keyFor = (userId: string, jti: string) => `refresh:${userId}:${jti}`;
const ttlSeconds = () => durationToSeconds(env.JWT_REFRESH_TTL);

export async function storeRefreshJti(userId: string, jti: string): Promise<void> {
  await redisConnection.set(keyFor(userId, jti), "1", "EX", ttlSeconds());
}

export async function isRefreshJtiValid(userId: string, jti: string): Promise<boolean> {
  const value = await redisConnection.get(keyFor(userId, jti));
  return value !== null;
}

export async function revokeRefreshJti(userId: string, jti: string): Promise<void> {
  await redisConnection.del(keyFor(userId, jti));
}

/** Révoque toutes les sessions d'un utilisateur (changement de mot de passe, désactivation). */
export async function revokeAllRefreshTokens(userId: string): Promise<void> {
  const keys = await redisConnection.keys(`refresh:${userId}:*`);
  if (keys.length > 0) await redisConnection.del(...keys);
}
