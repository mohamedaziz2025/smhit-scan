import { User, type IUser } from "../models/User";
import { ApiError } from "../middlewares/errorHandler";
import { hashPassword, verifyPassword } from "../utils/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { isRefreshJtiValid, revokeRefreshJti, storeRefreshJti } from "./refreshToken.service";
import type { UserRole } from "../types/enums";

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

async function issueTokenPair(user: IUser): Promise<TokenPair> {
  const accessToken = signAccessToken({ sub: user.id, role: user.role as UserRole });
  const { token: refreshToken, jti } = signRefreshToken(user.id);
  await storeRefreshJti(user.id, jti);
  return { accessToken, refreshToken };
}

export async function login(email: string, password: string) {
  const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");
  if (!user || !user.isActive) throw new ApiError(401, "Identifiants invalides");

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) throw new ApiError(401, "Identifiants invalides");

  user.lastLoginAt = new Date();
  await user.save();

  const tokens = await issueTokenPair(user);
  return { ...tokens, user: toPublicUser(user) };
}

export async function refresh(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, "Refresh token invalide ou expiré");
  }

  const valid = await isRefreshJtiValid(payload.sub, payload.jti);
  if (!valid) throw new ApiError(401, "Refresh token révoqué");

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw new ApiError(401, "Utilisateur introuvable ou désactivé");

  // Rotation : l'ancien jti est révoqué, un nouveau couple est émis.
  await revokeRefreshJti(payload.sub, payload.jti);
  const tokens = await issueTokenPair(user);
  return { ...tokens, user: toPublicUser(user) };
}

export async function logout(refreshToken: string): Promise<void> {
  try {
    const payload = verifyRefreshToken(refreshToken);
    await revokeRefreshJti(payload.sub, payload.jti);
  } catch {
    // Token déjà invalide/expiré : rien à révoquer, on ignore silencieusement.
  }
}

export function toPublicUser(user: IUser) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    signatureImageUrl: user.signatureImageUrl,
  };
}

export async function createUserWithPassword(input: {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
}) {
  const existing = await User.findOne({ email: input.email.toLowerCase() });
  if (existing) throw new ApiError(409, "Un utilisateur avec cet email existe déjà");

  const passwordHash = await hashPassword(input.password);
  const user = await User.create({
    fullName: input.fullName,
    email: input.email.toLowerCase(),
    phone: input.phone,
    role: input.role,
    passwordHash,
  });
  return toPublicUser(user);
}
