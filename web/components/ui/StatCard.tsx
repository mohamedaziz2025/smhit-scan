import type { LucideIcon } from "lucide-react";
import { GlassCard } from "./GlassCard";

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "brand",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: "brand" | "success" | "warning" | "danger";
}) {
  const accentBg = {
    brand: "bg-brand-light text-brand-600",
    success: "bg-emerald-50 text-emerald-600",
    warning: "bg-amber-50 text-amber-600",
    danger: "bg-rose-50 text-rose-600",
  }[accent];

  return (
    <GlassCard className="flex items-center gap-4">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${accentBg}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="font-heading text-2xl font-bold leading-none text-ink">{value}</p>
        <p className="mt-1 text-sm text-muted">{label}</p>
      </div>
    </GlassCard>
  );
}
