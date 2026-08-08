"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Upload, ScanLine } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientButton } from "@/components/ui/GradientButton";
import { useClients, useSites } from "@/hooks/useClients";
import { useCreateFicheScan } from "@/hooks/useFiches";

const FICHE_TYPES = [
  { value: "DERATISATION_EXTERNE", label: "Dératisation — zones externes" },
  { value: "DERATISATION_INTERNE", label: "Dératisation — zones internes" },
  { value: "DESINSECTISATION", label: "Désinsectisation" },
];

/**
 * Scan (§11) — équivalent web de l'écran mobile "Scanner une fiche". Pas de
 * caméra temps réel ici (navigateur desktop) : l'input file avec
 * `capture="environment"` ouvre néanmoins l'appareil photo sur mobile/tablette,
 * et le clic standard ouvre le sélecteur de fichiers sur desktop — un seul
 * composant couvre les deux usages.
 */
export default function ScanPage() {
  const router = useRouter();
  const [clientId, setClientId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [ficheType, setFicheType] = useState(FICHE_TYPES[0].value);
  const [files, setFiles] = useState<File[]>([]);

  const clients = useClients();
  const sites = useSites(clientId || undefined);
  const createScan = useCreateFicheScan();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId || !siteId) return;
    try {
      const fiche = await createScan.mutateAsync({ clientId, siteId, ficheType, files });
      router.push(`/fiches/${fiche._id}`);
    } catch {
      // erreur affichée via createScan.isError ci-dessous
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-light text-brand-600">
          <ScanLine size={20} />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink">Scanner une fiche</h1>
          <p className="text-sm text-muted">Choisissez le client/site, puis la photo de la fiche papier.</p>
        </div>
      </div>

      <GlassCard>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Client">
            <select
              required
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                setSiteId("");
              }}
              className="h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm outline-none focus:border-brand"
            >
              <option value="">Sélectionner…</option>
              {clients.data?.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Site">
            <select
              required
              disabled={!clientId}
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm outline-none focus:border-brand disabled:opacity-50"
            >
              <option value="">Sélectionner…</option>
              {sites.data?.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Type de fiche">
            <select
              value={ficheType}
              onChange={(e) => setFicheType(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm outline-none focus:border-brand"
            >
              {FICHE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Photo(s) de la fiche">
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-bg px-4 py-8 text-center transition-colors hover:border-brand">
              {files.length > 0 ? (
                <>
                  <Camera size={22} className="text-brand" />
                  <span className="text-sm font-medium text-ink">{files.length} fichier(s) sélectionné(s)</span>
                </>
              ) : (
                <>
                  <Upload size={22} className="text-muted" />
                  <span className="text-sm text-muted">Prendre une photo ou choisir un fichier</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="hidden"
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              />
            </label>
          </Field>

          {createScan.isError && (
            <p className="text-sm text-danger">
              {(createScan.error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
                "Échec de la création de la fiche."}
            </p>
          )}

          <GradientButton type="submit" disabled={createScan.isPending || !clientId || !siteId} className="w-full">
            {createScan.isPending ? "Envoi…" : "Créer la fiche"}
          </GradientButton>
        </form>
      </GlassCard>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}
