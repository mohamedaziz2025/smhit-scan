"use client";

import { useState } from "react";
import Link from "next/link";
import { FileCheck2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useReports } from "@/hooks/useReports";
import { useClients } from "@/hooks/useClients";

const STATUS_TABS = [
  { value: undefined, label: "Tous" },
  { value: "PENDING_ADMIN", label: "En attente" },
  { value: "IN_REVIEW", label: "En révision" },
  { value: "VALIDATED", label: "Validés" },
  { value: "RETURNED", label: "Renvoyés" },
] as const;

export default function ReportsPage() {
  const [status, setStatus] = useState<string | undefined>(undefined);
  const reports = useReports({ status });
  const clients = useClients();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-ink">Rapports</h1>
        <p className="mt-1 text-sm text-muted">File de validation des rapports générés automatiquement.</p>
      </div>

      <div className="flex gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => setStatus(tab.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              status === tab.value ? "bg-brand text-white" : "bg-surface text-muted hover:bg-brand-light"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <GlassCard className="p-0">
        {reports.isLoading ? (
          <p className="p-6 text-sm text-muted">Chargement…</p>
        ) : reports.data?.items.length === 0 ? (
          <p className="p-6 text-sm text-muted">Aucun rapport.</p>
        ) : (
          <div className="divide-y divide-border">
            {reports.data?.items.map((r) => (
              <Link
                key={r._id}
                href={`/reports/${r._id}`}
                className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-bg"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand-600">
                  <FileCheck2 size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-ink">{r.period.label}</p>
                  <p className="text-xs text-muted">
                    {clients.data?.find((c) => c._id === r.clientId)?.name ?? r.clientId}
                  </p>
                </div>
                {r.deratisation?.conclusion?.risqueActuel && (
                  <StatusBadge status={r.deratisation.conclusion.risqueActuel} />
                )}
                <StatusBadge status={r.status} />
              </Link>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
