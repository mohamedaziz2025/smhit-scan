"use client";

import { useParams } from "next/navigation";
import Image from "next/image";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useFiche, type ZoneDto } from "@/hooks/useFiches";
import { useFicheImage } from "@/hooks/useFicheImage";

/**
 * Visualiseur fiche (§10) : image scannée à gauche, données extraites à
 * droite. Lecture seule côté web pour l'instant — l'édition complète (cases
 * à cocher) vit sur mobile (Module 6) ; l'admin corrige via le rapport.
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

          <ZonesSection title="Dératisation — zones externes" zones={f.deratExterne?.zones} />
          <ZonesSection title="Dératisation — zones internes" zones={f.deratInterne?.zones} />
        </div>
      </div>
    </div>
  );
}

function ZonesSection({ title, zones }: { title: string; zones?: ZoneDto[] }) {
  if (!zones || zones.length === 0) return null;

  return (
    <GlassCard>
      <h2 className="mb-3 font-heading text-base font-semibold text-ink">{title}</h2>
      <div className="space-y-3">
        {zones.map((zone, i) => (
          <div key={i} className="rounded-xl bg-bg p-3">
            <p className="mb-2 text-sm font-medium text-ink">{zone.zoneLabel}</p>
            <div className="space-y-1">
              {zone.postes.map((poste, j) => (
                <p key={j} className="text-xs text-muted">
                  Poste {String(poste.posteNo)} — {JSON.stringify(poste.produit ?? {})}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
