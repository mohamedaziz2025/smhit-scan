"use client";

import { useState } from "react";
import { PackagePlus, Trash2, Pencil } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientButton } from "@/components/ui/GradientButton";
import { Modal } from "@/components/ui/Modal";
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeactivateProduct,
  type ProductDto,
} from "@/hooks/useProducts";

const CATEGORIES = ["rodenticide", "glue_board", "insecticide", "disinfectant", "fumigant", "herbicide", "other"];

const emptyForm = { code: "", name: "", category: "rodenticide", activeSubstance: "", concentration: "", isToxic: true };

export default function AdminProductsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const products = useProducts({ search: search || undefined, category: category || undefined });
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deactivate = useDeactivateProduct();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProductDto | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(p: ProductDto) {
    setEditing(p);
    setForm({
      code: p.code,
      name: p.name,
      category: p.category,
      activeSubstance: p.activeSubstance ?? "",
      concentration: p.concentration ?? "",
      isToxic: p.isToxic,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (editing) await updateProduct.mutateAsync({ id: editing._id, ...form });
      else await createProduct.mutateAsync(form);
      setModalOpen(false);
    } catch (err) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(message ?? "Échec de l'enregistrement.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink">Catalogue produits</h1>
          <p className="mt-1 text-sm text-muted">{products.data?.length ?? 0} références actives.</p>
        </div>
        <GradientButton onClick={openCreate}>
          <PackagePlus size={16} /> Nouveau produit
        </GradientButton>
      </div>

      <div className="flex gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher (nom, alias)…"
          className="h-11 max-w-xs flex-1 rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-brand"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-brand"
        >
          <option value="">Toutes catégories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <GlassCard className="p-0">
        {products.isLoading ? (
          <p className="p-6 text-sm text-muted">Chargement…</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted">
                <th className="px-6 py-3">Code</th>
                <th className="px-6 py-3">Nom</th>
                <th className="px-6 py-3">Catégorie</th>
                <th className="px-6 py-3">Matière active</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.data?.map((p) => (
                <tr key={p._id} className="border-b border-border last:border-0">
                  <td className="px-6 py-2.5 font-mono text-xs text-ink">{p.code}</td>
                  <td className="px-6 py-2.5 text-ink">{p.name}</td>
                  <td className="px-6 py-2.5 text-muted">{p.category}</td>
                  <td className="px-6 py-2.5 text-muted">{p.activeSubstance ?? "—"}</td>
                  <td className="px-6 py-2.5">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(p)} className="rounded-lg p-2 text-muted hover:bg-bg hover:text-ink">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => deactivate.mutate(p._id)} className="rounded-lg p-2 text-muted hover:bg-bg hover:text-danger">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </GlassCard>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Modifier le produit" : "Nouveau produit"}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            required
            disabled={!!editing}
            placeholder="Code (ex PLDRT021)"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            className="h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm outline-none focus:border-brand disabled:opacity-60"
          />
          <input
            required
            placeholder="Nom commercial"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm outline-none focus:border-brand"
          />
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm outline-none focus:border-brand"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            placeholder="Matière active (ex Chlorophacinone)"
            value={form.activeSubstance}
            onChange={(e) => setForm({ ...form, activeSubstance: e.target.value })}
            className="h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm outline-none focus:border-brand"
          />
          <input
            placeholder="Concentration (ex 5%)"
            value={form.concentration}
            onChange={(e) => setForm({ ...form, concentration: e.target.value })}
            className="h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm outline-none focus:border-brand"
          />
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={form.isToxic}
              onChange={(e) => setForm({ ...form, isToxic: e.target.checked })}
              className="h-4 w-4 rounded border-border accent-brand"
            />
            Produit toxique
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <GradientButton type="submit" disabled={createProduct.isPending || updateProduct.isPending} className="w-full">
            {editing ? "Enregistrer" : "Créer"}
          </GradientButton>
        </form>
      </Modal>
    </div>
  );
}
