"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useClients } from "@/hooks/useClients";
import { useReports } from "@/hooks/useReports";

/**
 * Analytics (§10) : réutilise la tendance 12 mois déjà calculée par le
 * moteur de rapport (§8) pour le client sélectionné, plutôt que de dupliquer
 * l'agrégation côté frontend — évite d'introduire des endpoints
 * /analytics/* redondants avec les données déjà présentes sur `Report`.
 */
export default function AnalyticsPage() {
  const clients = useClients();
  const [clientId, setClientId] = useState<string | undefined>(undefined);
  const reports = useReports({ clientId });

  const latestReport = reports.data?.items[0];
  const months = latestReport?.deratisation?.tendance?.months ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-ink">Analytics</h1>
        <p className="mt-1 text-sm text-muted">Tendances de consommation et taux de capture par client.</p>
      </div>

      <select
        value={clientId ?? ""}
        onChange={(e) => setClientId(e.target.value || undefined)}
        className="h-11 max-w-sm rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-brand"
      >
        <option value="">Sélectionner un client…</option>
        {clients.data?.map((c) => (
          <option key={c._id} value={c._id}>
            {c.name}
          </option>
        ))}
      </select>

      {!clientId && <p className="text-sm text-muted">Choisissez un client pour afficher ses tendances.</p>}

      {clientId && months.length === 0 && (
        <p className="text-sm text-muted">Aucun rapport généré pour ce client encore.</p>
      )}

      {months.length > 0 && (
        <>
          <GlassCard>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-base font-semibold text-ink">
                Consommation d&apos;appâts &amp; cadavres — 12 mois
              </h2>
              {latestReport?.deratisation?.conclusion?.risqueActuel && (
                <StatusBadge status={latestReport.deratisation.conclusion.risqueActuel} />
              )}
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={months}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7EAF0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} interval={1} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="appatsConsommes" name="Appâts consommés" stroke="#F26A21" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="cadavres" name="Cadavres" stroke="#DC2626" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </GlassCard>

          <GlassCard className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted">
                    <th className="px-4 py-3 md:px-6">Mois</th>
                    <th className="px-4 py-3 md:px-6">Appâts consommés</th>
                    <th className="px-4 py-3 md:px-6">Cadavres</th>
                    <th className="px-4 py-3 md:px-6">Tendance</th>
                    <th className="px-4 py-3 md:px-6">Risque</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map((m, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5 text-ink md:px-6">{m.month}</td>
                      <td className="px-4 py-2.5 text-muted md:px-6">{m.appatsConsommes}</td>
                      <td className="px-4 py-2.5 text-muted md:px-6">{m.cadavres}</td>
                      <td className="px-4 py-2.5 text-muted md:px-6">{m.tendance}</td>
                      <td className="px-4 py-2.5 md:px-6">
                        <StatusBadge status={m.risque} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </>
      )}
    </div>
  );
}
