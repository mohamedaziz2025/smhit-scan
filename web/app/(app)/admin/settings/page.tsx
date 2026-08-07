"use client";

import { useEffect, useState } from "react";
import { Save, Info } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientButton } from "@/components/ui/GradientButton";
import { useSettings, useUpdateSettings } from "@/hooks/useSettings";

/**
 * Paramètres système (§9). aiConfidenceThreshold et la matrice de risque
 * sont réellement branchés côté serveur (le calcul de risque §8 les lit à
 * chaque génération de rapport — voir report.service.ts::computeTendance).
 * Les templates de commentaires restent des règles fixes dans le code
 * (reportCalculations.ts) — les rendre éditables est un travail ultérieur.
 */
export default function AdminSettingsPage() {
  const settings = useSettings();
  const update = useUpdateSettings();
  const [form, setForm] = useState({ aiConfidenceThreshold: 0.75, riskMoyenMax: 3, riskEleveMinCaptures: 1 });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings.data) setForm(settings.data);
  }, [settings.data]);

  async function handleSave() {
    await update.mutateAsync(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-ink">Paramètres système</h1>
        <p className="mt-1 text-sm text-muted">Seuils IA et matrice de risque — réservé Super Admin.</p>
      </div>

      <GlassCard>
        <h2 className="mb-1 font-heading text-base font-semibold text-ink">Seuil de confiance IA</h2>
        <p className="mb-4 text-xs text-muted">
          Sous ce seuil, un champ extrait par l&apos;OCR est marqué « à vérifier » (§7.4).
        </p>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={form.aiConfidenceThreshold}
            onChange={(e) => setForm({ ...form, aiConfidenceThreshold: Number(e.target.value) })}
            className="flex-1 accent-brand"
          />
          <span className="w-14 text-right font-mono text-sm text-ink">
            {Math.round(form.aiConfidenceThreshold * 100)}%
          </span>
        </div>
      </GlassCard>

      <GlassCard>
        <h2 className="mb-1 font-heading text-base font-semibold text-ink">Matrice de risque</h2>
        <p className="mb-4 text-xs text-muted">§8 — pilote le niveau de risque calculé sur chaque rapport mensuel.</p>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">
              Consommations max pour risque &quot;Moyen&quot; (au-delà : Élevé)
            </label>
            <input
              type="number"
              min={0}
              value={form.riskMoyenMax}
              onChange={(e) => setForm({ ...form, riskMoyenMax: Number(e.target.value) })}
              className="h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">
              Captures minimum déclenchant risque &quot;Élevé&quot;
            </label>
            <input
              type="number"
              min={0}
              value={form.riskEleveMinCaptures}
              onChange={(e) => setForm({ ...form, riskEleveMinCaptures: Number(e.target.value) })}
              className="h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm outline-none focus:border-brand"
            />
          </div>
        </div>
      </GlassCard>

      <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-700">
        <Info size={16} className="shrink-0" />
        Les templates de commentaires auto (§8) restent des règles fixes côté serveur pour l&apos;instant — les
        rendre éditables ici est un travail à venir.
      </div>

      <GradientButton onClick={handleSave} disabled={update.isPending}>
        <Save size={16} /> {update.isPending ? "Enregistrement…" : saved ? "Enregistré ✓" : "Enregistrer"}
      </GradientButton>
    </div>
  );
}
