"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientButton } from "@/components/ui/GradientButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  useFiche,
  usePatchFiche,
  useValidateFiche,
  type LigneDesinsectDto,
  type PosteDto,
  type ZoneDto,
} from "@/hooks/useFiches";
import { useFicheImage } from "@/hooks/useFicheImage";
import { useResolveProduct } from "@/hooks/useProducts";

/**
 * Fiche (§10/§11) : image scannée à gauche, données à droite. Édition
 * (cases à cocher + réf. produit) disponible tant que la fiche est en
 * DRAFT — équivalent web exact de FicheEditScreen sur mobile, pour que
 * l'agent puisse corriger/valider indifféremment depuis l'app ou le
 * navigateur.
 */
export default function FichePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const fiche = useFiche(id);
  const imageUrl = useFicheImage(id, 0);
  const patchFiche = usePatchFiche();
  const validateFiche = useValidateFiche();

  const [zonesExterne, setZonesExterne] = useState<ZoneDto[]>([]);
  const [zonesInterne, setZonesInterne] = useState<ZoneDto[]>([]);
  const [lignesDesinsect, setLignesDesinsect] = useState<LigneDesinsectDto[]>([]);

  useEffect(() => {
    if (!fiche.data) return;
    setZonesExterne(structuredClone(fiche.data.deratExterne?.zones ?? []));
    setZonesInterne(structuredClone(fiche.data.deratInterne?.zones ?? []));
    setLignesDesinsect(structuredClone(fiche.data.desinsectisation?.lignes ?? []));
  }, [fiche.data]);

  if (fiche.isLoading || !fiche.data) {
    return <p className="text-sm text-muted">Chargement…</p>;
  }

  const f = fiche.data;
  const editable = f.status === "DRAFT";

  async function handleSave() {
    await patchFiche.mutateAsync({
      id,
      deratExterne: { zones: zonesExterne },
      deratInterne: { zones: zonesInterne },
      desinsectisation: { lignes: lignesDesinsect, observationsGenerales: f.desinsectisation?.observationsGenerales },
    });
  }

  async function handleValidate() {
    await handleSave();
    await validateFiche.mutateAsync(id);
    router.push("/my-fiches");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink">
            Fiche du {new Date(f.interventionDate).toLocaleDateString("fr-FR")}
          </h1>
          <p className="mt-1 text-sm text-muted">Source : {f.source}</p>
        </div>
        <StatusBadge status={f.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard className="p-2">
          {imageUrl ? (
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-bg">
              <Image src={imageUrl} alt="Scan de la fiche" fill className="object-contain" unoptimized />
            </div>
          ) : (
            <div className="flex aspect-[3/4] items-center justify-center rounded-xl bg-bg text-sm text-muted">
              Aucun scan disponible
            </div>
          )}
        </GlassCard>

        <div className="space-y-4">
          {f.ocrConfidence !== undefined && f.ocrConfidence < 0.75 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Extraction IA à faible confiance ({Math.round((f.ocrConfidence ?? 0) * 100)}%) — vérifiez chaque case avant de valider.
            </div>
          )}

          <ZonesEditor
            title="Dératisation — zones externes"
            zones={zonesExterne}
            setZones={setZonesExterne}
            fields={ETAT_APPAT_FIELDS}
            etatKey="etatAppat"
            editable={editable}
          />
          <ZonesEditor
            title="Dératisation — zones internes"
            zones={zonesInterne}
            setZones={setZonesInterne}
            fields={ETAT_PLAQUE_FIELDS}
            etatKey="etatPlaque"
            editable={editable}
          />
          <DesinsectEditor lignes={lignesDesinsect} setLignes={setLignesDesinsect} editable={editable} />

          {editable && (
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={patchFiche.isPending}
                className="h-11 flex-1 rounded-xl border border-border bg-surface text-sm font-semibold text-ink transition-colors hover:bg-bg disabled:opacity-50"
              >
                {patchFiche.isPending ? "Enregistrement…" : "Enregistrer"}
              </button>
              <GradientButton onClick={handleValidate} disabled={validateFiche.isPending} className="flex-1">
                {validateFiche.isPending ? "Validation…" : "Valider la fiche"}
              </GradientButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Libellés exacts de la fiche papier (§6.4) — pas de paraphrase.
const ETAT_APPAT_FIELDS: Array<[string, string]> = [
  ["intact", "Intact"],
  ["appatAltere", "Appât altéré"],
  ["presenceCadavres", "Présence des cadavres"],
  ["consomme", "Consommé"],
  ["disparu", "Disparu"],
];
const ETAT_PLAQUE_FIELDS: Array<[string, string]> = [
  ["intact", "Intact"],
  ["plaqueAlteree", "Plaque altérée"],
  ["presenceCadavres", "Présence des cadavres"],
  ["disparu", "Disparu"],
];
const PORTE_APPAT_FIELDS: Array<[string, string]> = [
  ["inaccessible", "Inaccessible"],
  ["disparu", "Disparu"],
  ["malFixe", "Mal fixé"],
  ["casse", "Cassé"],
];
const PORTE_APPAT_LABELS = Object.fromEntries(PORTE_APPAT_FIELDS);
const ETAT_APPAT_LABELS = Object.fromEntries(ETAT_APPAT_FIELDS);
const ETAT_PLAQUE_LABELS = Object.fromEntries(ETAT_PLAQUE_FIELDS);

function activeKeys(state: Record<string, boolean> | undefined, labels: Record<string, string>): string {
  if (!state) return "—";
  const active = Object.entries(labels).filter(([key]) => state[key]).map(([, label]) => label);
  return active.length ? active.join(", ") : "—";
}

function ZonesEditor({
  title,
  zones,
  setZones,
  fields,
  etatKey,
  editable,
}: {
  title: string;
  zones: ZoneDto[];
  setZones: (z: ZoneDto[]) => void;
  fields: Array<[string, string]>;
  etatKey: "etatAppat" | "etatPlaque";
  editable: boolean;
}) {
  if (zones.length === 0) return null;
  const etatLabels = etatKey === "etatAppat" ? ETAT_APPAT_LABELS : ETAT_PLAQUE_LABELS;

  function togglePoste(zoneIdx: number, posteIdx: number, key: string) {
    const next = structuredClone(zones);
    const poste = next[zoneIdx].postes[posteIdx] as PosteDto;
    const etat = (poste[etatKey] ?? {}) as Record<string, boolean>;
    etat[key] = !etat[key];
    poste[etatKey] = etat;
    setZones(next);
  }

  function togglePorteAppat(zoneIdx: number, posteIdx: number, key: string) {
    const next = structuredClone(zones);
    const poste = next[zoneIdx].postes[posteIdx];
    const etat = poste.etatPorteAppat ?? {};
    (etat as Record<string, boolean>)[key] = !(etat as Record<string, boolean>)[key];
    poste.etatPorteAppat = etat;
    setZones(next);
  }

  function setRefCode(zoneIdx: number, posteIdx: number, refCode: string) {
    const next = structuredClone(zones);
    next[zoneIdx].postes[posteIdx].produit = { ...next[zoneIdx].postes[posteIdx].produit, refCode };
    setZones(next);
  }

  return (
    <GlassCard>
      <h2 className="mb-3 font-heading text-base font-semibold text-ink">{title}</h2>
      <div className="space-y-4">
        {zones.map((zone, zoneIdx) => (
          <div key={zoneIdx} className="rounded-xl bg-bg p-3">
            <p className="mb-2 text-sm font-medium text-ink">{zone.zoneLabel}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-muted">
                  <tr>
                    <th className="py-1 pr-3 font-medium">Poste</th>
                    <th className="py-1 pr-3 font-medium">État</th>
                    <th className="py-1 pr-3 font-medium">Produit (réf.)</th>
                    <th className="py-1 pr-3 font-medium">Porte-appât</th>
                  </tr>
                </thead>
                <tbody className="text-ink">
                  {zone.postes.map((poste, posteIdx) => (
                    <tr key={posteIdx} className="border-t border-border align-top">
                      <td className="py-1.5 pr-3">{poste.posteNo}</td>
                      <td className="py-1.5 pr-3">
                        {editable ? (
                          <div className="flex flex-wrap gap-2">
                            {fields.map(([key, label]) => (
                              <label key={key} className="flex items-center gap-1 whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  checked={Boolean((poste[etatKey] as Record<string, boolean> | undefined)?.[key])}
                                  onChange={() => togglePoste(zoneIdx, posteIdx, key)}
                                  className="accent-[#F26A21]"
                                />
                                {label}
                              </label>
                            ))}
                          </div>
                        ) : (
                          activeKeys(poste[etatKey] as Record<string, boolean> | undefined, etatLabels)
                        )}
                      </td>
                      <td className="py-1.5 pr-3">
                        {editable ? (
                          <input
                            value={poste.produit?.refCode ?? ""}
                            onChange={(e) => setRefCode(zoneIdx, posteIdx, e.target.value.toUpperCase())}
                            placeholder="Réf. code"
                            className="h-8 w-28 rounded-lg border border-border bg-surface px-2 text-xs outline-none focus:border-brand"
                          />
                        ) : (
                          poste.produit?.name ?? poste.produit?.refCode ?? "—"
                        )}
                      </td>
                      <td className="py-1.5 pr-3">
                        {editable ? (
                          <div className="flex flex-wrap gap-2">
                            {PORTE_APPAT_FIELDS.map(([key, label]) => (
                              <label key={key} className="flex items-center gap-1 whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  checked={Boolean(poste.etatPorteAppat?.[key as keyof typeof poste.etatPorteAppat])}
                                  onChange={() => togglePorteAppat(zoneIdx, posteIdx, key)}
                                  className="accent-[#F26A21]"
                                />
                                {label}
                              </label>
                            ))}
                          </div>
                        ) : (
                          activeKeys(poste.etatPorteAppat, PORTE_APPAT_LABELS)
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

function DesinsectEditor({
  lignes,
  setLignes,
  editable,
}: {
  lignes: LigneDesinsectDto[];
  setLignes: (l: LigneDesinsectDto[]) => void;
  editable: boolean;
}) {
  const resolveProduct = useResolveProduct();
  if (lignes.length === 0 && !editable) return null;

  function updateLigne(idx: number, patch: Partial<LigneDesinsectDto>) {
    const next = structuredClone(lignes);
    next[idx] = { ...next[idx], ...patch };
    setLignes(next);
  }

  async function resolveRef(idx: number, ref: string) {
    updateLigne(idx, { produit: { ...lignes[idx]?.produit, refCode: ref } });
    if (!ref) return;
    try {
      const product = await resolveProduct.mutateAsync(ref);
      updateLigne(idx, { produit: { ...lignes[idx]?.produit, refCode: ref, name: product.name } });
    } catch {
      // référence inconnue — laissé tel quel, l'agent corrige manuellement
    }
  }

  return (
    <GlassCard>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-heading text-base font-semibold text-ink">Désinsectisation</h2>
        {editable && (
          <button
            onClick={() => setLignes([...lignes, { zoneTraitee: "", produit: {} }])}
            className="text-xs font-medium text-brand-600 hover:underline"
          >
            + Ajouter une ligne
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-muted">
            <tr>
              <th className="py-1 pr-3 font-medium">Zone traitée</th>
              <th className="py-1 pr-3 font-medium">Réf. produit</th>
              <th className="py-1 pr-3 font-medium">Désignation</th>
              <th className="py-1 pr-3 font-medium">Observations</th>
            </tr>
          </thead>
          <tbody className="text-ink">
            {lignes.map((ligne, i) => (
              <tr key={i} className="border-t border-border">
                <td className="py-1.5 pr-3">
                  {editable ? (
                    <input
                      value={ligne.zoneTraitee ?? ""}
                      onChange={(e) => updateLigne(i, { zoneTraitee: e.target.value })}
                      className="h-8 w-32 rounded-lg border border-border bg-surface px-2 text-xs outline-none focus:border-brand"
                    />
                  ) : (
                    ligne.zoneTraitee
                  )}
                </td>
                <td className="py-1.5 pr-3">
                  {editable ? (
                    <input
                      value={ligne.produit?.refCode ?? ""}
                      onChange={(e) => resolveRef(i, e.target.value.toUpperCase())}
                      className="h-8 w-24 rounded-lg border border-border bg-surface px-2 text-xs outline-none focus:border-brand"
                    />
                  ) : (
                    ligne.produit?.refCode ?? "—"
                  )}
                </td>
                <td className="py-1.5 pr-3">{ligne.produit?.name ?? "—"}</td>
                <td className="py-1.5 pr-3">
                  {editable ? (
                    <input
                      value={ligne.observations ?? ""}
                      onChange={(e) => updateLigne(i, { observations: e.target.value })}
                      className="h-8 w-full rounded-lg border border-border bg-surface px-2 text-xs outline-none focus:border-brand"
                    />
                  ) : (
                    ligne.observations ?? "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
