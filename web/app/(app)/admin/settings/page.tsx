import { GlassCard } from "@/components/ui/GlassCard";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-ink">Paramètres système</h1>
      <GlassCard>
        <p className="text-sm text-muted">Seuils IA, matrices de risque, templates de commentaires — Module 8.</p>
      </GlassCard>
    </div>
  );
}
