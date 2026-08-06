"use client";

import Link from "next/link";
import { FileText, FileCheck2, AlertTriangle, Building2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useFiches } from "@/hooks/useFiches";
import { useReports } from "@/hooks/useReports";
import { useClients } from "@/hooks/useClients";

function todayBounds() {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

export default function DashboardPage() {
  const { from, to } = todayBounds();
  const fichesToday = useFiches({ page: 1 });
  const pendingReports = useReports({ status: "PENDING_ADMIN" });
  const clients = useClients();

  const fichesTodayCount = fichesToday.data?.items.filter(
    (f) => f.interventionDate >= from && f.interventionDate <= to,
  ).length ?? 0;

  const risksAtHigh =
    pendingReports.data?.items.filter((r) => r.deratisation?.conclusion?.risqueActuel === "Élevé").length ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">Vue d&apos;ensemble des interventions et rapports.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Fiches aujourd'hui" value={fichesTodayCount} icon={FileText} />
        <StatCard label="Rapports en attente" value={pendingReports.data?.total ?? 0} icon={FileCheck2} accent="warning" />
        <StatCard label="Risque élevé" value={risksAtHigh} icon={AlertTriangle} accent="danger" />
        <StatCard label="Clients actifs" value={clients.data?.length ?? 0} icon={Building2} accent="success" />
      </div>

      <GlassCard>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-ink">Rapports à valider</h2>
          <Link href="/reports" className="text-sm font-medium text-brand-600 hover:underline">
            Voir tout
          </Link>
        </div>

        {pendingReports.isLoading ? (
          <p className="text-sm text-muted">Chargement…</p>
        ) : pendingReports.data?.items.length === 0 ? (
          <p className="text-sm text-muted">Aucun rapport en attente. 🎉</p>
        ) : (
          <div className="divide-y divide-border">
            {pendingReports.data?.items.slice(0, 6).map((r) => (
              <Link
                key={r._id}
                href={`/reports/${r._id}`}
                className="flex items-center justify-between py-3 transition-colors hover:bg-bg"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{r.period.label}</p>
                  <p className="text-xs text-muted">
                    {clients.data?.find((c) => c._id === r.clientId)?.name ?? r.clientId}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </Link>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
