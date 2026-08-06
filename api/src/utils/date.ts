/** Normalise une date à minuit UTC — utilisé pour la règle "1 fiche/client/site/jour" (§5). */
export function normalizeToUtcMidnight(date: Date | string): Date {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
