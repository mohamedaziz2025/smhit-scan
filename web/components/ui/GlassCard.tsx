import { clsx } from "clsx";
import type { HTMLAttributes } from "react";

/** Carte premium — fond blanc, coins généreux, ombre douce (§12). */
export function GlassCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx("rounded-card border border-border bg-surface p-6 shadow-soft", className)}
      {...props}
    />
  );
}
