/**
 * Convertit une durée façon JWT ("15m", "7d", "30s", "2h") en secondes,
 * pour les TTL Redis qui attendent un nombre.
 */
export function durationToSeconds(input: string): number {
  const match = /^(\d+)\s*(s|m|h|d)$/i.exec(input.trim());
  if (!match) {
    throw new Error(`Format de durée invalide : "${input}" (attendu ex: 15m, 7d)`);
  }

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };

  return value * multipliers[unit];
}
