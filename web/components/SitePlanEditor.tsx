"use client";

import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { GlassCard } from "./ui/GlassCard";
import { GradientButton } from "./ui/GradientButton";
import type { SiteDto, ZoneConfigDto } from "@/hooks/useClients";

/**
 * Plan des postes d'un site (§6.2) — initialisation manuelle par Admin
 * (création) / SuperAdmin (création + modification), §2. Chaque zone
 * définie ici pré-remplit automatiquement les postes vierges de la fiche
 * au moment du scan (voir `initZonesFromSitePlan` côté API), pour que
 * l'agent n'ait qu'à cocher plutôt qu'à ajouter un à un les postes prévus.
 */
export function SitePlanEditor({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: Partial<SiteDto>;
  onSave: (input: { name: string; zonesConfig: SiteDto["zonesConfig"] }) => void;
  onCancel: () => void;
  saving?: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [externalZones, setExternalZones] = useState<ZoneConfigDto[]>(initial?.zonesConfig?.externalZones ?? []);
  const [internalZones, setInternalZones] = useState<ZoneConfigDto[]>(initial?.zonesConfig?.internalZones ?? []);

  function handleSave() {
    if (!name.trim()) return;
    onSave({ name: name.trim(), zonesConfig: { externalZones, internalZones } });
  }

  return (
    <GlassCard className="border-brand/30">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-heading text-base font-semibold text-ink">
          {initial?._id ? "Éditer le plan du site" : "Nouveau site"}
        </h3>
        <button onClick={onCancel} className="text-muted hover:text-ink">
          <X size={18} />
        </button>
      </div>

      <label className="mb-4 block">
        <span className="mb-1.5 block text-sm font-medium text-ink">Nom du site</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Site A, El Agba 01…"
          className="h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm outline-none focus:border-brand"
        />
      </label>

      <ZoneList
        title="Zones externes (dératisation)"
        zones={externalZones}
        setZones={setExternalZones}
        placeholder="Ex: Clôture externe"
      />
      <ZoneList
        title="Zones internes (plaques à colle)"
        zones={internalZones}
        setZones={setInternalZones}
        placeholder="Ex: Atelier production"
      />

      <div className="mt-5 flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="h-10 rounded-xl border border-border px-4 text-sm font-medium text-muted hover:bg-bg"
        >
          Annuler
        </button>
        <GradientButton onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? "Enregistrement…" : "Enregistrer le plan"}
        </GradientButton>
      </div>
    </GlassCard>
  );
}

function ZoneList({
  title,
  zones,
  setZones,
  placeholder,
}: {
  title: string;
  zones: ZoneConfigDto[];
  setZones: (z: ZoneConfigDto[]) => void;
  placeholder: string;
}) {
  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-ink">{title}</span>
        <button
          onClick={() => setZones([...zones, { label: "", postCount: 1 }])}
          className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
        >
          <Plus size={14} /> Ajouter une zone
        </button>
      </div>

      {zones.length === 0 && <p className="text-xs text-muted">Aucune zone — les postes seront ajoutés manuellement.</p>}

      <div className="space-y-2">
        {zones.map((zone, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={zone.label}
              onChange={(e) => {
                const next = [...zones];
                next[i] = { ...next[i], label: e.target.value };
                setZones(next);
              }}
              placeholder={placeholder}
              className="h-9 flex-1 rounded-lg border border-border bg-bg px-2 text-xs outline-none focus:border-brand"
            />
            <input
              type="number"
              min={1}
              value={zone.postCount}
              onChange={(e) => {
                const next = [...zones];
                next[i] = { ...next[i], postCount: Math.max(1, Number(e.target.value)) };
                setZones(next);
              }}
              className="h-9 w-20 rounded-lg border border-border bg-bg px-2 text-xs outline-none focus:border-brand"
            />
            <span className="text-[11px] text-muted">postes</span>
            <button onClick={() => setZones(zones.filter((_, j) => j !== i))} className="text-muted hover:text-danger">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
