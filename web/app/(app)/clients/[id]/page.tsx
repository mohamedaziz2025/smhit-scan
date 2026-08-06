"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { MapPin, FileText, FileCheck2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useClient, useSites } from "@/hooks/useClients";
import { useFiches } from "@/hooks/useFiches";
import { useReports } from "@/hooks/useReports";

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const client = useClient(id);
  const sites = useSites(id);
  const fiches = useFiches({ clientId: id });
  const reports = useReports({ clientId: id });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-ink">{client.data?.name ?? "…"}</h1>
        <p className="mt-1 text-sm text-muted">{sites.data?.length ?? 0} site(s)</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <GlassCard>
          <h2 className="mb-3 flex items-center gap-2 font-heading text-base font-semibold text-ink">
            <MapPin size={16} className="text-brand" /> Sites
          </h2>
          <div className="space-y-2">
            {sites.data?.map((s) => (
              <div key={s._id} className="rounded-xl bg-bg px-3 py-2 text-sm text-ink">
                {s.name}
              </div>
            ))}
            {sites.data?.length === 0 && <p className="text-sm text-muted">Aucun site.</p>}
          </div>
        </GlassCard>

        <GlassCard className="lg:col-span-2">
          <h2 className="mb-3 flex items-center gap-2 font-heading text-base font-semibold text-ink">
            <FileText size={16} className="text-brand" /> Fiches récentes
          </h2>
          <div className="divide-y divide-border">
            {fiches.data?.items.map((f) => (
              <button
                key={f._id}
                onClick={() => router.push(`/fiches/${f._id}`)}
                className="flex w-full items-center justify-between py-2.5 text-left transition-colors hover:bg-bg"
              >
                <span className="text-sm text-ink">
                  {new Date(f.interventionDate).toLocaleDateString("fr-FR")}
                </span>
                <StatusBadge status={f.status} />
              </button>
            ))}
            {fiches.data?.items.length === 0 && <p className="py-2 text-sm text-muted">Aucune fiche.</p>}
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <h2 className="mb-3 flex items-center gap-2 font-heading text-base font-semibold text-ink">
          <FileCheck2 size={16} className="text-brand" /> Rapports
        </h2>
        <div className="divide-y divide-border">
          {reports.data?.items.map((r) => (
            <Link
              key={r._id}
              href={`/reports/${r._id}`}
              className="flex items-center justify-between py-2.5 transition-colors hover:bg-bg"
            >
              <span className="text-sm text-ink">{r.period.label}</span>
              <StatusBadge status={r.status} />
            </Link>
          ))}
          {reports.data?.items.length === 0 && <p className="py-2 text-sm text-muted">Aucun rapport.</p>}
        </div>
      </GlassCard>
    </div>
  );
}
