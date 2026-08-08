"use client";

import Link from "next/link";
import { ClipboardList, ChevronRight, ScanLine } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useFiches } from "@/hooks/useFiches";

/** Historique des fiches de l'agent connecté (§11) — équivalent web de MyFichesScreen mobile. */
export default function MyFichesPage() {
  const fiches = useFiches();

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

      {fiches.isLoading && <p className="text-sm text-muted">Chargement…</p>}

      {fiches.data && fiches.data.items.length === 0 && (
        <GlassCard className="flex flex-col items-center gap-3 py-12 text-center">
          <ScanLine size={28} className="text-muted" />
          <p className="text-sm text-muted">Aucune fiche pour le moment.</p>
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
