"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { FileDown, CheckCircle2, Undo2 } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientButton } from "@/components/ui/GradientButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useClient } from "@/hooks/useClients";
import { useReport, usePatchReport, useValidateReport, useReturnReport } from "@/hooks/useReports";
import { openReportPdf } from "@/lib/downloadPdf";

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const report = useReport(id);
  const client = useClient(report.data?.clientId);
  const patch = usePatchReport(id);
  const validate = useValidateReport(id);
  const returnMutation = useReturnReport(id);

  const [recommendations, setRecommendations] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  if (report.isLoading || !report.data) return <p className="text-sm text-muted">Chargement…</p>;

  const r = report.data;
  const locked = r.status === "VALIDATED";
  const conclusion = r.deratisation?.conclusion;

  async function handleOpenPdf() {
    setPdfLoading(true);
    try {
      await openReportPdf(id);
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink">{r.period.label}</h1>
          <p className="mt-1 text-sm text-muted">{client.data?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={r.status} />
          <button
            onClick={handleOpenPdf}
            disabled={pdfLoading}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-medium text-ink hover:bg-bg"
          >
            <FileDown size={16} /> {pdfLoading ? "Génération…" : "PDF"}
          </button>
        </div>
      </div>

      {conclusion && (
        <GlassCard>
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-semibold text-ink">Conclusion</h2>
            <StatusBadge status={conclusion.risqueActuel} />
          </div>
          <p className="mt-2 text-sm text-ink">{conclusion.interpretation}</p>
          <p className="mt-2 text-sm text-muted">
            <span className="font-medium text-ink">Action recommandée : </span>
            {conclusion.actionRecommandee}
          </p>
        </GlassCard>
      )}

      {r.deratisation?.tendance?.months && (
        <GlassCard>
          <h2 className="mb-4 font-heading text-base font-semibold text-ink">Tendance (12 mois)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={r.deratisation.tendance.months}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E7EAF0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} interval={1} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="appatsConsommes" fill="#F26A21" radius={[4, 4, 0, 0]} name="Appâts consommés" />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      )}

      {r.deratisation?.interventions?.map((intervention) => (
        <GlassCard key={intervention.index}>
          <h2 className="mb-3 font-heading text-base font-semibold text-ink">
            Intervention n°{intervention.index}
          </h2>

          {intervention.zonesExternes.length > 0 && (
            <table className="mb-4 w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-muted">
                  <th className="pb-2">Zone</th>
                  <th className="pb-2">Postes</th>
                  <th className="pb-2">Prises</th>
                  <th className="pb-2">% Prise</th>
                  <th className="pb-2">Cadavres</th>
                </tr>
              </thead>
              <tbody>
                {intervention.zonesExternes.map((z, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="py-2 text-ink">{z.zone}</td>
                    <td className="py-2 text-muted">{z.nbPiege}</td>
                    <td className="py-2 text-muted">{z.nbPrise}</td>
                    <td className="py-2 text-muted">{z.pctPrise}%</td>
                    <td className="py-2 text-muted">{z.nbCadavre}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {[...intervention.commentairesExternes, ...intervention.commentairesInternes].map((c, i) => (
            <p key={i} className="text-xs italic text-muted">
              • {c}
            </p>
          ))}
        </GlassCard>
      ))}

      <GlassCard>
        <h2 className="mb-3 font-heading text-base font-semibold text-ink">Recommandations Admin</h2>
        <textarea
          disabled={locked}
          defaultValue={r.adminRecommendations ?? ""}
          onChange={(e) => setRecommendations(e.target.value)}
          rows={4}
          placeholder="Recommandations, corrections, observations…"
          className="w-full resize-none rounded-xl border border-border bg-bg p-3 text-sm outline-none focus:border-brand disabled:opacity-60"
        />
        {!locked && (
          <div className="mt-4 flex justify-end gap-3">
            <button
              onClick={() => returnMutation.mutate(recommendations ?? undefined)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-muted hover:bg-bg"
            >
              <Undo2 size={16} /> Renvoyer à l&apos;agent
            </button>
            <button
              onClick={() => recommendations !== null && patch.mutate({ adminRecommendations: recommendations })}
              disabled={recommendations === null || patch.isPending}
              className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-medium text-ink hover:bg-bg disabled:opacity-50"
            >
              {patch.isPending ? "Enregistrement…" : "Enregistrer"}
            </button>
            <GradientButton onClick={() => validate.mutate()} disabled={validate.isPending}>
              <CheckCircle2 size={16} /> {validate.isPending ? "Validation…" : "Valider le rapport"}
            </GradientButton>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
