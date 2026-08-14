"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardList, ChevronRight, ScanLine } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PeriodFilter, computeRange, type PeriodPreset } from "@/components/PeriodFilter";
import { useFiches } from "@/hooks/useFiches";

/** Historique des fiches de l'agent connecté (§11) — équivalent web de MyFichesScreen mobile. */
export default function MyFichesPage() {
  const [preset, setPreset] = useState<PeriodPreset>("all");
  const [customFrom, setCustomFrom] = useState<string | undefined>();
  const [customTo, setCustomTo] = useState<string | undefined>();

  const range = useMemo(() => computeRange(preset, customFrom, customTo), [preset, customFrom, customTo]);
  const fiches = useFiches({ from: range.from, to: range.to });

  function handlePeriodChange(p: PeriodPreset, from?: string, to?: string) {
    setPreset(p);
    setCustomFrom(from);
    setCustomTo(to);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-light text-brand-600">
          <ClipboardList size={20} />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink">Mes fiches</h1>
          <p className="text-sm text-muted">L&apos;API ne renvoie que vos propres fiches (§2).</p>
        </div>
      </div>

      <PeriodFilter value={preset} onChange={handlePeriodChange} />

      {fiches.isLoading && <p className="text-sm text-muted">Chargement…</p>}

      {fiches.data && fiches.data.items.length === 0 && (
        <GlassCard className="flex flex-col items-center gap-3 py-12 text-center">
          <ScanLine size={28} className="text-muted" />
          <p className="text-sm text-muted">
            {preset === "all" ? "Aucune fiche pour le moment." : "Aucune fiche sur cette période."}
          </p>
          <Link href="/scan" className="text-sm font-medium text-brand-600 hover:underline">
            Scanner votre première fiche →
          </Link>
        </GlassCard>
      )}

      <div className="space-y-2">
        {fiches.data?.items.map((f) => (
          <Link key={f._id} href={`/fiches/${f._id}`}>
            <GlassCard className="flex items-center justify-between p-4 transition-colors hover:border-brand">
              <div>
                <p className="text-sm font-medium text-ink">
                  {new Date(f.interventionDate).toLocaleDateString("fr-FR")}
                </p>
                <div className="mt-1">
                  <StatusBadge status={f.status} />
                </div>
              </div>
              <ChevronRight size={18} className="text-muted" />
            </GlassCard>
          </Link>
        ))}
      </div>
    </div>
  );
}
