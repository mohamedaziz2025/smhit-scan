import { PeriodType } from "../types/enums";

/** Normalise une date à minuit UTC — utilisé pour la règle "1 fiche/client/site/jour" (§5). */
export function normalizeToUtcMidnight(date: Date | string): Date {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

const MOIS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function formatDateFr(d: Date): string {
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
}

export interface PeriodBounds {
  from: Date;
  to: Date;
  label: string;
}

/**
 * Bornes [from, to] + libellé pour un type de période donné, à partir d'une
 * date "ancre" (n'importe quel jour à l'intérieur de la période visée) —
 * généralise l'ancien calcul mensuel unique (monthBounds, désormais un cas
 * particulier) aux périodes jour/semaine/quinzaine/mois/trimestre/semestre/
 * année demandées pour la génération de rapport à la demande (§8/§9).
 * Même logique de découpage que web/components/PeriodFilter.tsx côté
 * client (filtre de liste), ici côté serveur pour ancrer un rapport généré.
 */
export function computePeriodBounds(periodType: PeriodType, anchor: Date): PeriodBounds {
  const y = anchor.getUTCFullYear();
  const m = anchor.getUTCMonth();
  const d = anchor.getUTCDate();

  switch (periodType) {
    case PeriodType.DAY: {
      const from = new Date(Date.UTC(y, m, d));
      const to = new Date(Date.UTC(y, m, d, 23, 59, 59, 999));
      return { from, to, label: formatDateFr(from) };
    }

    case PeriodType.WEEK: {
      const offsetFromMonday = (anchor.getUTCDay() + 6) % 7; // lundi = 0 ... dimanche = 6
      const from = new Date(Date.UTC(y, m, d - offsetFromMonday));
      const to = new Date(Date.UTC(y, m, d - offsetFromMonday + 6, 23, 59, 59, 999));
      return { from, to, label: `Semaine du ${formatDateFr(from)} au ${formatDateFr(to)}` };
    }

    case PeriodType.FORTNIGHT: {
      const firstHalf = d <= 15;
      const from = new Date(Date.UTC(y, m, firstHalf ? 1 : 16));
      const to = firstHalf
        ? new Date(Date.UTC(y, m, 15, 23, 59, 59, 999))
        : new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999)); // dernier jour du mois
      return { from, to, label: `${firstHalf ? "1ère" : "2ème"} quinzaine de ${MOIS_FR[m]} ${y}` };
    }

    case PeriodType.MONTH: {
      const from = new Date(Date.UTC(y, m, 1));
      const to = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
      return { from, to, label: `${MOIS_FR[m]} ${y}` };
    }

    case PeriodType.QUARTER: {
      const q = Math.floor(m / 3);
      const from = new Date(Date.UTC(y, q * 3, 1));
      const to = new Date(Date.UTC(y, q * 3 + 3, 0, 23, 59, 59, 999));
      return { from, to, label: `T${q + 1} ${y}` };
    }

    case PeriodType.SEMESTER: {
      const s = m < 6 ? 0 : 6;
      const from = new Date(Date.UTC(y, s, 1));
      const to = new Date(Date.UTC(y, s + 6, 0, 23, 59, 59, 999));
      return { from, to, label: `${s === 0 ? "1er" : "2ème"} semestre ${y}` };
    }

    case PeriodType.YEAR: {
      const from = new Date(Date.UTC(y, 0, 1));
      const to = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
      return { from, to, label: `Année ${y}` };
    }
  }
}
