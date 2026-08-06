import { UserRole, FicheStatus } from "../types/enums";
import type { IFiche } from "../models/Fiche";

/**
 * §2 matrice de permissions :
 * - AGENT       : peut modifier SES fiches tant qu'elles ne sont pas verrouillées
 * - ADMIN/SUPER_ADMIN : peuvent modifier n'importe quelle fiche non verrouillée
 *   (corrections après validation agent, avant génération/verrouillage du rapport)
 */
export function canEditFiche(auth: { userId: string; role: UserRole }, fiche: IFiche): boolean {
  if (fiche.status === FicheStatus.LOCKED) return false;

  if (auth.role === UserRole.ADMIN || auth.role === UserRole.SUPER_ADMIN) return true;

  return auth.role === UserRole.AGENT && fiche.createdByAgentId.toString() === auth.userId;
}

/** Seul l'agent créateur (ou un admin) peut valider une fiche à son propre niveau (§2). */
export function canValidateFiche(auth: { userId: string; role: UserRole }, fiche: IFiche): boolean {
  return canEditFiche(auth, fiche);
}

/** §2 : un agent ne voit que ses fiches ; admin/superadmin voient tout (le scope client est vérifié séparément). */
export function canViewFiche(auth: { userId: string; role: UserRole }, fiche: IFiche): boolean {
  if (auth.role === UserRole.ADMIN || auth.role === UserRole.SUPER_ADMIN) return true;
  return fiche.createdByAgentId.toString() === auth.userId;
}
