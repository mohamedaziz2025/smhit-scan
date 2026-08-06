import { UserRole } from "../types/enums";
import { User } from "../models/User";
import type { Types } from "mongoose";

/**
 * Vérifie que l'utilisateur authentifié peut accéder aux données d'un client
 * donné, selon son rôle et son périmètre (§2 matrice de permissions) :
 * - AGENT       : n'a accès qu'à ses propres fiches (vérifié séparément par createdByAgentId)
 * - ADMIN       : limité à `scope.clientIds` s'il est défini, sinon tout
 * - SUPER_ADMIN : accès total
 */
export async function canAccessClient(
  auth: { userId: string; role: UserRole },
  clientId: string | Types.ObjectId,
): Promise<boolean> {
  if (auth.role === UserRole.SUPER_ADMIN) return true;

  if (auth.role === UserRole.ADMIN) {
    const user = await User.findById(auth.userId).select("scope").lean();
    const scopedIds = user?.scope?.clientIds;
    if (!scopedIds || scopedIds.length === 0) return true; // pas de périmètre défini = accès total
    return scopedIds.some((id) => id.toString() === clientId.toString());
  }

  return false; // AGENT : le contrôle se fait via createdByAgentId, pas via le scope client
}
