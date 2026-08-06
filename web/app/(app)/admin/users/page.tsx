import { GlassCard } from "@/components/ui/GlassCard";

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-ink">Utilisateurs</h1>
      <GlassCard>
        <p className="text-sm text-muted">Gestion des utilisateurs &amp; rôles — Module 8.</p>
      </GlassCard>
    </div>
  );
}
