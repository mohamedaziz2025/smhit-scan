import { GlassCard } from "@/components/ui/GlassCard";

export default function AdminProductsPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-ink">Catalogue produits</h1>
      <GlassCard>
        <p className="text-sm text-muted">CRUD produits + import Excel — Module 8.</p>
      </GlassCard>
    </div>
  );
}
