import { z } from "zod";
import { UserRole } from "../types/enums";

export const createUserSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8, "8 caractères minimum"),
  role: z.nativeEnum(UserRole).default(UserRole.AGENT),
  phone: z.string().optional(),
});

export const updateUserSchema = z.object({
  fullName: z.string().min(1).optional(),
  phone: z.string().optional(),
  signatureImageUrl: z.string().url().optional(),
  scope: z.object({ clientIds: z.array(z.string()) }).optional(),
});

export const updateRoleSchema = z.object({ role: z.nativeEnum(UserRole) });
export const activateSchema = z.object({ isActive: z.boolean() });
