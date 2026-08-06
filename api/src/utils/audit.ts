import type { Request } from "express";
import { AuditLog } from "../models/AuditLog";
import type { UserRole } from "../types/enums";

interface AuditInput {
  actorId: string;
  role: UserRole;
  action: string;
  entity: string;
  entityId: string;
  diff?: Record<string, unknown>;
  ip?: string;
}

/** Journal d'audit (§13) — appelé sur toute mutation de fiche/rapport/utilisateur. */
export async function logAudit(input: AuditInput): Promise<void> {
  await AuditLog.create(input);
}

export function auditFromRequest(req: Request, action: string, entity: string, entityId: string, diff?: unknown) {
  return logAudit({
    actorId: req.auth!.userId,
    role: req.auth!.role,
    action,
    entity,
    entityId,
    diff: diff as Record<string, unknown> | undefined,
    ip: req.ip,
  });
}
