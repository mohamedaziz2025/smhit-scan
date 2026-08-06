import { clsx } from "clsx";

const STYLES: Record<string, string> = {
  // Fiches
  SCANNING: "bg-slate-100 text-slate-600",
  DRAFT: "bg-amber-50 text-amber-700",
  AGENT_VALIDATED: "bg-emerald-50 text-emerald-700",
  LOCKED: "bg-slate-100 text-slate-500",
  // Rapports
  PENDING_ADMIN: "bg-amber-50 text-amber-700",
  IN_REVIEW: "bg-sky-50 text-sky-700",
  VALIDATED: "bg-emerald-50 text-emerald-700",
  RETURNED: "bg-rose-50 text-rose-700",
  // Risque
  Faible: "bg-emerald-50 text-emerald-700",
  Moyen: "bg-amber-50 text-amber-700",
  Élevé: "bg-rose-50 text-rose-700",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        STYLES[status] ?? "bg-slate-100 text-slate-600",
      )}
    >
      {status}
    </span>
  );
}
