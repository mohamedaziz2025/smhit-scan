"use client";

import { useMemo, useState } from "react";
import { clsx } from "clsx";

export type PeriodPreset = "all" | "day" | "week" | "fortnight" | "month" | "quarter" | "semester" | "year" | "custom";

export interface PeriodRange {
  from?: string;
  to?: string;
}

const PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: "all", label: "Tout" },
  { value: "day", label: "Jour" },
  { value: "week", label: "Semaine" },
  { value: "fortnight", label: "Quinzaine" },
  { value: "month", label: "Mois" },
  { value: "quarter", label: "Trimestre" },
  { value: "semester", label: "Semestre" },
  { value: "year", label: "Année" },
];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/**
 * Calcule la borne [from, to] correspondant à un préréglage de période.
 * "Quinzaine" suit l'usage terrain (1ère quinzaine = 1–15, 2ème = 16–fin de
 * mois) plutôt qu'une fenêtre glissante de 15 jours.
 */
export function computeRange(preset: PeriodPreset, customFrom?: string, customTo?: string): PeriodRange {
  const now = new Date();

  switch (preset) {
    case "all":
      return {};

    case "day":
      return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() };

    case "week": {
      const offsetFromMonday = (now.getDay() + 6) % 7; // lundi = 0 ... dimanche = 6
      const monday = startOfDay(now);
      monday.setDate(now.getDate() - offsetFromMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { from: monday.toISOString(), to: endOfDay(sunday).toISOString() };
    }

    case "fortnight": {
      const dom = now.getDate();
      const firstHalf = dom <= 15;
      const from = new Date(now.getFullYear(), now.getMonth(), firstHalf ? 1 : 16);
      const to = firstHalf
        ? new Date(now.getFullYear(), now.getMonth(), 15)
        : new Date(now.getFullYear(), now.getMonth() + 1, 0); // dernier jour du mois
      return { from: startOfDay(from).toISOString(), to: endOfDay(to).toISOString() };
    }

    case "month": {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { from: startOfDay(from).toISOString(), to: endOfDay(to).toISOString() };
    }

    case "quarter": {
      const q = Math.floor(now.getMonth() / 3);
      const from = new Date(now.getFullYear(), q * 3, 1);
      const to = new Date(now.getFullYear(), q * 3 + 3, 0);
      return { from: startOfDay(from).toISOString(), to: endOfDay(to).toISOString() };
    }

    case "semester": {
      const s = now.getMonth() < 6 ? 0 : 6;
      const from = new Date(now.getFullYear(), s, 1);
      const to = new Date(now.getFullYear(), s + 6, 0);
      return { from: startOfDay(from).toISOString(), to: endOfDay(to).toISOString() };
    }

    case "year": {
      const from = new Date(now.getFullYear(), 0, 1);
      const to = new Date(now.getFullYear(), 11, 31);
      return { from: startOfDay(from).toISOString(), to: endOfDay(to).toISOString() };
    }

    case "custom":
      return {
        from: customFrom ? startOfDay(new Date(customFrom)).toISOString() : undefined,
        to: customTo ? endOfDay(new Date(customTo)).toISOString() : undefined,
      };
  }
}

/**
 * Filtre par période réutilisable (fiches §11, rapports §9) — préréglages
 * jour/semaine/quinzaine/mois/trimestre/semestre/année + borne personnalisée.
 * Le composant ne connaît que le préréglage choisi ; c'est `computeRange()`
 * qui traduit en `{from, to}` ISO consommables par les query params API
 * (déjà supportés côté backend : `GET /fiches` et `GET /reports`).
 */
export function PeriodFilter({
  value,
  onChange,
}: {
  value: PeriodPreset;
  onChange: (preset: PeriodPreset, customFrom?: string, customTo?: string) => void;
}) {
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const allOptions = useMemo(() => [...PRESETS, { value: "custom" as const, label: "Personnalisé" }], []);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {allOptions.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => onChange(p.value, customFrom, customTo)}
          className={clsx(
            "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
            value === p.value ? "bg-brand text-white" : "bg-surface text-muted hover:bg-brand-light",
          )}
        >
          {p.label}
        </button>
      ))}

      {value === "custom" && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => {
              setCustomFrom(e.target.value);
              onChange("custom", e.target.value, customTo);
            }}
            className="h-8 rounded-lg border border-border bg-surface px-2 text-xs text-ink outline-none focus:border-brand"
          />
          <span className="text-xs text-muted">→</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => {
              setCustomTo(e.target.value);
              onChange("custom", customFrom, e.target.value);
            }}
            className="h-8 rounded-lg border border-border bg-surface px-2 text-xs text-ink outline-none focus:border-brand"
          />
        </div>
      )}
    </div>
  );
}
