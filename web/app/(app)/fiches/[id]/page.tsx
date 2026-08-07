"use client";

import { useParams } from "next/navigation";
import Image from "next/image";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useFiche, type LigneDesinsectDto, type PosteDto, type ZoneDto } from "@/hooks/useFiches";
import { useFicheImage } from "@/hooks/useFicheImage";

/**
 * Visualiseur fiche (§10) : image scannée à gauche, données extraites à
 * droite — reproduisant les colonnes exactes de la fiche papier (§6.4)
 * plutôt qu'un dump JSON. Lecture seule côté web pour l'instant ; l'édition
 * complète (cases à cocher) vit sur mobile (Module 6).
 */
export default function FicheViewerPage() {
  const { id } = useParams<{ id: string }>();
  const fiche = useFiche(id);
  const imageUrl = useFicheImage(id, 0);

  if (fiche.isLoading || !fiche.data) {
    return <p className="text-sm text-muted">Chargement…</p>;
  }

  const f = fiche.data;

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
              Extraction IA à faible confiance ({Math.round((f.ocrConfidence ?? 0) * 100)}%) — à vérifier.
            </div>
          )}

          <ZonesSection title="Dératisation — zones externes" zones={f.deratExterne?.zones} kind="externe" />
          <ZonesSection title="Dératisation — zones internes" zones={f.deratInterne?.zones} kind="interne" />
          <DesinsectSection lignes={f.desinsectisation?.lignes} observations={f.desinsectisation?.observationsGenerales} />
        </div>
      </div>
    </div>
  );
}

// Libellés exacts de la fiche papier (§6.4) — pas de paraphrase.
const ETAT_APPAT_LABELS: Record<string, string> = {
  intact: "Intact",
  appatAltere: "Appât altéré",
  presenceCadavres: "Présence des cadavres",
  consomme: "Consommé",
  disparu: "Disparu",
};
const ETAT_PLAQUE_LABELS: Record<string, string> = {
  intact: "Intact",
  plaqueAlteree: "Plaque altérée",
  presenceCadavres: "Présence des cadavres",
  disparu: "Disparu",
};
const PORTE_APPAT_LABELS: Record<string, string> = {
  inaccessible: "Inaccessible",
  disparu: "Disparu",
  malFixe: "Mal fixé",
  casse: "Cassé",
};

function activeKeys(state: Record<string, boolean> | undefined, labels: Record<string, string>): string {
  if (!state) return "—";
  const active = Object.entries(labels)
    .filter(([key]) => state[key])
    .map(([, label]) => label);
  return active.length ? active.join(", ") : "—";
}

function ZonesSection({ title, zones, kind }: { title: string; zones?: ZoneDto[]; kind: "externe" | "interne" }) {
  if (!zones || zones.length === 0) return null;
  const etatLabels = kind === "externe" ? ETAT_APPAT_LABELS : ETAT_PLAQUE_LABELS;
  const etatKey = kind === "externe" ? "etatAppat" : "etatPlaque";

  return (
    <GlassCard>
      <h2 className="mb-3 font-heading text-base font-semibold text-ink">{title}</h2>
      <div className="space-y-4">
        {zones.map((zone, i) => (
          <div key={i} className="rounded-xl bg-bg p-3">
            <p className="mb-2 text-sm font-medium text-ink">{zone.zoneLabel}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-muted">
                  <tr>
                    <th className="py-1 pr-3 font-medium">Poste</th>
                    <th className="py-1 pr-3 font-medium">État</th>
                    <th className="py-1 pr-3 font-medium">Remplacé</th>
                    <th className="py-1 pr-3 font-medium">Produit</th>
                    <th className="py-1 pr-3 font-medium">N° Lot</th>
                    <th className="py-1 pr-3 font-medium">Porte-appât</th>
                  </tr>
                </thead>
                <tbody className="text-ink">
                  {zone.postes.map((poste: PosteDto, j) => (
                    <tr key={j} className="border-t border-border">
                      <td className="py-1.5 pr-3">{poste.posteNo}</td>
                      <td className="py-1.5 pr-3">
                        {activeKeys(poste[etatKey as "etatAppat" | "etatPlaque"], etatLabels)}
                      </td>
                      <td className="py-1.5 pr-3">{poste.action?.remplace ? "Oui" : "Non"}</td>
                      <td className="py-1.5 pr-3">{poste.produit?.name ?? poste.produit?.refCode ?? "—"}</td>
                      <td className="py-1.5 pr-3">{poste.produit?.numLot ?? "—"}</td>
                      <td className="py-1.5 pr-3">{activeKeys(poste.etatPorteAppat, PORTE_APPAT_LABELS)}</td>
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

function DesinsectSection({ lignes, observations }: { lignes?: LigneDesinsectDto[]; observations?: string }) {
  if (!lignes || lignes.length === 0) return null;

  return (
    <GlassCard>
      <h2 className="mb-3 font-heading text-base font-semibold text-ink">Désinsectisation</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-muted">
            <tr>
              <th className="py-1 pr-3 font-medium">Zone traitée</th>
              <th className="py-1 pr-3 font-medium">Désignation produit</th>
              <th className="py-1 pr-3 font-medium">Concentration</th>
              <th className="py-1 pr-3 font-medium">N° lot</th>
              <th className="py-1 pr-3 font-medium">DLC</th>
              <th className="py-1 pr-3 font-medium">Observations</th>
            </tr>
          </thead>
          <tbody className="text-ink">
            {lignes.map((ligne, i) => (
              <tr key={i} className="border-t border-border">
                <td className="py-1.5 pr-3">{ligne.zoneTraitee}</td>
                <td className="py-1.5 pr-3">{ligne.produit?.name ?? ligne.produit?.refCode ?? "—"}</td>
                <td className="py-1.5 pr-3">{ligne.produit?.concentration ?? "—"}</td>
                <td className="py-1.5 pr-3">{ligne.produit?.numLot ?? "—"}</td>
                <td className="py-1.5 pr-3">{ligne.produit?.dlc ?? "—"}</td>
                <td className="py-1.5 pr-3">{ligne.observations ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {observations && <p className="mt-3 text-xs text-muted">Observations générales : {observations}</p>}
    </GlassCard>
  );
}
