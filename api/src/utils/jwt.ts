import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { env } from "../config/env";
import type { UserRole } from "../types/enums";

export interface AccessTokenPayload {
  sub: string; // userId
  role: UserRole;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions["expiresIn"] });
}

export function signRefreshToken(userId: string): { token: string; jti: string } {
  const jti = randomUUID();
  const token = jwt.sign(
    { sub: userId, jti } satisfies RefreshTokenPayload,
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_TTL as jwt.SignOptions["expiresIn"] },
  );
  return { token, jti };
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}
