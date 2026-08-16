"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { MapPin, FileText, FileCheck2, Store, Plus, Pencil, FileSpreadsheet, FilePlus2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientButton } from "@/components/ui/GradientButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SitePlanEditor } from "@/components/SitePlanEditor";
import { PeriodFilter, computeRange, type PeriodPreset } from "@/components/PeriodFilter";
import { useClient, useSites, useCreateSite, useUpdateSite, type SiteDto } from "@/hooks/useClients";
import { useFiches } from "@/hooks/useFiches";
import { useReports, useGenerateReport, useGenerateMagasinsReport, type ReportPeriodType } from "@/hooks/useReports";
import { useAuthStore } from "@/store/auth";
import { downloadSiteExcel } from "@/lib/downloadExcel";

const MOIS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

// Types de période supportés pour la génération de rapport à la demande
// (§8/§9) — pas seulement le mois calendaire.
const REPORT_PERIOD_TYPES: { value: ReportPeriodType; label: string }[] = [
  { value: "DAY", label: "Jour" },
  { value: "WEEK", label: "Semaine" },
  { value: "FORTNIGHT", label: "Quinzaine" },
  { value: "MONTH", label: "Mois" },
  { value: "QUARTER", label: "Trimestre" },
  { value: "SEMESTER", label: "Semestre" },
  { value: "YEAR", label: "Année" },
];

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const client = useClient(id);
  const sites = useSites(id);

  // "all" = tous les sites du client confondus (comportement précédent) ;
  // sinon un site précis — filtre les fiches/rapports ET conditionne les
  // actions "Générer un rapport"/"Exporter Excel", qui n'ont de sens que
  // pour un site donné.
  const [siteFilter, setSiteFilter] = useState<string>("all");
  const selectedSite = sites.data?.find((s) => s._id === siteFilter);

  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("all");
  const [periodFrom, setPeriodFrom] = useState<string | undefined>();
  const [periodTo, setPeriodTo] = useState<string | undefined>();
  const period = useMemo(() => computeRange(periodPreset, periodFrom, periodTo), [periodPreset, periodFrom, periodTo]);

  function handlePeriodChange(p: PeriodPreset, from?: string, to?: string) {
    setPeriodPreset(p);
    setPeriodFrom(from);
    setPeriodTo(to);
  }

  const siteIdParam = siteFilter === "all" ? undefined : siteFilter;
  const fiches = useFiches({ clientId: id, siteId: siteIdParam, from: period.from, to: period.to });
  const reports = useReports({ clientId: id, siteId: siteIdParam, from: period.from, to: period.to });
  const generateReport = useGenerateReport();
  const generateMagasins = useGenerateMagasinsReport();
  const createSite = useCreateSite(id);
  const updateSite = useUpdateSite(id);
  const role = useAuthStore((s) => s.user?.role);
  // Ajout du plan (création) ET modification ouverts à Admin+SuperAdmin —
  // l'admin doit pouvoir corriger le plan d'un site qu'il gère, pas
  // seulement le créer.
  const canManageSite = role === "ADMIN" || role === "SUPER_ADMIN";

  const [editingSite, setEditingSite] = useState<SiteDto | "new" | null>(null);

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [reportPeriodType, setReportPeriodType] = useState<ReportPeriodType>("MONTH");
  const [reportDate, setReportDate] = useState(() => now.toISOString().slice(0, 10));
  const [exporting, setExporting] = useState(false);

  async function handleSaveSite(input: { name: string; zonesConfig: SiteDto["zonesConfig"] }) {
    if (editingSite === "new") {
      await createSite.mutateAsync(input);
    } else if (editingSite) {
      await updateSite.mutateAsync({ siteId: editingSite._id, ...input });
    }
    setEditingSite(null);
  }

  async function handleGenerateMagasins() {
    const report = await generateMagasins.mutateAsync({ clientId: id, month, year });
    router.push(`/reports/${report._id}`);
  }

  async function handleGenerateReport() {
    if (!selectedSite) return;
    const report = await generateReport.mutateAsync({
      clientId: id,
      siteId: selectedSite._id,
      periodType: reportPeriodType,
      date: reportDate,
    });
    router.push(`/reports/${report._id}`);
  }

  async function handleExportExcel() {
    if (!selectedSite) return;
    setExporting(true);
    try {
      await downloadSiteExcel(id, selectedSite._id, selectedSite.name);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-ink">{client.data?.name ?? "…"}</h1>
        <p className="mt-1 text-sm text-muted">{sites.data?.length ?? 0} site(s)</p>
      </div>

      {editingSite && (
        <SitePlanEditor
          initial={editingSite === "new" ? undefined : editingSite}
          onSave={handleSaveSite}
          onCancel={() => setEditingSite(null)}
          saving={createSite.isPending || updateSite.isPending}
        />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <PeriodFilter value={periodPreset} onChange={handlePeriodChange} />
        <select
          value={siteFilter}
          onChange={(e) => setSiteFilter(e.target.value)}
          className="h-9 rounded-full border border-border bg-surface px-3.5 text-xs font-medium text-ink outline-none focus:border-brand"
        >
          <option value="all">Tous les sites</option>
          {sites.data?.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <GlassCard>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-ink">
              <MapPin size={16} className="text-brand" /> Sites
            </h2>
            {canManageSite && (
              <button onClick={() => setEditingSite("new")} className="text-brand-600 hover:text-brand-700" title="Nouveau site">
                <Plus size={18} />
              </button>
            )}
          </div>
          <div className="space-y-2">
            {sites.data?.map((s) => {
              const ext = s.zonesConfig?.externalZones ?? [];
              const int = s.zonesConfig?.internalZones ?? [];
              const totalPostes = [...ext, ...int].reduce((sum, z) => sum + z.postCount, 0);
              const active = siteFilter === s._id;
              return (
                <div
                  key={s._id}
                  onClick={() => setSiteFilter(active ? "all" : s._id)}
                  className={`flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 transition-colors ${
                    active ? "bg-brand-light" : "bg-bg hover:bg-border/40"
                  }`}
                  title="Filtrer les fiches/rapports sur ce site"
                >
                  <div>
                    <p className={`text-sm ${active ? "font-medium text-brand-600" : "text-ink"}`}>{s.name}</p>
                    <p className="text-[11px] text-muted">
                      {ext.length + int.length > 0
                        ? `${ext.length} zone(s) externe(s), ${int.length} zone(s) interne(s) · ${totalPostes} postes`
                        : "Aucun plan de postes défini"}
                    </p>
                  </div>
                  {canManageSite && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSite(s);
                      }}
                      className="text-muted hover:text-brand-600"
                      title="Éditer le plan"
                    >
                      <Pencil size={15} />
                    </button>
                  )}
                </div>
              );
            })}
            {sites.data?.length === 0 && <p className="text-sm text-muted">Aucun site.</p>}
          </div>
        </GlassCard>

        <GlassCard className="lg:col-span-2">
          <h2 className="mb-3 flex items-center gap-2 font-heading text-base font-semibold text-ink">
            <FileText size={16} className="text-brand" /> Fiches {selectedSite ? `— ${selectedSite.name}` : "récentes"}
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

      {selectedSite && (
        <GlassCard>
          <h2 className="mb-3 flex items-center gap-2 font-heading text-base font-semibold text-ink">
            <FilePlus2 size={16} className="text-brand" /> Générer un rapport — {selectedSite.name}
          </h2>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Période</span>
              <select
                value={reportPeriodType}
                onChange={(e) => setReportPeriodType(e.target.value as ReportPeriodType)}
                className="h-10 rounded-xl border border-border bg-bg px-3 text-sm outline-none focus:border-brand"
              >
                {REPORT_PERIOD_TYPES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">
                Un jour dans la période visée
              </span>
              <input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="h-10 rounded-xl border border-border bg-bg px-3 text-sm outline-none focus:border-brand"
              />
            </label>
            <GradientButton onClick={handleGenerateReport} disabled={generateReport.isPending} className="h-10">
              {generateReport.isPending ? "Génération…" : "Générer le rapport"}
            </GradientButton>
            <button
              onClick={handleExportExcel}
              disabled={exporting}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-medium text-ink hover:bg-bg disabled:opacity-50"
            >
              <FileSpreadsheet size={16} /> {exporting ? "Export…" : "Exporter Excel"}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-muted">
            L&apos;export Excel contient le plan de zones, les fiches et les rapports de ce site dans 3 feuilles.
          </p>
        </GlassCard>
      )}

      <GlassCard>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-ink">
            <FileCheck2 size={16} className="text-brand" /> Rapports {selectedSite ? `— ${selectedSite.name}` : ""}
          </h2>
          {(sites.data?.length ?? 0) > 1 && (
            <div className="flex items-center gap-2">
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="h-9 rounded-lg border border-border bg-bg px-2 text-xs outline-none focus:border-brand"
              >
                {MOIS_FR.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="h-9 w-20 rounded-lg border border-border bg-bg px-2 text-xs outline-none focus:border-brand"
              />
              <GradientButton
                onClick={handleGenerateMagasins}
                disabled={generateMagasins.isPending}
                className="h-9 px-3 text-xs"
              >
                <Store size={14} /> {generateMagasins.isPending ? "Génération…" : "Rapport Magasins"}
              </GradientButton>
            </div>
          )}
        </div>
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
